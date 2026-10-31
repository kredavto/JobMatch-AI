import contextlib
import io
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import adaptation_model_scope as scope


class CpuScope(unittest.TestCase):
    def test_code_inputs_and_empty_diff_always_run(self):
        for paths in ([], ['evaluation/cpu-diagnostic.cts'], ['a.md', 'cpu-model.json'], ['.github/workflows/cpu.yml'], ['notes.MD']):
            self.assertTrue(scope.requires_run('pull_request', paths))

    def test_only_known_doc_changes_skip(self):
        self.assertFalse(scope.requires_run('pull_request', ['VERIFICATION.md', 'evaluation/README.md']))
        self.assertTrue(scope.requires_run('workflow_dispatch', ['VERIFICATION.md']))

    def test_unknown_events_and_malformed_paths_refuse(self):
        for event, paths in [('push', []), ('pull_request', ['']), ('pull_request', [None])]:
            with self.assertRaises(ValueError):
                scope.requires_run(event, paths)

    def test_git_failure_cannot_be_documentation_only_success(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'output'
            env = dict(CI='true', GITHUB_ACTIONS='true', JOBMATCH_CPU_EVENT_NAME='pull_request', GITHUB_OUTPUT=str(output))
            for failure in (FileNotFoundError(), subprocess.CalledProcessError(128, 'git'), subprocess.TimeoutExpired('git', 10)):
                with patch.dict(os.environ, env, clear=True), patch.object(scope.subprocess, 'run', side_effect=failure), contextlib.redirect_stderr(io.StringIO()):
                    self.assertEqual(scope.main(), 2)
                    self.assertFalse(output.exists())

    def test_successful_code_and_docs_diff_write_exact_output(self):
        with tempfile.TemporaryDirectory() as directory:
            for raw, expected in [(b'evaluation/cpu-diagnostic.cts\0', 'run=true\n'), (b'VERIFICATION.md\0', 'run=false\n')]:
                output = Path(directory) / 'output'
                output.unlink(missing_ok=True)
                env = dict(CI='true', GITHUB_ACTIONS='true', JOBMATCH_CPU_EVENT_NAME='pull_request', GITHUB_OUTPUT=str(output))
                result = subprocess.CompletedProcess([], 0, raw, b'')
                with patch.dict(os.environ, env, clear=True), patch.object(scope.subprocess, 'run', return_value=result), contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(scope.main(), 0)
                self.assertEqual(output.read_text(), expected)

    def test_incomplete_diff_never_writes_skip(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'output'
            env = dict(CI='true', GITHUB_ACTIONS='true', JOBMATCH_CPU_EVENT_NAME='pull_request', GITHUB_OUTPUT=str(output))
            result = subprocess.CompletedProcess([], 0, b'VERIFICATION.md', b'')
            with patch.dict(os.environ, env, clear=True), patch.object(scope.subprocess, 'run', return_value=result), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(scope.main(), 2)
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
