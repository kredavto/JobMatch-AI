import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from backup_manifest import STRUCTURED_V3_TABLES, STRUCTURED_V4_TABLES, STRUCTURED_V5_TABLES, STRUCTURED_V6_TABLES, STRUCTURED_TABLES, snapshot, compare, fingerprint
from test_backup_snapshot import Process


class StructuredManifestTests(unittest.TestCase):
    def test_snapshot_and_compare_require_all_twenty_three_tables(self):
        data = b''.join(('JOBMATCH_TABLE:'+table+'\n{"synthetic":true}\n').encode() for table in STRUCTURED_TABLES)+b'JOBMATCH_COMPLETE\n'
        process = Process(data)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'manifest.json'
            with patch('backup_manifest.subprocess.Popen', return_value=process):
                snapshot(path, include_structured=True)
            manifest = json.loads(path.read_text())
            self.assertEqual(manifest['format'], 'jobmatch-backup-structured-v7')
            self.assertEqual(len(manifest['tables']), 23)
            self.assertEqual(compare(manifest, manifest), [])
            missing = copy.deepcopy(manifest)
            del missing['tables']['public.reminder_events']
            with self.assertRaises(ValueError):
                compare(manifest, missing)
            changed = copy.deepcopy(manifest)
            changed['tables']['public.structured_profile_entries'] = fingerprint([b'changed\n'])
            self.assertEqual(compare(manifest, changed), ['public.structured_profile_entries'])

    def test_legacy_v3_remains_valid_but_cannot_hide_missing_versions_in_v4(self):
        old = {'format': 'jobmatch-backup-structured-v3', 'tables': {t: fingerprint([]) for t in STRUCTURED_V3_TABLES}}
        self.assertEqual(compare(old, old), [])
        mislabeled = copy.deepcopy(old)
        mislabeled['format'] = 'jobmatch-backup-structured-v5'
        with self.assertRaises(ValueError):
            compare(mislabeled, mislabeled)

    def test_v4_is_historical_and_cannot_be_mislabeled_v5(self):
        old = {'format': 'jobmatch-backup-structured-v4', 'tables': {t: fingerprint([]) for t in STRUCTURED_V4_TABLES}}
        self.assertEqual(compare(old, old), [])
        incomplete = copy.deepcopy(old)
        incomplete['format'] = 'jobmatch-backup-structured-v5'
        with self.assertRaises(ValueError):
            compare(incomplete, incomplete)

    def test_v5_is_preserved_and_cannot_hide_missing_consent_tables_in_v6(self):
        old = {'format': 'jobmatch-backup-structured-v5', 'tables': {t: fingerprint([]) for t in STRUCTURED_V5_TABLES}}
        self.assertEqual(len(old['tables']), 19)
        self.assertEqual(compare(old, old), [])
        wrong = copy.deepcopy(old)
        wrong['format'] = 'jobmatch-backup-structured-v6'
        with self.assertRaises(ValueError):
            compare(wrong, wrong)

    def test_consent_notice_and_receipt_changes_are_both_detected(self):
        source = {'format': 'jobmatch-backup-structured-v6', 'tables': {t: fingerprint([]) for t in STRUCTURED_V6_TABLES}}
        for table in ['private.processing_notices', 'public.processing_consent_receipts']:
            changed = copy.deepcopy(source)
            changed['tables'][table] = fingerprint([b'changed\n'])
            self.assertEqual(compare(source, changed), [table])
        self.assertNotIn('private.auth_quota_config', source['tables'])

    def test_v6_remains_historical_and_cannot_hide_ai_rows_or_signing_config(self):
        old = {'format':'jobmatch-backup-structured-v6', 'tables':{t:fingerprint([]) for t in STRUCTURED_V6_TABLES}}
        self.assertEqual(len(old['tables']),21)
        self.assertEqual(compare(old,old),[])
        wrong=copy.deepcopy(old)
        wrong['format']='jobmatch-backup-structured-v7'
        with self.assertRaises(ValueError):
            compare(wrong,wrong)
        current={'format':'jobmatch-backup-structured-v7','tables':{t:fingerprint([]) for t in STRUCTURED_TABLES}}
        for table in ['public.ai_profile_acceptances','private.ai_profile_signing_config']:
            missing=copy.deepcopy(current)
            del missing['tables'][table]
            with self.assertRaises(ValueError):
                compare(current,missing)
            changed=copy.deepcopy(current)
            changed['tables'][table]=fingerprint([b'changed synthetic bytes'])
            self.assertEqual(compare(current,changed),[table])
        with self.assertRaises(ValueError):
            compare(old,current)

    def test_logical_and_structured_mode_cannot_silently_mix(self):
        with self.assertRaises(ValueError):
            snapshot('unused', logical_workspaces=True, include_structured=True)


if __name__ == '__main__':
    unittest.main()
