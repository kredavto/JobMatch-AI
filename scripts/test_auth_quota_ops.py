import copy
import json
import os
import subprocess
import unittest
from unittest.mock import patch
from auth_quota_ops import execute, validate, SCOPES


def status():
    return {'version': 1, 'bucket': 30000000, 'config_present': True,
            'expired_counters': 0, 'expired_outcomes': 0,
            'scopes': [{'scope': scope, 'allowed': 10, 'denied_global': 1, 'denied_subject': 2}
                       for scope in sorted(SCOPES)]}


class QuotaOpsTests(unittest.TestCase):
    def test_valid_status_and_purge(self):
        self.assertEqual(validate(status(), 'status'), status())
        self.assertEqual(validate({'version': 1, 'deleted_counters': 1, 'deleted_outcomes': 2}, 'purge'),
                         {'version': 1, 'deleted_counters': 1, 'deleted_outcomes': 2})

    def test_unknown_private_data_and_invalid_numbers_never_pass(self):
        for key, val in [('signing_key', 'secret'), ('bucket', True), ('expired_counters', -1),
                         ('config_present', 1), ('version', True), ('expired_outcomes', 2**53)]:
            data = status()
            data[key] = val
            with self.assertRaises(ValueError):
                validate(data, 'status')

    def test_scopes_must_be_complete_unique_and_counts_only(self):
        variants = []
        value = status()
        value['scopes'].pop()
        variants.append(value)
        value = status()
        value['scopes'][1] = copy.deepcopy(value['scopes'][0])
        variants.append(value)
        value = status()
        value['scopes'][0]['subject'] = 'private'
        variants.append(value)
        value = status()
        value['scopes'][0]['allowed'] = False
        variants.append(value)
        for value in variants:
            with self.assertRaises(ValueError):
                validate(value, 'status')

    def test_purge_cannot_claim_more_than_limit(self):
        for value in [501, -1, True]:
            with self.assertRaises(ValueError):
                validate({'version': 1, 'deleted_counters': value, 'deleted_outcomes': 0}, 'purge', 500)

    @patch('auth_quota_ops.subprocess.run')
    def test_approval_and_limit_gates_precede_process(self, run):
        with patch.dict(os.environ, {}, clear=True):
            for action in ['status', 'purge', 'typo']:
                with self.assertRaises(ValueError):
                    execute(action)
        with patch.dict(os.environ, {'JOBMATCH_AUTH_QUOTA_OPS_APPROVED': '1'}, clear=True):
            with self.assertRaises(ValueError):
                execute('purge')
            with self.assertRaises(ValueError):
                execute('status', 0)
        run.assert_not_called()

    @patch('auth_quota_ops.subprocess.run')
    def test_fixed_read_only_sql_and_complete_ack(self, run):
        run.return_value.stdout = json.dumps(status()) + '\nJOBMATCH_OPS_COMPLETE\n'
        with patch.dict(os.environ, {'JOBMATCH_AUTH_QUOTA_OPS_APPROVED': '1'}):
            self.assertEqual(execute('status'), status())
        self.assertIn('read only;', run.call_args.kwargs['input'])
        self.assertIn('row_security=off;', run.call_args.kwargs['input'])
        self.assertEqual(run.call_args.kwargs['stderr'], subprocess.DEVNULL)
        self.assertEqual(run.call_args.kwargs['timeout'], 10)

    @patch('auth_quota_ops.subprocess.run')
    def test_incomplete_or_extra_output_not_reported_as_success(self, run):
        for output in [json.dumps(status()), json.dumps(status())+'\nJOBMATCH_OPS_COMPLETE\nextra',
                       'diagnostic\nJOBMATCH_OPS_COMPLETE', 'x'*65537]:
            run.return_value.stdout = output
            with patch.dict(os.environ, {'JOBMATCH_AUTH_QUOTA_OPS_APPROVED': '1'}):
                with self.assertRaises(ValueError):
                    execute('status')

    @patch('auth_quota_ops.subprocess.run')
    def test_explicit_bounded_purge_sql(self, run):
        expected = {'version': 1, 'deleted_counters': 2, 'deleted_outcomes': 0}
        run.return_value.stdout = json.dumps(expected)+'\nJOBMATCH_OPS_COMPLETE\n'
        with patch.dict(os.environ, {'JOBMATCH_AUTH_QUOTA_OPS_APPROVED': '1',
                                    'JOBMATCH_AUTH_QUOTA_PURGE_APPROVED': '1'}):
            self.assertEqual(execute('purge', 10), expected)
        self.assertIn('private.purge_auth_quotas(10)', run.call_args.kwargs['input'])
        self.assertNotIn('read only;', run.call_args.kwargs['input'])


if __name__ == '__main__':
    unittest.main()
