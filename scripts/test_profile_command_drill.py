import unittest
from profile_command_drill import allowed, unicode_cases


class ProfileCommandDrillGuardTests(unittest.TestCase):
    def test_only_owned_loopback_with_explicit_opt_in(self):
        base = {'JOBMATCH_LOCAL_PROFILE_COMMANDS': '1', 'PGHOST': '127.0.0.1'}
        self.assertTrue(allowed(base))
        for change in ({'JOBMATCH_LOCAL_PROFILE_COMMANDS': ''}, {'PGHOST': 'production'}, {'PGHOST': '/tmp'},
                       {'PGSERVICE': 'prod'}, {'PGHOSTADDR': '1.2.3.4'}, {'PGSERVICEFILE': '/file'},
                       {'PGOPTIONS': '-c role=other'}):
            self.assertFalse(allowed({**base, **change}))

    def test_corpus_contains_real_whitespace_and_preserved_nontrim_controls(self):
        cases = unicode_cases()
        self.assertEqual(len(cases), 264)
        for marker in ('\ufeff', '\u0085', '\u200b', '\u180e', '\r\n', '😀'):
            self.assertTrue(any(marker in s for s in cases))
