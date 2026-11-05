import hashlib
from pathlib import Path
import unittest
from unittest.mock import patch
from source_english_drill import allowed,BASE_SHA256
from storage_fixture import source_english_schema_predecessor

ROOT=Path(__file__).resolve().parent.parent
class SourceEnglishGuards(unittest.TestCase):
    def test_exact_prior_schema_and_single_terminal_addon(self):
        full=(ROOT/'supabase/schema.sql').read_bytes()
        prior=source_english_schema_predecessor(full)
        self.assertEqual(hashlib.sha256(prior).hexdigest(),BASE_SHA256)
        addon=(ROOT/'supabase/migrations/20261105130000_current_source_english.sql').read_bytes()
        for bad in (prior,full+b'unknown',full+b'\n'+addon):
            with self.assertRaises(ValueError):source_english_schema_predecessor(bad)
    def test_unknown_reordered_or_duplicated_suffix_is_refused(self):
        addon=b'KNOWN\n';prefix=b'PREFIX\n'
        with patch('pathlib.Path.read_bytes',return_value=addon):
            self.assertEqual(source_english_schema_predecessor(prefix+b'\n'+addon),prefix)
            for bad in (prefix,prefix.rstrip()+addon,prefix+b'\n'+addon+b'unknown',prefix+b'\n'+addon+b'\n'+addon):
                with self.assertRaises(ValueError):source_english_schema_predecessor(bad)
    def test_requires_both_explicit_loopback_flags_and_refuses_provider_overrides(self):
        base=dict(JOBMATCH_LOCAL_SOURCE_ENGLISH='1',JOBMATCH_LOCAL_SOURCE_VERSIONS='1',PGHOST='127.0.0.1')
        self.assertTrue(allowed(base))
        for change in ({'JOBMATCH_LOCAL_SOURCE_ENGLISH':''},{'JOBMATCH_LOCAL_SOURCE_VERSIONS':''},{'PGHOST':'provider.example'},{'PGHOST':'postgres'},{'PGSERVICE':'prod'},{'PGSERVICEFILE':'file'},{'PGHOSTADDR':'1.2.3.4'},{'PGOPTIONS':'-c role=other'}):
            self.assertFalse(allowed({**base,**change}))
