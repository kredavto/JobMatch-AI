"""One bounded offline CPU forward per frozen synthetic pair. Never production acceptance."""
import importlib.metadata
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import resource
import signal
import sys
import time
from contract import sha, load_cases, decisions, summarize, LABELS

ROOT = Path('/app')
HERE = ROOT / 'evaluation/nli'
MODEL = Path('/model')

def verified_files(pin):
    for name, spec in pin['files'].items():
        path = MODEL / name
        if path.is_symlink() or path.stat().st_size != spec['bytes']:
            raise ValueError('Immutable file verification failed')
        digest=hashlib.sha256()
        with path.open('rb') as source:
            for chunk in iter(lambda:source.read(1024*1024),b''):
                digest.update(chunk)
        if digest.hexdigest() != spec['sha256']:
            raise ValueError('Immutable file verification failed')

def approved():
    return all(os.environ.get(k) == v for k, v in {
        'CI':'true', 'GITHUB_ACTIONS':'true', 'JOBMATCH_AI_CPU_DIAGNOSTIC':'true',
        'GITHUB_REPOSITORY':'kredavto/JobMatch-AI', 'JOBMATCH_REPOSITORY_VISIBILITY':'public',
        'HF_HUB_OFFLINE':'1', 'TRANSFORMERS_OFFLINE':'1'}.items())

class BudgetStop(Exception):
    pass

def stop_signal(signum, frame):
    raise BudgetStop('Runtime budget reached')

def main():
    if not approved() or not re.fullmatch('[a-f0-9]{40}', os.environ.get('JOBMATCH_EVAL_HEAD','')):
        raise ValueError('CI-only diagnostic')
    if not re.fullmatch('sha256:[a-f0-9]{64}', os.environ.get('JOBMATCH_AI_CPU_IMAGE_ID','')):
        raise ValueError('Image identity required')
    signal.signal(signal.SIGALRM, stop_signal)
    signal.signal(signal.SIGTERM, stop_signal)
    signal.alarm(600)
    start = time.time()
    pin = json.loads((HERE / 'model.json').read_text())
    if sha((HERE / 'model.json').read_bytes()) != '4bd194517aa2b9b88092e9f9374ea14ba2b504c6398e10d4babb45a2f4d2f459':
        raise ValueError('Unreviewed model')
    verified_files(pin)
    cases = load_cases(HERE)
    rows = []
    import torch
    from transformers import AutoTokenizer, DebertaV2ForSequenceClassification
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    torch.manual_seed(42)
    tokenizer = AutoTokenizer.from_pretrained(MODEL, local_files_only=True, trust_remote_code=False, use_fast=True)
    if not tokenizer.is_fast:
        raise ValueError('Fast pinned tokenizer required; no fallback')
    model = DebertaV2ForSequenceClassification.from_pretrained(MODEL, local_files_only=True,
                    use_safetensors=True, dtype=torch.float32).to('cpu').eval()
    if [model.config.id2label[i] for i in range(3)] != LABELS or model.config.max_position_embeddings != 512:
        raise ValueError('Unreviewed label order or context')
    if any(p.dtype != torch.float32 for p in model.parameters()):
        raise ValueError('Unexpected parameter dtype')
    for c in cases:
        row = dict(id=c['id'], cohort=c['cohort'], language=c['language'],
                   premise=c['premise'], hypothesis=c['hypothesis'], status='error')
        t = time.monotonic()
        try:
            inputs = tokenizer(c['premise'], c['hypothesis'], truncation=False, return_tensors='pt')
            row['inputTokens'] = int(inputs['input_ids'].shape[1])
            if row['inputTokens'] > 512:
                row['status'] = 'overlength'
            else:
                with torch.inference_mode():
                    logits = model(**inputs).logits[0].tolist()
                row.update(logits=logits, **decisions(logits), status='ok')
        except BudgetStop:
            row['errorType'] = 'BudgetStop'
            row['elapsedMs'] = round((time.monotonic()-t)*1000)
            rows.append(row)
            print('JOBMATCH_NLI_ROW_V1 '+json.dumps(row,ensure_ascii=False,separators=(',',':')),flush=True)
            break
        except Exception as error:
            row['errorType'] = type(error).__name__  # No arbitrary external diagnostics
        row['elapsedMs'] = round((time.monotonic()-t)*1000)
        rows.append(row)
        print('JOBMATCH_NLI_ROW_V1 '+json.dumps(row,ensure_ascii=False,separators=(',',':')),flush=True)
    signal.alarm(5)  # Bounded final evidence flush; external timeout still authoritative.
    verified_files(pin)
    stats = summarize(cases, rows)
    files = ['model.json','contract.py','run.py','replay-v1.json','challenge-v1.json','Dockerfile']
    report = dict(format='jobmatch-nli-diagnostic-v1', acceptance='not-accepted',
        complete=all(r['status']=='ok' for r in rows) and len(rows)==36,
        model=pin, weightsFilesVerified=True, modelIdentityVerified=False, deploymentIdentityVerified=False,
        head=os.environ['JOBMATCH_EVAL_HEAD'], image=os.environ.get('JOBMATCH_AI_CPU_IMAGE_ID'),
        startedAt=start, finishedAt=time.time(), threshold=0.95,
        sourceHashes={f:sha((HERE/f).read_bytes()) for f in files},
        runtime=dict(python=platform.python_version(), torch=torch.__version__,
                     transformers=importlib.metadata.version('transformers'),
                     tokenizers=importlib.metadata.version('tokenizers'),
                     safetensors=importlib.metadata.version('safetensors'),
                     dtype='float32', threads=4, tokenizerClass=type(tokenizer).__name__, tokenizerFast=tokenizer.is_fast, peakRssKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss),
        metrics=stats, rows=rows)
    print('JOBMATCH_NLI_DIAGNOSTIC_V1 '+json.dumps(report, ensure_ascii=False, separators=(',',':')), flush=True)
    signal.alarm(0)
    return 0 if report['complete'] else 2

if __name__ == '__main__':
    raise SystemExit(main())
