"""Exercise the psql streaming boundary without accessing a real database."""
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from backup_manifest import TABLES, LETTER_TABLES, SOURCE_TABLES, COMBINED_TABLES, compare, snapshot


class Input(io.BytesIO):
    def close(self):
        self.saved = self.getvalue()
        super().close()


class Process:
    def __init__(self, data, result=0):
        self.stdin = Input()
        self.stdout = io.BytesIO(data)
        self.result = result
        self.running = True
        self.killed = False

    def wait(self):
        self.running = False
        return self.result

    def poll(self):
        return None if self.running else self.result

    def kill(self):
        self.killed = True


def output():
    return b''.join(('JOBMATCH_TABLE:' + table + '\n').encode() +
                    '{"synthetic":"пример\\nстрока"}\n'.encode() for table in TABLES) + b'JOBMATCH_COMPLETE\n'


class SnapshotTests(unittest.TestCase):
    def run_snapshot(self, path, data=None, result=0):
        process = Process(output() if data is None else data, result)
        with patch('backup_manifest.subprocess.Popen', return_value=process) as spawn:
            snapshot(path)
        return process, spawn

    def test_complete_private_manifest_and_read_only_transaction(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'manifest.json'
            process, spawn = self.run_snapshot(path)
            manifest = json.loads(path.read_text())
            self.assertEqual(compare(manifest, manifest), [])
            self.assertEqual(set(manifest['tables']), set(TABLES))
            self.assertTrue(all(t['rows'] == 1 for t in manifest['tables'].values()))
            self.assertNotIn('пример', path.read_text())
            self.assertEqual(os.stat(path).st_mode & 0o777, 0o600)
            self.assertEqual(list(Path(folder).iterdir()), [path])
            sql = process.stdin.saved.decode()
            self.assertIn('REPEATABLE READ READ ONLY', sql)
            self.assertIn('row_security = off', sql)
            self.assertIn("client_encoding = 'UTF8'", sql)
            self.assertIn("DateStyle = 'ISO, YMD'", sql)
            self.assertIn('ON_ERROR_STOP=1', spawn.call_args.args[0])
            self.assertNotIn('--dbname', spawn.call_args.args[0])

    def test_failed_or_incomplete_stream_never_creates_manifest(self):
        variants = [(output(), 1), (output().replace(b'JOBMATCH_COMPLETE\n', b''), 0),
                    (b'', 0), (b'JOBMATCH_TABLE:auth.users\n', 0),
                    (output() + b'extra\n', 0),
                    (output().replace(b'JOBMATCH_TABLE:auth.identities', b'JOBMATCH_TABLE:auth.users'), 0)]
        for data, result in variants:
            with self.subTest(data=data[:40], result=result), tempfile.TemporaryDirectory() as folder:
                path = Path(folder) / 'manifest.json'
                with self.assertRaises(ValueError):
                    self.run_snapshot(path, data, result)
                self.assertFalse(path.exists())
                self.assertEqual(list(Path(folder).iterdir()), [])

    def test_existing_baseline_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'manifest.json'
            path.write_text('baseline')
            with self.assertRaises(FileExistsError):
                self.run_snapshot(path)
            self.assertEqual(path.read_text(), 'baseline')
            self.assertEqual(list(Path(folder).iterdir()), [path])

    def test_disk_failure_leaves_no_partial_manifest(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'manifest.json'
            with patch('backup_manifest.json.dump', side_effect=OSError('disk full')):
                with self.assertRaises(OSError):
                    self.run_snapshot(path)
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_protocol_failure_terminates_and_closes_child(self):
        process = Process(b'unexpected\n')
        with tempfile.TemporaryDirectory() as folder, patch('backup_manifest.subprocess.Popen', return_value=process):
            with self.assertRaises(ValueError):
                snapshot(Path(folder) / 'manifest.json')
        self.assertTrue(process.killed)
        self.assertTrue(process.stdin.closed)
        self.assertTrue(process.stdout.closed)

    def test_non_object_manifests_fail_cleanly(self):
        for bad in (None, [], 'text', {'tables': []},
                    {'format': 'jobmatch-backup-manifest-v1', 'tables': dict.fromkeys(TABLES)}):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                compare(bad, bad)


if __name__ == '__main__':
    unittest.main()

class LogicalSnapshotTests(unittest.TestCase):
    def test_logical_scopes_remain_explicit_complete_private_and_read_only(self):
        for letters, profile, tables, name in [
            (False, False, TABLES, 'jobmatch-backup-logical-v2'),
            (True, False, LETTER_TABLES, 'jobmatch-backup-logical-letters-v2'),
            (False, True, SOURCE_TABLES, 'jobmatch-backup-logical-source-v2'),
            (True, True, COMBINED_TABLES, 'jobmatch-backup-logical-letters-source-v2')]:
            data = b''.join(('JOBMATCH_TABLE:' + t + '\n{}\n').encode() for t in tables) + b'JOBMATCH_COMPLETE\n'
            process = Process(data)
            with self.subTest(name=name), tempfile.TemporaryDirectory() as folder, patch('backup_manifest.subprocess.Popen', return_value=process):
                path = Path(folder) / 'logical.json'
                snapshot(path, include_letters=letters, include_source_profile=profile, logical_workspaces=True)
                report = json.loads(path.read_text())
                self.assertEqual(report['format'], name)
                self.assertEqual(set(report['tables']), set(tables))
                self.assertEqual(compare(report, report), [])
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
                sql = process.stdin.saved.decode()
                self.assertIn('REPEATABLE READ READ ONLY', sql)
                self.assertIn('row_security = off', sql)
                self.assertIn('private.workspace_entities(w.user_id)', sql)
                self.assertIn('w.updated_at', sql)
                if letters:
                    self.assertIn('private.letter_signing_config', sql)
                if profile:
                    self.assertIn('public.source_profile_entries', sql)
                with self.assertRaises(ValueError):
                    compare(report, {**report, 'format': name.replace('logical', 'manifest').replace('-v2', '-v1')})

    def test_default_physical_manifest_never_uses_entity_helper(self):
        process = Process(output())
        with tempfile.TemporaryDirectory() as folder, patch('backup_manifest.subprocess.Popen', return_value=process):
            path = Path(folder) / 'physical.json'
            snapshot(path)
            self.assertEqual(json.loads(path.read_text())['format'], 'jobmatch-backup-manifest-v1')
            self.assertNotIn('workspace_entities', process.stdin.saved.decode())
