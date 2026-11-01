import unittest
from application_command_drill import allowed


class ApplicationDrillGuardTests(unittest.TestCase):
    def test_explicit_owned_loopback_without_libpq_overrides(self):
        base = {'JOBMATCH_LOCAL_APPLICATIONS': '1', 'PGHOST': '127.0.0.1'}
        self.assertTrue(allowed(base))
        self.assertTrue(allowed({**base, 'PGHOST': '::1'}))
        for change in ({'JOBMATCH_LOCAL_APPLICATIONS': ''}, {'PGHOST': 'production'}, {'PGHOST': '/tmp'},
                       {'PGSERVICE': 'prod'}, {'PGHOSTADDR': '1.2.3.4'}, {'PGSERVICEFILE': '/file'},
                       {'PGOPTIONS': '-c role=other'}):
            self.assertFalse(allowed({**base, **change}))
