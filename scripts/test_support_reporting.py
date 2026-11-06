import json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import summarize_support as summary
class Reporting(unittest.TestCase):
 def run_report(self,change=None):
  with tempfile.TemporaryDirectory() as d:
   log,out=Path(d)/'log',Path(d)/'out'
   r=dict(acceptance='not-accepted',planned=24,nonSupportedTotal=18,supportedTotal=6,completed=24,backendResponses=24,validOutputs=24,parsedOutputs=24,supportedVerdictProposals=6,falseSupported=1,admittedFalseSupported=1,supportedSuccess=5,exactVerdictMatches=18,raw='PRIVATE <script>')
   r.update(change or {});log.write_text('JOBMATCH_SUPPORT_VERIFIER_V1 '+json.dumps(r))
   with patch('sys.argv',['summary',str(log)]),patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(out)}):summary.main()
   return out.read_text()
 def test_only_counters(self):
  s=self.run_report();self.assertIn('NOT ACCEPTED',s);self.assertNotIn('PRIVATE',s)
 def test_invalid_counter(self):
  for v in ['<script>',True,-1,19]:
   with self.assertRaises(ValueError):self.run_report({'falseSupported':v})
 def test_no_accepted_model(self):
  with self.assertRaises(ValueError):self.run_report({'acceptance':'accepted'})
 def test_inconsistent_counters(self):
  with self.assertRaises(ValueError):self.run_report({'admittedFalseSupported':2})
