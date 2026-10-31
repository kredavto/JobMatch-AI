import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import summarize_adaptation as summary
import adaptation_capacity as capacity

class Reporting(unittest.TestCase):
    def test_summary_contains_only_counts_not_raw_model_text(self):
        with tempfile.TemporaryDirectory() as d:
            log, out = Path(d)/'log', Path(d)/'summary'
            log.write_text('JOBMATCH_MAIN_ADAPTATION_CPU_V1 '+json.dumps(dict(acceptance='not-accepted',planned=16,completed=16,backendResponses=16,goldPasses=0,raw='PRIVATE <script>')))
            with patch('sys.argv',['summary',str(log)]), patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(out)}): summary.main()
            self.assertIn('NOT ACCEPTED',out.read_text())
            self.assertNotIn('PRIVATE',out.read_text())
    def test_missing_report_is_explicit(self):
        with tempfile.TemporaryDirectory() as d:
            log,out=Path(d)/'log',Path(d)/'summary'
            log.write_text('startup failed')
            with patch('sys.argv',['summary',str(log)]),patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(out)}): summary.main()
            self.assertIn('No complete diagnostic report',out.read_text())
    def test_low_target_space_refused(self):
        with patch.dict(os.environ,{'RUNNER_TEMP':'/tmp'}),patch.object(capacity.shutil,'disk_usage',return_value=type('Usage',(),{'free':1})()):
            with self.assertRaises(RuntimeError): capacity.main()
    def test_low_ram_refused(self):
        with patch.dict(os.environ,{'RUNNER_TEMP':'/tmp'}),patch.object(capacity.shutil,'disk_usage',return_value=type('Usage',(),{'free':10*1024**3})()),patch.object(capacity.Path,'read_text',return_value='MemAvailable: 1 kB'):
            with self.assertRaises(RuntimeError): capacity.main()
