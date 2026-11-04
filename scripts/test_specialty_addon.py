import unittest
from unittest.mock import patch
from storage_fixture import specialty_schema_predecessor

class SpecialtyAddonTests(unittest.TestCase):
    def test_exact_single_terminal_known_suffix_only(self):
        addon=b'-- addon\nselect true;\n';prefix=b'PINNED PREFIX\n'
        with patch('pathlib.Path.read_bytes',return_value=addon):
            self.assertEqual(specialty_schema_predecessor(prefix+b'\n'+addon),prefix)
            for invalid in (prefix,prefix.rstrip(b'\n')+addon,prefix+b'\n'+addon+b'unknown',prefix+b'\n'+addon+b'\n'+addon,prefix+b'\n'+addon.replace(b'true',b'false')):
                with self.assertRaises(ValueError):specialty_schema_predecessor(invalid)
