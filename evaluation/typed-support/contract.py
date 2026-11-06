"""Three-arm diagnostic on frozen source-grounded formal claims, never production acceptance."""
import hashlib
import json
import math
from typed import assess

THRESHOLD=0.95
LABELS=['entailment','neutral','contradiction']
CORPUS_SHA='d15d9db68eb32fbdce74c62a01c082ce1fe52f16205660caf22de55e08847726'

def sha(raw):return hashlib.sha256(raw).hexdigest()

def load_cases(root):
    raw=(root/'corpus-v1.json').read_bytes()
    if sha(raw)!=CORPUS_SHA:raise ValueError('Unreviewed corpus')
    cases=json.loads(raw)
    if len(cases)!=42 or len({c['id'] for c in cases})!=42:raise ValueError('Frozen case identities required')
    for c in cases:
        if c['domain'] not in ('temporal','subject','quantity','out-of-grammar') or c['language'] not in ('ru','en') or type(c['expectedEntailment']) is not bool:
            raise ValueError('Invalid annotation')
        if not 0<len(c['premise'])<=10000 or not 0<len(c['hypothesis'])<=2000:raise ValueError('Invalid text')
        result=assess(c['premise'],c['hypothesis'])
        if result['representation']!=c['expectedRepresentation'] or result['decision']!=c['expectedDecision']:
            raise ValueError('Independent representation/decision mismatch: '+c['id'])
        if result['decision']=='allow' and not c['expectedEntailment']:
            raise ValueError('Unsafe typed contract before inference')
    return cases

def decisions(logits):
    if len(logits)!=3 or any(type(x) not in (float,int) or not math.isfinite(x) for x in logits):raise ValueError('Invalid logits')
    exps=[math.exp(x-max(logits)) for x in logits];scores=[x/sum(exps) for x in exps]
    return dict(scores=scores,argmax=LABELS[max(range(3),key=lambda i:logits[i])],supported=scores[0]>=THRESHOLD)

def summarize(cases,rows):
    by_id={r['id']:r for r in rows}
    if len(by_id)!=len(rows) or set(by_id)-{c['id'] for c in cases}:raise ValueError('Invalid rows')
    result={}
    for cohort in ('all','temporal','subject','quantity','out-of-grammar','ru','en'):
        selected=[c for c in cases if cohort=='all' or c['domain']==cohort or c['language']==cohort]
        stats=dict(total=len(selected),positives=sum(c['expectedEntailment'] for c in selected),
                   negatives=sum(not c['expectedEntailment'] for c in selected),physical=0,represented=0,
                   representationErrors=0,typedAbstained=0,typedVetoed=0,
                   arms={arm:dict(valid=0,trueSupported=0,falseSupported=0,abstained=0) for arm in ('nli','typed','hybrid')},
                   nliArgmaxFalseSupported=0,nliArgmaxTrueSupported=0)
        for c in selected:
            typed=assess(c['premise'],c['hypothesis'])
            represented=typed['representation']['status']=='represented'
            stats['represented']+=represented
            stats['representationErrors']+=typed['representation']!=c['expectedRepresentation']
            stats['typedAbstained']+=typed['decision']=='abstain';stats['typedVetoed']+=typed['decision']=='veto'
            row=by_id.get(c['id']);valid=bool(row and row.get('status')=='ok')
            stats['physical']+=valid
            nli=decisions(row['logits']) if valid else None
            if nli:
                stats['nliArgmaxTrueSupported' if c['expectedEntailment'] else 'nliArgmaxFalseSupported']+=nli['argmax']=='entailment'
            for arm in ('nli','typed','hybrid'):
                out=stats['arms'][arm]
                available=arm=='typed' or valid
                out['valid']+=available
                if not available or (arm!='nli' and typed['decision']=='abstain'):
                    out['abstained']+=1
                    continue
                support=(nli['supported'] if arm=='nli' else typed['decision']=='allow' if arm=='typed' else nli['supported'] and typed['decision']=='allow')
                out['trueSupported' if c['expectedEntailment'] else 'falseSupported']+=support
        result[cohort]=stats
    all_stats=result['all']
    result['preliminarySignal']=(all_stats['physical']==42 and all_stats['representationErrors']==0
       and all_stats['arms']['hybrid']['falseSupported']==0
       and sum(result[d]['arms']['hybrid']['trueSupported'] for d in ('temporal','subject','quantity'))>=15
       and all(result[d]['arms']['hybrid']['trueSupported']>=5 for d in ('temporal','subject','quantity'))
       and all(result[lang]['arms']['hybrid']['trueSupported']>=7 for lang in ('ru','en')))
    return result
