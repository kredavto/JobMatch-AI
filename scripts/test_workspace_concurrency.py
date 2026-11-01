import io
import os
import subprocess
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import Mock, patch

from check_workspace_concurrency import CheckFailure, Probe, main, outcome, permitted


def environment():
    return {'JOBMATCH_LOCAL_RESTORE': '1', 'PGHOST': '127.0.0.1',
            'PGDATABASE': 'jobmatch_drill_' + 'a' * 32}


class ConcurrencyTests(unittest.TestCase):
    def test_only_enabled_generated_disposable_targets_are_permitted(self):
        self.assertTrue(permitted(environment()))
        self.assertTrue(permitted({**environment(), 'PGHOST': '::1'}))
        self.assertTrue(permitted({**environment(), 'PGHOST': 'postgres', 'GITHUB_ACTIONS': 'true'}))
        for changes in ({'JOBMATCH_LOCAL_RESTORE': '0'}, {'PGHOST': 'hosted.example'},
                        {'PGHOST': 'postgres'}, {'PGDATABASE': 'postgres'},
                        {'PGDATABASE': 'postgresql://host/jobmatch_drill_' + 'a' * 32},
                        {'PGDATABASE': 'jobmatch_drill_' + 'a' * 32 + '\n'},
                        {'PGSERVICE': 'remote'}, {'PGHOSTADDR': '1.2.3.4'},
                        {'PGSERVICEFILE': '/tmp/remote.conf'}):
            self.assertFalse(permitted({**environment(), **changes}), changes)

    def test_explicit_fixture_prefix_requires_its_own_flag_and_loopback(self):
        base = {'JOBMATCH_LOCAL_EXPLICIT': '1', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'jobmatch_explicit_' + 'a' * 32}
        self.assertTrue(permitted(base))
        for changes in ({'JOBMATCH_LOCAL_EXPLICIT': ''}, {'PGDATABASE': 'postgres'}, {'PGOPTIONS': '-c role=other'},
                        {'PGHOST': 'postgres', 'GITHUB_ACTIONS': 'true'}, {'PGHOST': 'production'}):
            self.assertFalse(permitted({**base, **changes}))

    @patch('check_workspace_concurrency.Probe')
    def test_refused_target_cannot_start_a_connection(self, probe):
        with patch.dict(os.environ, {'PGHOST': 'hosted.example'}, clear=True), redirect_stderr(io.StringIO()):
            self.assertEqual(main(), 2)
        probe.assert_not_called()

    def test_worker_protocol_rejects_extra_output(self):
        for allowed in ('OK', 'CONFLICT', 'AUTH'):
            self.assertEqual(outcome(allowed + '\n'), allowed)
        for bad in ('', 'OK', 'OK\nextra\n', 'ERROR: private data\n', 'OK\nOK\n'):
            with self.assertRaises(CheckFailure):
                outcome(bad)

    @patch('check_workspace_concurrency.Probe')
    def test_timeout_still_cleans_up_without_printing_parameters(self, constructor):
        probe = constructor.return_value
        probe.stage = 'session revoked while waiting'
        probe.run.side_effect = subprocess.TimeoutExpired('password=secret', 12)
        output, errors = io.StringIO(), io.StringIO()
        with patch.dict(os.environ, environment(), clear=True), redirect_stdout(output), redirect_stderr(errors):
            self.assertEqual(main(), 1)
        probe.cleanup.assert_called_once_with()
        self.assertEqual(output.getvalue(), '')
        self.assertIn('session revoked while waiting', errors.getvalue())
        self.assertNotIn('password', errors.getvalue())
        self.assertNotIn('secret', errors.getvalue())

    @patch('check_workspace_concurrency.Probe')
    def test_cleanup_failure_cannot_report_success(self, constructor):
        constructor.return_value.cleanup.side_effect = OSError('sensitive connection string')
        output, errors = io.StringIO(), io.StringIO()
        with patch.dict(os.environ, environment(), clear=True), redirect_stdout(output), redirect_stderr(errors):
            self.assertEqual(main(), 1)
        self.assertEqual(output.getvalue(), '')
        self.assertNotIn('sensitive', errors.getvalue())

    def test_clients_are_stopped_before_auth_cascade_cleanup(self):
        probe = Probe(environment())
        actions = []
        child = Mock()
        child.poll.return_value = None
        child.kill.side_effect = lambda: actions.append('kill')
        child.communicate.side_effect = lambda **kwargs: actions.append('wait')
        probe.children = [child]
        probe.query = lambda sql: actions.append('delete')
        probe.cleanup()
        self.assertEqual(actions, ['kill', 'wait', 'delete'])
        child.communicate.assert_called_once_with(timeout=5)

    @patch('check_workspace_concurrency.Probe')
    def test_success_is_emitted_only_after_cleanup(self, constructor):
        actions = []
        probe = constructor.return_value
        probe.run.side_effect = lambda: actions.append('run')
        probe.cleanup.side_effect = lambda: actions.append('cleanup')
        output = io.StringIO()
        with patch.dict(os.environ, environment(), clear=True), redirect_stdout(output):
            self.assertEqual(main(), 0)
        self.assertEqual(actions, ['run', 'cleanup'])
        self.assertTrue(output.getvalue().startswith('PASS:'))


if __name__ == '__main__':
    unittest.main()
