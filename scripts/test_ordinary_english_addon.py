import hashlib
from pathlib import Path
import unittest
from unittest.mock import patch
from ordinary_english_drill import allowed, BASE_SHA256
from storage_fixture import rewrite_schema_predecessor, source_english_schema_predecessor, ordinary_english_schema_predecessor

ROOT=Path(__file__).resolve().parent.parent
class OrdinaryEnglishGuards(unittest.TestCase):
    def test_preserves_the_exact_previous_schema_and_requires_the_single_terminal_addon(self):
        full=source_english_schema_predecessor(rewrite_schema_predecessor((ROOT/'supabase/schema.sql').read_bytes()))
        self.assertEqual(hashlib.sha256(ordinary_english_schema_predecessor(full)).hexdigest(),BASE_SHA256)
        addon=(ROOT/'supabase/migrations/20261105111200_current_ordinary_english.sql').read_bytes()
        for invalid in (full+b'unknown',full+b'\n'+addon,ordinary_english_schema_predecessor(full)):
            with self.assertRaises(ValueError):ordinary_english_schema_predecessor(invalid)
    def test_rejects_unknown_or_reordered_mock_suffix(self):
        addon=b'-- ordinary\nselect false;\n';prefix=b'PINNED PREFIX\n'
        with patch('pathlib.Path.read_bytes',return_value=addon):
            self.assertEqual(ordinary_english_schema_predecessor(prefix+b'\n'+addon),prefix)
            for invalid in (prefix,prefix.rstrip(b'\n')+addon,prefix+b'\n'+addon+b'unknown',prefix+b'\n'+addon+b'\n'+addon):
                with self.assertRaises(ValueError):ordinary_english_schema_predecessor(invalid)
    def test_only_explicit_owned_loopback_runs_are_authorized(self):
        base=dict(JOBMATCH_LOCAL_ORDINARY_ENGLISH='1',JOBMATCH_LOCAL_VERSION_COMMANDS='1',PGHOST='127.0.0.1')
        self.assertTrue(allowed(base))
        for changes in ({'JOBMATCH_LOCAL_ORDINARY_ENGLISH':''},{'JOBMATCH_LOCAL_VERSION_COMMANDS':''},{'PGHOST':'provider.example'},{'PGHOST':'postgres'},{'PGSERVICE':'prod'},{'PGSERVICEFILE':'file'},{'PGHOSTADDR':'1.2.3.4'},{'PGOPTIONS':'-c role=other'}):
            self.assertFalse(allowed({**base,**changes}))
