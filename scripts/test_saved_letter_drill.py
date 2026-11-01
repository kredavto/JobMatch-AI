import unittest
from saved_letter_drill import allowed


class LetterDrillGuardTests(unittest.TestCase):
    def test_only_explicit_loopback_allowed(self):
        base = {'JOBMATCH_LOCAL_LETTERS': '1', 'PGHOST': '127.0.0.1'}
        self.assertTrue(allowed(base))
        for change in ({'PGHOST': 'db.example.com'}, {'PGHOST': '/tmp'}, {'PGHOST': 'postgres'},
                       {'JOBMATCH_LOCAL_LETTERS': ''}, {'PGSERVICE': 'production'},
                       {'PGHOSTADDR': '1.2.3.4'}, {'PGSERVICEFILE': '/file'}, {'PGOPTIONS': '-c role=other'}):
            self.assertFalse(allowed({**base, **change}))
