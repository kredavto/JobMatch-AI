import copy
import io
import math
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'evaluation/nli'))
from contract import decisions,load_cases,summarize
from fetch_nli_model import manifest
from fetch_adaptation_model import valid_url,copy_verified,approved

class NliTests(unittest.TestCase):
    def test_frozen_corpora_and_balance(self):
        cases=load_cases(ROOT/'evaluation/nli')
        self.assertEqual(len(cases),36)
        for cohort,count in [('replay',24),('challenge',12)]:
            subset=[c for c in cases if c['cohort']==cohort]
            self.assertEqual(len(subset),count)
            self.assertEqual(sum(c['expectedEntailment'] for c in subset),6)
            for lang in ('ru','en'):
                self.assertEqual(sum(c['expectedEntailment'] for c in subset if c['language']==lang),3)
    def test_negation_and_full_context_preserved(self):
        import json
        original=json.loads((ROOT/'evaluation/nli/replay-v1.json').read_text())
        cases=load_cases(ROOT/'evaluation/nli')[:24]
        for source,c in zip(original,cases):
            self.assertEqual(c['premise'],'\n'.join(f['text'] for f in source['facts']))
            self.assertEqual(c['hypothesis'],source['requirement'])
            self.assertNotIn('rationale',c)
    def test_nonfinite_refused(self):
        for logits in [[1,2], [1,2,3,4], [float('nan'),0,1], [float('inf'),0,1], [True,0,0]]:
            with self.assertRaises(ValueError):decisions(logits)
    def test_argmax_not_high_confidence(self):
        d=decisions([1,0,0]);self.assertEqual(d['argmax'],'entailment');self.assertFalse(d['supported'])
        self.assertTrue(decisions([10,0,0])['supported'])
    def test_zero_coverage_is_not_success(self):
        cases=load_cases(ROOT/'evaluation/nli')
        rows=[dict(id=c['id'],status='ok',logits=[0,10,0]) for c in cases]
        for stats in summarize(cases,rows).values():
            self.assertEqual(stats['falseSupported'],0);self.assertFalse(stats['preliminarySignal'])
    def test_false_positive_reported_raw_and_threshold(self):
        cases=load_cases(ROOT/'evaluation/nli')
        rows=[dict(id=c['id'],status='ok',logits=[10,0,0]) for c in cases]
        stats=summarize(cases,rows)
        self.assertEqual(stats['replay']['falseSupported'],18)
        self.assertEqual(stats['challenge']['falseSupported'],6)
        self.assertFalse(stats['challenge']['preliminarySignal'])
    def test_incomplete_not_negative(self):
        cases=load_cases(ROOT/'evaluation/nli')
        stats=summarize(cases,[])
        self.assertEqual(stats['replay']['valid'],0);self.assertFalse(stats['replay']['preliminarySignal'])
    def test_duplicate_unknown_refused(self):
        cases=load_cases(ROOT/'evaluation/nli')
        for rows in [[{'id':'foreign'}],[{'id':cases[0]['id']}]*2]:
            with self.assertRaises(ValueError):summarize(cases,rows)
    def test_manifest_only_safetensors(self):
        p=manifest();self.assertEqual(p['license'],'MIT')
        self.assertIn('model.safetensors',p['files']);self.assertNotIn('pytorch_model.bin',p['files'])
        self.assertLess(sum(x['bytes'] for x in p['files'].values()),600_000_000)
    def test_no_download_credential_or_arbitrary_host(self):
        with patch.dict('os.environ', {}, clear=True):
            self.assertFalse(approved())
        for u in ['http://huggingface.co/a','https://huggingface.co.evil.test/a','https://u:p@huggingface.co/a','https://localhost/a']:
            self.assertFalse(valid_url(u))
    def test_copy_verifies_sha_and_size(self):
        import time,hashlib
        out=io.BytesIO();copy_verified(io.BytesIO(b'x'),out,1,hashlib.sha256(b'x').hexdigest(),time.monotonic()+1)
        for size,digest in [(0,'0'*64),(1,'0'*64),(2,hashlib.sha256(b'x').hexdigest())]:
            with self.assertRaises(ValueError):copy_verified(io.BytesIO(b'x'),io.BytesIO(),size,digest,time.monotonic()+1)

class ReportTests(unittest.TestCase):
    def fixture(self):
        from contract import sha
        root=ROOT/'evaluation/nli';cases=load_cases(root)
        rows=[dict(id=c['id'],cohort=c['cohort'],language=c['language'],premise=c['premise'],hypothesis=c['hypothesis'],
                   status='ok',inputTokens=20,logits=[0,10,0],**decisions([0,10,0])) for c in cases]
        return dict(format='jobmatch-nli-diagnostic-v1',acceptance='not-accepted',model=manifest(),threshold=0.95,
                    weightsFilesVerified=True,modelIdentityVerified=False,deploymentIdentityVerified=False,
                    complete=True,rows=rows,metrics=summarize(cases,rows),head='a'*40,image='sha256:'+'b'*64,
                    runtime=dict(dtype='float32',threads=4,tokenizerClass='fixture-fast',tokenizerFast=True,torch='2.15.0+cpu',transformers='5.22.1',tokenizers='0.23.3',safetensors='0.8.0'),
                    sourceHashes={f:sha((root/f).read_bytes()) for f in ['model.json','contract.py','run.py','replay-v1.json','challenge-v1.json','Dockerfile']})
    def check(self,r):
        import json
        from summarize_nli import validate,PREFIX
        return validate(PREFIX+json.dumps(r))
    def test_recompute_fixture(self):
        self.assertFalse(self.check(self.fixture())['metrics']['replay']['preliminarySignal'])
    def test_reject_missing_hash_context_counter_score(self):
        r=self.fixture();mutations=[]
        a=copy.deepcopy(r);a['sourceHashes'].pop('contract.py');mutations.append(a)
        a=copy.deepcopy(r);a['rows'][0]['premise']='sanitized';mutations.append(a)
        a=copy.deepcopy(r);a['metrics']['replay']['falseSupported']=5;mutations.append(a)
        a=copy.deepcopy(r);a['rows'][0]['supported']=True;mutations.append(a)
        a=copy.deepcopy(r);a['rows'][0]['inputTokens']=513;mutations.append(a)
        a=copy.deepcopy(r);a['acceptance']='accepted';mutations.append(a)
        a=copy.deepcopy(r);a['runtime']['dtype']='float16';mutations.append(a)
        a=copy.deepcopy(r);a['weightsFilesVerified']=False;mutations.append(a)
        for a in mutations:
            with self.assertRaises(ValueError):self.check(a)
    def test_missing_physical_row_rejected(self):
        r=self.fixture();r['rows'].pop()
        with self.assertRaises(ValueError):self.check(r)
    def test_partial_rows_preserved_but_not_complete(self):
        r=self.fixture();r['rows']=r['rows'][:2];r['complete']=False
        r['metrics']=summarize(load_cases(ROOT/'evaluation/nli'),r['rows'])
        self.assertFalse(self.check(r)['complete'])
    def test_incomplete_row_not_accepted_as_negative(self):
        r=self.fixture();r['rows'][0]['status']='overlength'
        with self.assertRaises(ValueError):self.check(r)

if __name__=='__main__':unittest.main()
