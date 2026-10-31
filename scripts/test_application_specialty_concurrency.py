import io
import os
import unittest
from contextlib import redirect_stderr
from unittest.mock import Mock, patch
from application_specialty_concurrency import main, permitted, SpecialtyProbe


class SpecialtyConcurrencyGuardTests(unittest.TestCase):
    def test_requires_exact_enabled_disposable_target_without_connection_overrides(self):
        environment = {'JOBMATCH_LOCAL_SPECIALTY_TEST': '1', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'structured_upgrade'}
        self.assertTrue(permitted(environment))
        self.assertTrue(permitted({**environment, 'PGHOST': 'postgres', 'GITHUB_ACTIONS': 'true'}))
        for change in ({'JOBMATCH_LOCAL_SPECIALTY_TEST': '0'}, {'PGHOST': 'remote.example'},
                       {'PGHOST': 'postgres'}, {'PGDATABASE': 'postgres'},
                       {'PGDATABASE': 'structured_upgrade\n'}, {'PGHOSTADDR': '203.0.113.1'},
                       {'PGSERVICE': 'production'}, {'PGSERVICEFILE': '/tmp/remote'}):
            self.assertFalse(permitted({**environment, **change}), change)

    @patch('application_specialty_concurrency.SpecialtyProbe')
    def test_refusal_makes_no_connection(self, constructor):
        with patch.dict(os.environ, {}, clear=True), redirect_stderr(io.StringIO()):
            self.assertEqual(main(), 2)
        constructor.assert_not_called()

    @patch('application_specialty_concurrency.SpecialtyProbe')
    def test_failure_and_cleanup_failure_are_not_success_and_do_not_leak_diagnostics(self, constructor):
        for fail_during in ('run', 'cleanup'):
            constructor.reset_mock()
            probe = constructor.return_value
            probe.run.side_effect = None
            probe.cleanup.side_effect = None
            getattr(probe, fail_during).side_effect = RuntimeError('PRIVATE synthetic connection details')
            output = io.StringIO()
            with patch.dict(os.environ, {'JOBMATCH_LOCAL_SPECIALTY_TEST': '1', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'structured_upgrade'}, clear=True), redirect_stderr(output):
                self.assertEqual(main(), 1)
            probe.cleanup.assert_called_once_with()
            self.assertNotIn('PRIVATE', output.getvalue())

    def test_unconfirmed_setup_cannot_delete_preexisting_identifiers(self):
        probe = SpecialtyProbe({})
        probe.query = Mock(side_effect=RuntimeError('setup failed before ownership confirmation'))
        with self.assertRaises(RuntimeError):
            probe.run()
        probe.query.reset_mock()
        probe.cleanup()
        probe.query.assert_not_called()


if __name__ == '__main__':
    unittest.main()
