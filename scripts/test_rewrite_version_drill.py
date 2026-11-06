import hashlib
import re
import unittest
import copy
import json
from unittest.mock import patch,MagicMock
from pathlib import Path
from rewrite_version_drill import allowed,database_allowed,observed_waiter,NativeFailure,rewrite_corruption_detected
from backup_manifest import FORMATS
from storage_fixture import rewrite_schema_predecessor


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

    def test_actual_cli_artifact_matches_source_body_migration_and_closed_rollback(self):
        root=Path(__file__).resolve().parent.parent
        evidence=json.loads((root/'supabase/protocols/rewrite_versions_packaging.json').read_text())
        source=(root/'supabase/protocols/rewrite_versions.sql').read_bytes()
        migration=(root/'supabase/migrations'/evidence['migrationFilename']).read_bytes()
        self.assertEqual(hashlib.sha256(source).hexdigest(),evidence['sourceSha256'])
        self.assertEqual(migration,b'-- CLI-created migration shell; reviewed native rewrite source.\n-- Source SHA256: '+evidence['sourceSha256'].encode()+b'\n'+source[source.index(b'\nbegin;\n')+1:])
        self.assertEqual(hashlib.sha256(migration).hexdigest(),evidence['migrationSha256'])
        self.assertEqual(hashlib.sha1(b'blob '+str(len(migration)).encode()+b'\0'+migration).hexdigest(),evidence['migrationGitBlobSha1'])
        self.assertEqual(evidence['egressProbe'],'ENETUNREACH')
        self.assertEqual(evidence['containerNetworkMode'],'none')
        self.assertEqual(evidence['providerOperations'],'not-performed')
        self.assertEqual([c['args'] for c in evidence['commands']][-1],['migration','new','reviewed_rewrite_versions'])
        rollback=(root/'supabase/rollback'/evidence['migrationFilename']).read_bytes()
        self.assertEqual(rollback,(root/'supabase/protocols/rewrite_versions_disable.sql').read_bytes())
        self.assertIn(b'select null::text',rollback)

    def test_new_suffix_is_exactly_once_and_unknown_or_duplicate_content_refuses(self):
        root=Path(__file__).resolve().parent.parent
        full=(root/'supabase/schema.sql').read_bytes()
        prior=rewrite_schema_predecessor(full)
        self.assertNotEqual(prior,full)
        for bad in (prior,full+b'unknown',full+b'\n'+full[len(prior)+1:]):
            with self.assertRaises(ValueError):rewrite_schema_predecessor(bad)


if __name__=='__main__':unittest.main()
