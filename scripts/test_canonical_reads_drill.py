import unittest
from canonical_reads_drill import allowed


class CanonicalReadsGuardTests(unittest.TestCase):
    def test_owned_loopback_opt_in_and_no_overrides(self):
        base = {'JOBMATCH_LOCAL_CANONICAL': '1', 'PGHOST': '127.0.0.1'}
        self.assertTrue(allowed(base))
        self.assertTrue(allowed({**base, 'PGHOST': '::1'}))
        for change in ({'JOBMATCH_LOCAL_CANONICAL': ''}, {'PGHOST': 'production'}, {'PGHOST': '/tmp'},
                       {'PGSERVICE': 'prod'}, {'PGHOSTADDR': '1.2.3.4'}, {'PGSERVICEFILE': '/file'},
                       {'PGOPTIONS': '-c role=other'}):
            self.assertFalse(allowed({**base, **change}))
