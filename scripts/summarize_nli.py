"""Recompute binary support counters from actual logits, not caller metrics."""
import json
import os
import re
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'evaluation/nli'))
from contract import load_cases, summarize, sha, decisions
from fetch_nli_model import manifest

PREFIX = 'JOBMATCH_NLI_DIAGNOSTIC_V1 '

def validate(text, expected_head=None):
    lines = [line[len(PREFIX):] for line in text.splitlines() if line.startswith(PREFIX)]
    if len(lines) != 1:
        raise ValueError('Exactly one physical report required')
    report = json.loads(lines[0])
    root = Path(__file__).resolve().parent.parent / 'evaluation/nli'
    cases = load_cases(root)
    if report.get('format') != 'jobmatch-nli-diagnostic-v1' or report.get('acceptance') != 'not-accepted':
        raise ValueError('Invalid report identity')
    if len(report['rows']) > 36 or len({r['id'] for r in report['rows']}) != len(report['rows']) or {r['id'] for r in report['rows']} - {c['id'] for c in cases}:
        raise ValueError('Invalid or duplicate rows')
    if (report.get('model') != manifest() or report.get('threshold') != 0.95
            or report.get('weightsFilesVerified') is not True
            or report.get('modelIdentityVerified') is not False
            or report.get('deploymentIdentityVerified') is not False
            or (expected_head is not None and report.get('head') != expected_head)):
        raise ValueError('Runtime identity mismatch')
    runtime=report.get('runtime',{})
    if (not re.fullmatch('sha256:[a-f0-9]{64}', report.get('image',''))
            or not re.fullmatch('[a-f0-9]{40}', report.get('head',''))
            or runtime.get('dtype') != 'float32' or runtime.get('threads') != 4
            or runtime.get('tokenizerFast') is not True or not isinstance(runtime.get('tokenizerClass'),str)
            or runtime.get('torch') != '2.15.0+cpu' or runtime.get('transformers') != '5.22.1'
            or runtime.get('tokenizers') != '0.23.3' or runtime.get('safetensors') != '0.8.0'):
        raise ValueError('Unexpected runtime contract')
    expected = {c['id']:c for c in cases}
    for r in report['rows']:
        c=expected[r['id']]
        if any(r[k] != c[k] for k in ['cohort','language','premise','hypothesis']):
            raise ValueError('Source context changed')
        if r['status'] not in ('ok','overlength','error'):
            raise ValueError('Invalid status')
        if r['status'] == 'ok':
            if type(r['inputTokens']) is not int or not 1 <= r['inputTokens'] <= 512:
                raise ValueError('Invalid full input size')
            if any(r.get(k) != v for k,v in decisions(r['logits']).items()):
                raise ValueError('Raw decision mismatch')
    metrics = summarize(cases, report['rows'])
    complete=len(report['rows'])==36 and all(r['status']=='ok' for r in report['rows'])
    if metrics != report['metrics'] or report['complete'] != complete:
        raise ValueError('Counter mismatch')
    if set(report['sourceHashes']) != {'model.json','contract.py','run.py','replay-v1.json','challenge-v1.json','Dockerfile'}:
        raise ValueError('Incomplete source identity')
    for f, digest in report['sourceHashes'].items():
        if f not in ['model.json','contract.py','run.py','replay-v1.json','challenge-v1.json','Dockerfile'] or sha((root/f).read_bytes()) != digest:
            raise ValueError('Source hash mismatch')
    return report

if __name__ == '__main__':
    import subprocess
    head=subprocess.check_output(['git','rev-parse','HEAD'],text=True,timeout=10).strip()
    report=validate(Path(sys.argv[1]).read_text(),head)
    message='NLI technical complete='+str(report['complete'])+'; NOT ACCEPTED. '+json.dumps(report['metrics'])
    print(message)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as out: out.write(message+'\n')
    if not report['complete']: raise SystemExit(2)
