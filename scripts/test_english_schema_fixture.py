import unittest
from unittest.mock import patch
from storage_fixture import english_schema_predecessor


class EnglishAdditiveFixtureTests(unittest.TestCase):
    def test_only_exact_single_terminal_addon_is_removed(self):
        addon = b'-- known addon\nselect true;\n'
        predecessor = b'PINNED PREDECESSOR BYTES\n'
        with patch('pathlib.Path.read_bytes', return_value=addon):
            self.assertEqual(english_schema_predecessor(predecessor + b'\n' + addon), predecessor)
            for changed in (predecessor, predecessor.rstrip(b'\n') + addon, predecessor + b'\n' + addon + b'unknown', predecessor + b'\n' + addon + b'\n' + addon, predecessor + b'\n' + addon.replace(b'true', b'false')):
                with self.assertRaisesRegex(ValueError, 'Unexpected English additive migration suffix'):
                    english_schema_predecessor(changed)
