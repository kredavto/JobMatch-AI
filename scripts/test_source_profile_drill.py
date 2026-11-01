import unittest
from source_profile_drill import allowed


class SourceDrillGuardTests(unittest.TestCase):
    def test_owned_loopback_and_explicit_switch_only(self):
        base = {'JOBMATCH_LOCAL_SOURCE_PROFILE': '1', 'PGHOST': '127.0.0.1'}
        self.assertTrue(allowed(base))
        for change in ({'JOBMATCH_LOCAL_SOURCE_PROFILE': ''}, {'PGHOST': 'production'}, {'PGHOST': '/tmp'},
                       {'PGSERVICE': 'prod'}, {'PGHOSTADDR': '1.2.3.4'}, {'PGSERVICEFILE': '/file'}, {'PGOPTIONS': '-c role=other'}):
            self.assertFalse(allowed({**base, **change}))
