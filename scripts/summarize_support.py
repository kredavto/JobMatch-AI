"""Report bounded counters, not model-provided strings. No model acceptance."""
import json
import os
import sys
from pathlib import Path

def main():
    raw=Path(sys.argv[1]).read_bytes()
    if len(raw)>4_000_000: raise ValueError('Oversized report')
    lines=[l for l in raw.decode('utf8').splitlines() if l.startswith('JOBMATCH_SUPPORT_VERIFIER_V1 ')]
    if len(lines)!=1: raise ValueError('No complete report')
    r=json.loads(lines[0].split(' ',1)[1])
    if r['acceptance']!='not-accepted' or r['planned']!=24 or r['nonSupportedTotal']!=18 or r['supportedTotal']!=6: raise ValueError('Wrong contract')
    limits={'completed':24,'backendResponses':24,'validOutputs':24,'parsedOutputs':24,'supportedVerdictProposals':6,'falseSupported':18,'admittedFalseSupported':18,'supportedSuccess':6,'exactVerdictMatches':24}
    for k,limit in limits.items():
        if type(r[k]) is not int or not 0<=r[k]<=limit: raise ValueError('Counter')
    if not r['admittedFalseSupported']<=r['falseSupported'] or not r['supportedSuccess']<=r['supportedVerdictProposals']<=6 or not r['supportedSuccess']<=r['validOutputs']<=r['completed']: raise ValueError('Inconsistent counters')
    summary='## Experimental support classifier — NOT ACCEPTED\n\n'
    for k in limits: summary+=f'- {k}: {r[k]}\n'
    summary+='\nFalse-supported counts parsed supported proposals even when citation validation later rejects them. Green means complete diagnostic execution, not semantic or deployment acceptance.\n'
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf8') as f:f.write(summary)
if __name__=='__main__':main()
