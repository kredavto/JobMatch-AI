import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from backup_manifest import snapshot,compare,fingerprint,VERSION_TABLES,FORMATS
from test_backup_snapshot import Process


class SourceVersionManifest(unittest.TestCase):
    def test_explicit_full18_physical_logical_scope_and_safe_file(self):
        self.assertEqual(len(VERSION_TABLES),18)
        for logical in (False,True):
            name='jobmatch-backup-'+('logical' if logical else 'manifest')+'-letters-source-versions-v3'
            data=b''.join(('JOBMATCH_TABLE:'+table+'\n{}\n').encode() for table in VERSION_TABLES)+b'JOBMATCH_COMPLETE\n'
            process=Process(data)
            with tempfile.TemporaryDirectory() as folder,patch('backup_manifest.subprocess.Popen',return_value=process):
                output=Path(folder,'full.json');snapshot(output,True,True,logical,True);report=json.loads(output.read_text())
                self.assertEqual(report['format'],name);self.assertEqual(set(report['tables']),set(VERSION_TABLES));self.assertEqual(output.stat().st_mode&0o777,0o600)
                sql=process.stdin.saved.decode();self.assertIn('REPEATABLE READ READ ONLY',sql);self.assertIn('public.source_profile_versions',sql);self.assertIn('private.letter_signing_config',sql)
                self.assertEqual('private.workspace_entities(w.user_id)' in sql,logical)
                changed=copy.deepcopy(report);changed['tables']['public.source_profile_versions']=fingerprint([b'changed\n']);self.assertEqual(compare(report,changed),['public.source_profile_versions'])
                for other,tables in FORMATS.items():
                    if other!=name:
                        with self.assertRaises(ValueError):compare(report,{'format':other,'tables':{t:fingerprint([]) for t in tables}})
                del changed['tables']['public.source_profile_versions']
                with self.assertRaises(ValueError):compare(report,changed)

    def test_partial_flags_refuse_before_database_access_or_artifact(self):
        for letters,profile in ((False,False),(False,True),(True,False)):
            with tempfile.TemporaryDirectory() as folder,patch('backup_manifest.subprocess.Popen') as spawn:
                output=Path(folder,'refused.json')
                with self.assertRaises(ValueError):snapshot(output,letters,profile,False,True)
                spawn.assert_not_called();self.assertFalse(output.exists())
