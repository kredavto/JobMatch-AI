import unittest
from version_command_drill import allowed, parity_cases


class VersionCommandDrillGuardTests(unittest.TestCase):
    def test_only_owned_loopback_with_explicit_opt_in(self):
        base = {'JOBMATCH_LOCAL_VERSION_COMMANDS': '1', 'PGHOST': '127.0.0.1'}
        self.assertTrue(allowed(base))
        for change in ({'JOBMATCH_LOCAL_VERSION_COMMANDS': ''}, {'PGHOST': 'production'}, {'PGHOST': '/tmp'},
                       {'PGSERVICE': 'prod'}, {'PGHOSTADDR': '1.2.3.4'}, {'PGSERVICEFILE': '/file'},
                       {'PGOPTIONS': '-c role=other'}):
            self.assertFalse(allowed({**base, **change}))

    def test_all_renderer_modes_and_unicode_inputs_are_present(self):
        cases = parity_cases()
        self.assertEqual(len(cases), 32)
        self.assertEqual({c['mode'] for c in cases}, {0, 1, 2, 3})
        self.assertTrue(any('\r\n' in c['state']['original'] for c in cases))
        self.assertTrue(any('😀' in c['state']['original'] for c in cases))
