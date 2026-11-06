import hashlib
import re
import unittest
import copy
from unittest.mock import patch,MagicMock
from pathlib import Path
from rewrite_version_drill import allowed,database_allowed,observed_waiter,NativeFailure,rewrite_corruption_detected
from backup_manifest import FORMATS


class RewriteProtocolGuard(unittest.TestCase):
    def test_same_count_logical_corruption_changes_native_and_workspace_projection_only(self):
        kind='jobmatch-backup-logical-reminders-v4';before=dict(format=kind,tables={name:dict(rows=1,sha256='a'*64) for name in FORMATS[kind]})
        changed=copy.deepcopy(before)
        for name in ('public.workspaces','public.resume_versions'):changed['tables'][name]['sha256']='b'*64
        self.assertTrue(rewrite_corruption_detected(before,changed))
        for name in ('public.workspaces','public.resume_versions'):
            partial=copy.deepcopy(before);partial['tables'][name]['sha256']='b'*64;self.assertFalse(rewrite_corruption_detected(before,partial))
        wrong_count=copy.deepcopy(changed);wrong_count['tables']['public.resume_versions']['rows']=2;self.assertFalse(rewrite_corruption_detected(before,wrong_count))
        unrelated=copy.deepcopy(changed);unrelated['tables']['private.letter_signing_config']['sha256']='c'*64;self.assertFalse(rewrite_corruption_detected(before,unrelated))

    def test_probe_setup_failure_closes_owned_children_and_keeps_original_error(self):
        for cleanup_fails in (False,True):
            with self.subTest(cleanup_fails=cleanup_fails):
                fake=MagicMock();fake.a='11111111-1111-4111-8111-111111111111';fake.b='22222222-2222-4222-8222-222222222222';fake.sa='44444444-4444-4444-8444-444444444444';fake.sb='55555555-5555-4555-8555-555555555555'
                if cleanup_fails:fake.cleanup.side_effect=RuntimeError('fixture cleanup')
                expected=NativeFailure('EXPECTED_SETUP_REFUSAL')
                with patch('rewrite_version_drill.Probe',return_value=fake),patch('rewrite_version_drill.sql',side_effect=expected),patch('rewrite_version_drill.sys.stderr'):
                    with self.assertRaises(NativeFailure) as caught:observed_waiter({},Path('.'),'session')
                self.assertIs(caught.exception,expected);fake.cleanup.assert_called_once_with()

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
