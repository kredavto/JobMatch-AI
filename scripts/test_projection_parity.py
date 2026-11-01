import copy
import io
import json
import subprocess
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch
from check_projection_parity import CHECKED, MISMATCHES, COMPLETE, check, main, validate


def report():
    return {'format': 'jobmatch-projection-parity-v1', 'ok': True,
            'checked': {key: 3 for key in CHECKED}, 'mismatches': {key: 0 for key in MISMATCHES}}


class ParityTests(unittest.TestCase):
    def process(self, data=None, returncode=0, suffix=None):
        return subprocess.CompletedProcess([], returncode,
            json.dumps(report() if data is None else data) + '\n' + (COMPLETE if suffix is None else suffix) + '\n')

    def test_real_counts_and_zero_workspace_are_distinguishable(self):
        self.assertEqual(validate(report())['checked']['workspaces'], 3)
        empty = report()
        empty['checked'] = {key: 0 for key in CHECKED}
        self.assertEqual(validate(empty)['checked']['workspaces'], 0)

    def test_any_mismatch_rejects_an_ok_claim(self):
        for key in MISMATCHES:
            changed = report()
            changed['mismatches'][key] = 1
            with self.assertRaises(ValueError):
                validate(changed)
            changed['ok'] = False
            self.assertFalse(validate(changed)['ok'])

    def test_missing_unknown_and_invalid_fields_fail_closed(self):
        mutations = []
        for key in CHECKED:
            bad = report()
            del bad['checked'][key]
            mutations.append(bad)
        for key in MISMATCHES:
            bad = report()
            del bad['mismatches'][key]
            mutations.append(bad)
        for value in (True, -1, 1.5, '3', None, 9223372036854775808):
            bad = report()
            bad['checked']['workspaces'] = value
            mutations.append(bad)
        bad = report()
        bad['personal_data'] = 'must not be emitted'
        mutations.append(bad)
        bad = report()
        bad['mismatches']['unknown'] = 0
        mutations.append(bad)
        mutations.extend([None, [], {'format': 'unknown'}, {**report(), 'ok': 1}])
        for bad in mutations:
            with self.assertRaises(ValueError):
                validate(bad)

    @patch('check_projection_parity.subprocess.run')
    def test_query_is_read_only_repeatable_and_noninteractive(self, run):
        run.return_value = self.process()
        self.assertTrue(check()['ok'])
        args, kwargs = run.call_args
        self.assertEqual(args[0], ['psql', '-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1'])
        self.assertIn('REPEATABLE READ READ ONLY', kwargs['input'])
        self.assertIn('row_security = off', kwargs['input'])
        self.assertLess(kwargs['input'].index('COMMIT;'), kwargs['input'].index(COMPLETE))
        self.assertEqual(kwargs['stderr'], subprocess.DEVNULL)
        self.assertEqual(kwargs['timeout'], 140)

    @patch('check_projection_parity.subprocess.run')
    def test_incomplete_duplicate_extra_and_malformed_output_fail(self, run):
        for output in ('', json.dumps(report()) + '\n', '{}\n' + COMPLETE + '\n',
                       json.dumps(report()) + '\n' + COMPLETE + '\nextra\n',
                       json.dumps(report()) + '\n' + json.dumps(report()) + '\n' + COMPLETE + '\n',
                       'unexpected personal data\n' + COMPLETE + '\n'):
            run.return_value = subprocess.CompletedProcess([], 0, output)
            with self.assertRaises(ValueError):
                check()

    @patch('check_projection_parity.subprocess.run')
    def test_successful_looking_output_cannot_hide_failed_process(self, run):
        run.return_value = self.process(returncode=1)
        with self.assertRaises(ValueError):
            check()

    @patch('check_projection_parity.subprocess.run')
    def test_excessive_output_is_not_parsed_or_printed(self, run):
        run.return_value = subprocess.CompletedProcess([], 0, 'sensitive' * 3000)
        with self.assertRaises(ValueError):
            check()

    @patch('check_projection_parity.check')
    def test_cli_exit_codes_and_counts_only(self, query):
        clean = report()
        dirty = copy.deepcopy(clean)
        dirty['mismatches']['facts'] = 1
        dirty['ok'] = False
        for data, code in ((clean, 0), (dirty, 1)):
            query.return_value = data
            output = io.StringIO()
            with redirect_stdout(output):
                self.assertEqual(main(), code)
            self.assertEqual(json.loads(output.getvalue()), data)

    @patch('check_projection_parity.check')
    def test_cli_never_prints_error_or_database_payload(self, query):
        for error in (OSError('password=secret'), ValueError('private resume'),
                      subprocess.TimeoutExpired('sensitive command', 140)):
            query.side_effect = error
            output, errors = io.StringIO(), io.StringIO()
            with redirect_stdout(output), redirect_stderr(errors):
                self.assertEqual(main(), 2)
            self.assertEqual(output.getvalue(), '')
            self.assertNotIn('secret', errors.getvalue())
            self.assertNotIn('resume', errors.getvalue())


if __name__ == '__main__':
    unittest.main()
