import copy
import unittest
from backup_manifest import TABLES, LETTER_TABLES, SOURCE_TABLES, COMBINED_TABLES, FORMATS, compare, fingerprint


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

    def test_letters_scope_is_explicit_and_cannot_compare_to_legacy(self):
        legacy = self.manifest()
        letters = {'format': 'jobmatch-backup-manifest-letters-v1',
                   'tables': {table: fingerprint([b'{"synthetic":true}\n']) for table in LETTER_TABLES}}
        self.assertEqual(compare(letters, copy.deepcopy(letters)), [])
        for table in ('private.letter_signing_config', 'public.saved_letter_versions'):
            changed = copy.deepcopy(letters)
            changed['tables'][table] = fingerprint([b'{"changed":true}\n'])
            self.assertEqual(compare(letters, changed), [table])
        with self.assertRaises(ValueError):
            compare(legacy, letters)
        del letters['tables']['private.letter_signing_config']
        with self.assertRaises(ValueError):
            compare(letters, letters)

    def test_source_scopes_are_explicit_complete_and_not_interchangeable(self):
        self.assertEqual(len(SOURCE_TABLES), 15)
        self.assertEqual(len(COMBINED_TABLES), 17)
        for name, tables in FORMATS.items():
            manifest = {'format': name, 'tables': {t: fingerprint([b'{}\n']) for t in tables}}
            self.assertEqual(compare(manifest, copy.deepcopy(manifest)), [])
            if 'source' in name:
                for table in ('public.source_profiles', 'public.source_profile_entries'):
                    changed = copy.deepcopy(manifest)
                    changed['tables'][table] = fingerprint([b'{"changed":true}\n'])
                    self.assertEqual(compare(manifest, changed), [table])
                    del changed['tables'][table]
                    with self.assertRaises(ValueError):
                        compare(manifest, changed)
            for other in FORMATS:
                if other != name:
                    with self.assertRaises(ValueError):
                        compare(manifest, {'format': other, 'tables': {t: fingerprint([]) for t in FORMATS[other]}})

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
