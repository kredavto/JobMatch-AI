import unittest
from storage_fixture import mirror_permitted


class StorageFixtureGuards(unittest.TestCase):
    def test_only_exact_generated_opted_in_local_targets_can_rollback(self):
        base = {'JOBMATCH_LOCAL_PARITY': '1', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'jobmatch_parity_' + 'a' * 32}
        self.assertTrue(mirror_permitted(base))
        for changes in ({'JOBMATCH_LOCAL_PARITY': ''}, {'PGHOST': 'production'}, {'PGHOST': 'postgres'},
                        {'PGDATABASE': 'postgres'}, {'PGDATABASE': 'jobmatch_canonical_' + 'a' * 32},
                        {'PGSERVICE': 'prod'}, {'PGSERVICEFILE': '/file'}, {'PGHOSTADDR': '1.2.3.4'},
                        {'PGOPTIONS': '-c role=other'}):
            self.assertFalse(mirror_permitted({**base, **changes}))

    def test_ci_service_host_is_only_for_existing_restore_fixture(self):
        base = {'JOBMATCH_LOCAL_RESTORE': '1', 'PGHOST': 'postgres', 'GITHUB_ACTIONS': 'true', 'PGDATABASE': 'jobmatch_drill_' + 'a' * 32}
        self.assertTrue(mirror_permitted(base))
        self.assertFalse(mirror_permitted({**base, 'GITHUB_ACTIONS': ''}))
