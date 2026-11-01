import unittest
from projection_parity_drill import allowed


class ProjectionParityGuardTests(unittest.TestCase):
    def test_owned_loopback_opt_in_required_and_overrides_refused(self):
        base = {'JOBMATCH_LOCAL_PARITY': '1', 'PGHOST': '127.0.0.1'}
        self.assertTrue(allowed(base))
        self.assertTrue(allowed({**base, 'PGHOST': '::1'}))
        for change in ({'JOBMATCH_LOCAL_PARITY': ''}, {'PGHOST': 'production'}, {'PGHOST': '/tmp'},
                       {'PGSERVICE': 'prod'}, {'PGHOSTADDR': '1.2.3.4'}, {'PGSERVICEFILE': '/file'},
                       {'PGOPTIONS': '-c role=other'}):
            self.assertFalse(allowed({**base, **change}))
