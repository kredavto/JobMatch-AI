import unittest
from source_version_drill import allowed,database_allowed


class SourceVersionGuard(unittest.TestCase):
    def test_only_opted_in_loopback_generated_targets_are_usable(self):
        env={'JOBMATCH_LOCAL_SOURCE_VERSIONS':'1','PGHOST':'127.0.0.1','PGDATABASE':'jobmatch_source_versions_'+'a'*32}
        self.assertTrue(allowed(env));self.assertTrue(database_allowed(env))
        for changed in ({'JOBMATCH_LOCAL_SOURCE_VERSIONS':''},{'PGHOST':'production'},{'PGHOST':'postgres'},{'PGSERVICE':'prod'},{'PGSERVICEFILE':'file'},{'PGHOSTADDR':'1.2.3.4'},{'PGOPTIONS':'-c role=postgres'}):
            self.assertFalse(database_allowed({**env,**changed}))
        for name in ('postgres','jobmatch_source_versions_a','jobmatch_compact_'+'a'*32):
            self.assertFalse(database_allowed({**env,'PGDATABASE':name}))
