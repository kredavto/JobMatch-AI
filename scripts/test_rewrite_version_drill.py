import hashlib
import re
import unittest
from pathlib import Path
from rewrite_version_drill import allowed,database_allowed


class RewriteProtocolGuard(unittest.TestCase):
    def test_requires_both_explicit_optins_loopback_and_generated_database(self):
        env=dict(JOBMATCH_LOCAL_REWRITE_VERSIONS='1',JOBMATCH_LOCAL_SOURCE_VERSIONS='1',PGHOST='127.0.0.1',PGDATABASE='jobmatch_source_versions_'+'a'*32)
        self.assertTrue(allowed(env));self.assertTrue(database_allowed(env))
        for changed in ({'JOBMATCH_LOCAL_REWRITE_VERSIONS':''},{'JOBMATCH_LOCAL_SOURCE_VERSIONS':''},{'PGHOST':'provider'},{'PGHOST':'postgres'},{'PGSERVICE':'production'},{'PGSERVICEFILE':'file'},{'PGHOSTADDR':'1.2.3.4'},{'PGOPTIONS':'-c role=postgres'}):self.assertFalse(database_allowed({**env,**changed}))
        for name in ('postgres','jobmatch_source_versions_a','jobmatch_other_'+'a'*32):self.assertFalse(database_allowed({**env,'PGDATABASE':name}))

    def test_reviewed_source_guard_hash_is_pinned_and_only_checks_the_new_candidate(self):
        root=Path(__file__).resolve().parent.parent;s=(root/'supabase/protocols/rewrite_versions.sql').read_text();p=re.search(r'create or replace function private\.validate_fact_write\(.*?\$\$;',s,re.S).group();body=p.split('as $$',1)[1].rsplit('$$;',1)[0]
        self.assertIn(hashlib.md5(body.encode()).hexdigest(),s.split('end$$;',1)[0])
        self.assertIn("candidate:=new_state->'versions'->jsonb_array_length(old_state->'versions')",body)
        self.assertNotIn('from jsonb_array_elements(new_state',body.split('allowed:=',1)[0])

    def test_source_protocol_is_not_claimed_as_a_packaged_cli_migration(self):
        root=Path(__file__).resolve().parent.parent;source=(root/'supabase/protocols/rewrite_versions.sql').read_text()
        self.assertIn('NOT a CLI-generated Supabase migration',source)
        self.assertNotIn(source,(root/'supabase/schema.sql').read_text())
        self.assertIn('select null::text',(root/'supabase/protocols/rewrite_versions_disable.sql').read_text())


if __name__=='__main__':unittest.main()
