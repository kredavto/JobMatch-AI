"""Frozen diagnostic contract. No app imports or production integration."""
import hashlib
import json
import math
from pathlib import Path

THRESHOLD = 0.95
LABELS = ['entailment', 'neutral', 'contradiction']

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def load_cases(root):
    for name, expected in {'replay-v1.json':'c4e0b886e5289f327d9c2c1f605a981fa63221664c8fdb5bb0483ec2759416b3', 'challenge-v1.json':'2e3367a7f576ec53ebe41b5b8957c35acab4b93e1757beae6d8744ba141deba4'}.items():
        if sha((root/name).read_bytes()) != expected:
            raise ValueError('Unreviewed corpus')
    replay = json.loads((root / 'replay-v1.json').read_text())
    challenge = json.loads((root / 'challenge-v1.json').read_text())
    if len(replay) != 24 or len(challenge) != 12:
        raise ValueError('Frozen case counts required')
    cases = []
    for case in replay:
        cases.append(dict(id=case['id'], language=case['language'], cohort='replay',
                          premise='\n'.join(f['text'] for f in case['facts']),
                          hypothesis=case['requirement'],
                          expectedEntailment=case['expectedVerdict'] == 'supported'))
    for case in challenge:
        cases.append({**{k: case[k] for k in ['id', 'language', 'premise', 'hypothesis', 'expectedEntailment']},
                      'cohort': 'challenge'})
    if len({c['id'] for c in cases}) != 36:
        raise ValueError('Duplicate case IDs')
    for c in cases:
        if c['language'] not in ('ru', 'en') or type(c['expectedEntailment']) is not bool:
            raise ValueError('Invalid annotation')
        for field in ('premise', 'hypothesis'):
            if not isinstance(c[field], str) or not 1 <= len(c[field]) <= 10000:
                raise ValueError('Invalid text')
            c[field].encode('utf-8', errors='strict')
    return cases

def decisions(logits):
    if len(logits) != 3 or any(type(x) not in (float, int) or not math.isfinite(x) for x in logits):
        raise ValueError('Invalid actual logits')
    exps = [math.exp(x - max(logits)) for x in logits]
    scores = [x / sum(exps) for x in exps]
    return dict(scores=scores, argmax=LABELS[max(range(3), key=lambda i: logits[i])],
                supported=scores[0] >= THRESHOLD)

def summarize(cases, rows):
    by_id = {r['id']: r for r in rows}
    if len(by_id) != len(rows) or set(by_id) - {c['id'] for c in cases}:
        raise ValueError('Invalid row identity')
    result = {}
    for cohort in ('replay', 'challenge'):
        selected = [c for c in cases if c['cohort'] == cohort]
        out = dict(total=len(selected), valid=0, positives=sum(c['expectedEntailment'] for c in selected),
                   negatives=sum(not c['expectedEntailment'] for c in selected),
                   falseSupported=0, trueSupported=0, argmaxFalseSupported=0, argmaxTrueSupported=0,
                   language={lang: dict(positives=0, trueSupported=0, falseSupported=0) for lang in ('ru', 'en')})
        for c in selected:
            lang = out['language'][c['language']]
            lang['positives'] += c['expectedEntailment']
            row = by_id.get(c['id'])
            if not row or row.get('status') != 'ok':
                continue
            d = decisions(row['logits'])
            out['valid'] += 1
            name = 'trueSupported' if c['expectedEntailment'] else 'falseSupported'
            out[name] += d['supported']
            lang[name] += d['supported']
            out['argmaxTrueSupported' if c['expectedEntailment'] else 'argmaxFalseSupported'] += d['argmax'] == 'entailment'
        out['preliminarySignal'] = (out['valid'] == out['total'] and out['falseSupported'] == 0
                                    and out['trueSupported'] >= 5
                                    and all(v['trueSupported'] >= 2 for v in out['language'].values()))
        result[cohort] = out
    return result
