import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
import fetch_cpu_model as model

APPROVED = dict(CI='true', GITHUB_ACTIONS='true', JOBMATCH_AI_CPU_DIAGNOSTIC='true',
                GITHUB_REPOSITORY='kredavto/JobMatch-AI', JOBMATCH_REPOSITORY_VISIBILITY='public')


class ModelDownload(unittest.TestCase):
    def test_exact_hash_size(self):
        raw = b'synthetic bytes, not a model'
        output = io.BytesIO()
        model.copy_verified(io.BytesIO(raw), output, len(raw), hashlib.sha256(raw).hexdigest(), time.monotonic() + 1)
        self.assertEqual(output.getvalue(), raw)

    def test_short_oversized_wrong_hash_and_deadline_refuse(self):
        for raw, size, digest, deadline in [(b'abc', 4, 'a' * 64, time.monotonic() + 1),
                                            (b'abc', 2, 'a' * 64, time.monotonic() + 1),
                                            (b'abc', 3, 'a' * 64, time.monotonic() + 1),
                                            (b'abc', 3, 'a' * 64, time.monotonic() - 1)]:
            with self.subTest(raw=raw, size=size), self.assertRaises(ValueError):
                model.copy_verified(io.BytesIO(raw), io.BytesIO(), size, digest, deadline)

    def test_only_https_fixed_public_download_hosts(self):
        for url in ('https://huggingface.co/file', 'https://cas-bridge.xethub.hf.co/file'):
            self.assertTrue(model.valid_url(url))
        for url in ('http://huggingface.co/file', 'https://huggingface.co.evil.test/file',
                    'https://user:secret@huggingface.co/file', 'https://example.test/file',
                    'https://huggingface.co:444/file', 'file:///private'):
            self.assertFalse(model.valid_url(url))

    def test_redirect_cannot_escape_allowlist(self):
        with self.assertRaises(ValueError):
            model.SafeRedirect().redirect_request(None, None, 302, '', {}, 'https://private.example/file')

    def test_no_ci_approval_no_network_or_files(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {}, clear=True), patch.object(model.urllib.request, 'build_opener') as opener:
            target = Path(directory) / 'new'
            err = io.StringIO()
            with contextlib.redirect_stderr(err):
                self.assertEqual(model.main([str(target)]), 2)
            opener.assert_not_called()
            self.assertFalse(target.exists())
            self.assertNotIn(str(target), err.getvalue())

    def test_existing_directory_is_preserved_before_network(self):
        approved = dict(CI='true', GITHUB_ACTIONS='true', JOBMATCH_AI_CPU_DIAGNOSTIC='true',
                        GITHUB_REPOSITORY='kredavto/JobMatch-AI', JOBMATCH_REPOSITORY_VISIBILITY='public')
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, approved, clear=True), patch.object(model.urllib.request, 'build_opener') as opener:
            file = Path(directory) / 'keep'
            file.write_text('existing')
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(model.main([directory]), 2)
            self.assertEqual(file.read_text(), 'existing')
            opener.assert_not_called()

    def test_two_reviewed_pins_and_default_are_exact(self):
        baseline = json.loads(model.PIN.read_text())
        candidate = json.loads(model.CANDIDATE_PIN.read_text())
        self.assertEqual(model.validate_pin(baseline), baseline)
        self.assertEqual(model.validate_pin(candidate, 'candidate'), candidate)
        for value, slot in ((candidate, 'baseline'), (baseline, 'candidate'), (candidate, 'PRIVATE')):
            with self.subTest(slot=slot), self.assertRaises(ValueError):
                model.validate_pin(value, slot)
        for slot, pin in (('baseline', baseline), ('candidate', candidate)):
            for change in ({'revision': 'main'}, {'repository': 'PRIVATE'}, {'file': 'PRIVATE'},
                           {'sha256': 'a' * 64}, {'bytes': 1}, {'threads': 8}, {'seed': 1},
                           {'context': 8192}, {'maxTokens': 4096}, {'endpoint': 'https://PRIVATE'}):
                with self.subTest(slot=slot, change=change), self.assertRaises(ValueError):
                    model.validate_pin({**pin, **change}, slot)

    def test_unknown_parameters_refuse_before_network_or_files(self):
        for args in ([], ['--candidate'], ['--PRIVATE'], ['--candidate', '--PRIVATE'],
                     ['--PRIVATE', 'target'], ['--candidate', 'target', 'PRIVATE']):
            with self.subTest(args=args), patch.dict(os.environ, APPROVED, clear=True), \
                    patch.object(model.urllib.request, 'build_opener') as opener, \
                    patch.object(model.Path, 'mkdir') as mkdir, contextlib.redirect_stderr(io.StringIO()) as err:
                self.assertEqual(model.main(args), 2)
                opener.assert_not_called()
                mkdir.assert_not_called()
                self.assertNotIn('PRIVATE', err.getvalue())

    def test_candidate_existing_directory_preserved_before_network(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, APPROVED, clear=True), \
                patch.object(model.urllib.request, 'build_opener') as opener:
            keep = Path(directory) / 'keep'
            keep.write_text('existing')
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(model.main(['--candidate', directory]), 2)
            self.assertEqual(keep.read_text(), 'existing')
            opener.assert_not_called()

    def test_changed_candidate_manifest_refuses_before_creating_directory(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, APPROVED, clear=True), \
                patch.object(model.urllib.request, 'build_opener') as opener:
            manifest = Path(directory) / 'fixture.json'
            changed = json.loads(model.CANDIDATE_PIN.read_text())
            changed['revision'] = 'main'
            manifest.write_text(json.dumps(changed))
            target = Path(directory) / 'new'
            with patch.object(model, 'CANDIDATE_PIN', manifest), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(model.main(['--candidate', str(target)]), 2)
            self.assertFalse(target.exists())
            opener.assert_not_called()

    def test_mock_metadata_wrong_license_refuses_before_weight_download(self):
        # Scripted metadata is a loader guard fixture, never evidence of downloaded/executed weights.
        pin = json.loads(model.CANDIDATE_PIN.read_text())
        pointer = ('version https://git-lfs.github.com/spec/v1\noid sha256:' + pin['sha256']
                   + '\nsize ' + str(pin['bytes']) + '\n').encode()
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, APPROVED, clear=True), \
                patch.object(model, 'small', side_effect=[pointer, b'Apache License PRIVATE forged fixture']) as metadata, \
                patch.object(model, 'copy_verified') as weights, contextlib.redirect_stderr(io.StringIO()) as err:
            target = Path(directory) / 'new'
            self.assertEqual(model.main(['--candidate', str(target)]), 2)
            self.assertEqual(metadata.call_count, 2)
            weights.assert_not_called()
            self.assertEqual(list(target.iterdir()), [])
            self.assertNotIn('PRIVATE', err.getvalue())
            self.assertNotIn(str(target), err.getvalue())

    def test_larger_exact_identity_refuses_changes_and_cross_slot(self):
        pin = json.loads(model.LARGER_PIN.read_text())
        self.assertEqual(model.validate_pin(pin, 'larger'), pin)
        for slot in ['baseline', 'candidate', 'PRIVATE']:
            with self.assertRaises(ValueError):
                model.validate_pin(pin, slot)
        for change in [{'revision':'main'}, {'bytes':3808391071}, {'sha256':'0'*64},
                       {'file':'PRIVATE'}, {'repository':'PRIVATE'}, {'threads':8},
                       {'endpoint':'https://PRIVATE'}, {'seed':1}]:
            with self.assertRaises(ValueError):
                model.validate_pin({**pin, **change}, 'larger')

    def test_larger_existing_directory_preserved_before_network(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, APPROVED, clear=True), \
                patch.object(model.urllib.request, 'build_opener') as opener:
            keep = Path(directory) / 'keep'
            keep.write_text('existing')
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(model.main(['--larger', directory]), 2)
            self.assertEqual(keep.read_text(), 'existing')
            opener.assert_not_called()

    def test_larger_bad_metadata_never_downloads_weights(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, APPROVED, clear=True), \
                patch.object(model, 'small', return_value=b'PRIVATE') as metadata, \
                patch.object(model, 'copy_verified') as weights, contextlib.redirect_stderr(io.StringIO()) as err:
            self.assertEqual(model.main(['--larger', str(Path(directory)/'new')]), 2)
            self.assertEqual(metadata.call_count, 1)
            weights.assert_not_called()
            self.assertNotIn('PRIVATE', err.getvalue())


if __name__ == '__main__':
    unittest.main()
