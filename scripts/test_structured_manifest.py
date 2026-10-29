import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from backup_manifest import STRUCTURED_TABLES, snapshot, compare, fingerprint
from test_backup_snapshot import Process


class StructuredManifestTests(unittest.TestCase):
    def test_snapshot_and_compare_require_all_fifteen_tables(self):
        data = b''.join(('JOBMATCH_TABLE:'+table+'\n{"synthetic":true}\n').encode() for table in STRUCTURED_TABLES)+b'JOBMATCH_COMPLETE\n'
        process = Process(data)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'manifest.json'
            with patch('backup_manifest.subprocess.Popen', return_value=process):
                snapshot(path, include_structured=True)
            manifest = json.loads(path.read_text())
            self.assertEqual(manifest['format'], 'jobmatch-backup-structured-v3')
            self.assertEqual(len(manifest['tables']), 15)
            self.assertEqual(compare(manifest, manifest), [])
            missing = copy.deepcopy(manifest)
            del missing['tables']['public.structured_profiles']
            with self.assertRaises(ValueError):
                compare(manifest, missing)
            changed = copy.deepcopy(manifest)
            changed['tables']['public.structured_profile_entries'] = fingerprint([b'changed\n'])
            self.assertEqual(compare(manifest, changed), ['public.structured_profile_entries'])

    def test_logical_and_structured_mode_cannot_silently_mix(self):
        with self.assertRaises(ValueError):
            snapshot('unused', logical_workspaces=True, include_structured=True)


if __name__ == '__main__':
    unittest.main()
