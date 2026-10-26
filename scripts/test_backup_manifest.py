import copy
import unittest
from backup_manifest import TABLES, compare, fingerprint


class ManifestTests(unittest.TestCase):
    def manifest(self):
        return {'format': 'jobmatch-backup-manifest-v1',
                'tables': {table: fingerprint([b'{"example":"synthetic"}\n']) for table in TABLES}}

    def test_all_tables_required(self):
        original = self.manifest()
        restored = copy.deepcopy(original)
        del restored['tables']['auth.users']
        with self.assertRaises(ValueError):
            compare(original, restored)

    def test_equal_counts_do_not_hide_changed_content(self):
        original = self.manifest()
        restored = copy.deepcopy(original)
        restored['tables']['public.workspaces'] = fingerprint([b'{"example":"changed"}\n'])
        self.assertEqual(compare(original, restored), ['public.workspaces'])

    def test_timestamp_is_not_compared(self):
        original = self.manifest()
        restored = copy.deepcopy(original)
        restored['created_at'] = 'later'
        self.assertEqual(compare(original, restored), [])

    def test_empty_table_is_fingerprinted(self):
        self.assertEqual(fingerprint([])['rows'], 0)
        self.assertNotEqual(fingerprint([]), fingerprint([b'{}\n']))

    def test_invalid_fingerprint_rejected(self):
        for invalid in ({'rows': True, 'sha256': 'a' * 64}, {'rows': -1, 'sha256': 'a' * 64},
                        {'rows': 1, 'sha256': 'z' * 64}):
            manifest = self.manifest()
            manifest['tables']['auth.users'] = invalid
            with self.assertRaises(ValueError):
                compare(manifest, self.manifest())


if __name__ == '__main__':
    unittest.main()
