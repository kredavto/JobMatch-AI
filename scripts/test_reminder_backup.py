import copy
import unittest
from unittest.mock import patch
from backup_manifest import FORMATS, VERSION_TABLES, snapshot, compare


class ReminderBackupTests(unittest.TestCase):
    def manifest(self):
        return {'format': 'jobmatch-backup-logical-reminders-v4', 'tables': {name: {'rows': 1, 'sha256': '0'*64} for name in FORMATS['jobmatch-backup-logical-reminders-v4']}}

    def test_scope_is_explicit_and_does_not_change_prior_formats(self):
        self.assertEqual(len(VERSION_TABLES), 18)
        self.assertEqual(len(FORMATS['jobmatch-backup-logical-reminders-v4']), 20)
        self.assertNotIn('private.reminder_state', VERSION_TABLES)
        self.assertEqual(compare(self.manifest(), self.manifest()), [])

    def test_new_table_corruption_detected(self):
        for name in ('public.application_reminders', 'private.reminder_state'):
            baseline = self.manifest()
            changed = copy.deepcopy(baseline)
            changed['tables'][name]['sha256'] = '1'*64
            self.assertEqual(compare(baseline, changed), [name])

    def test_incomplete_scope_and_scope_mixing_refused(self):
        baseline = self.manifest()
        bad = copy.deepcopy(baseline)
        del bad['tables']['private.reminder_state']
        with self.assertRaises(ValueError):
            compare(baseline, bad)
        bad = copy.deepcopy(baseline)
        bad['format'] = 'jobmatch-backup-manifest-reminders-v4'
        with self.assertRaises(ValueError):
            compare(baseline, bad)

    def test_requires_prior_scopes_before_opening_postgres(self):
        with patch('backup_manifest.subprocess.Popen') as process:
            with self.assertRaises(ValueError):
                snapshot('/unused', include_reminders=True)
            process.assert_not_called()
