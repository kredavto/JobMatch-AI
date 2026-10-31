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
import fetch_adaptation_model as model

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

    def test_exact_baseline_pin_and_only_baseline_slot(self):
        pin = json.loads(model.PIN.read_text())
        self.assertEqual(model.validate_pin(pin), pin)
        for changed in ({**pin, 'bytes': 1}, {**pin, 'sha256': '0'*64}, {**pin, 'license': 'other'}):
            with self.assertRaises(ValueError): model.validate_pin(changed)
        for slot in ('candidate', 'larger', 'other'):
            with self.assertRaises(ValueError): model.validate_pin(pin, slot)

if __name__ == '__main__':
    unittest.main()
