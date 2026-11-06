"""Narrow complete-text grammar plus arithmetic veto; not a general semantic verifier."""
import re

ACTOR = r'(?P<actor>Person-A|Person-B|Company|Кандидат-А|Кандидат-Б|Компания)'
ROLE = r'«(?P<role>[A-Za-zА-Яа-яЁё](?:[A-Za-zА-Яа-яЁё -]{0,48}[A-Za-zА-Яа-яЁё])?)»'
UNIT = r'«(?P<unit>[A-Za-zА-Яа-яЁё](?:[A-Za-zА-Яа-яЁё -]{0,48}[A-Za-zА-Яа-яЁё])?)»'
YEAR = r'(?P<year>[12][0-9]{3})'
START = r'(?P<start>[12][0-9]{3})'
END = r'(?P<end>[12][0-9]{3})'
COUNT = r'(?P<count>0|[1-9][0-9]{0,5})'
DURATION = r'(?P<duration>[1-9][0-9]?)'

SOURCE_PATTERNS = [
 ('interval','en',ACTOR+r' worked continuously in role '+ROLE+r' from the start of '+START+r' to the start of '+END+r'\.'),
 ('interval','ru',ACTOR+r' непрерывно работал в роли '+ROLE+r' с начала '+START+r' года до начала '+END+r' года\.'),
 ('event','en',ACTOR+r' performed one task in role '+ROLE+r' in '+YEAR+r'\.'),
 ('event','ru',ACTOR+r' выполнил одну задачу в роли '+ROLE+r' в '+YEAR+r' году\.'),
 ('quantity','en',ACTOR+r' personally completed exactly '+COUNT+r' items of type '+UNIT+r' during all of '+YEAR+r'\.'),
 ('quantity','ru',ACTOR+r' лично выполнил ровно '+COUNT+r' единиц типа '+UNIT+r' за весь '+YEAR+r' год\.'),
]
CLAIM_PATTERNS = [
 ('duration','en',ACTOR+r' has at least '+DURATION+r' full years of continuous work in role '+ROLE+r'\.'),
 ('duration','ru',ACTOR+r' имеет не менее '+DURATION+r' полных лет непрерывной работы в роли '+ROLE+r'\.'),
 ('quantity','en',ACTOR+r' personally completed at least '+COUNT+r' items of type '+UNIT+r' in '+YEAR+r'\.'),
 ('quantity','ru',ACTOR+r' лично выполнил не менее '+COUNT+r' единиц типа '+UNIT+r' в '+YEAR+r' году\.'),
]

def parse_clause(text, patterns, offset=0):
    for kind, language, pattern in patterns:
        match = re.fullmatch(pattern,text)
        if not match:
            continue
        values=match.groupdict()
        spans={key:dict(start=offset+match.start(key),end=offset+match.end(key),quote=match.group(key)) for key in values}
        for field in ('start','end','year','count','duration'):
            if field in values:
                values[field]=int(values[field])
        if any(not 1900<=values[k]<=2100 for k in ('start','end','year') if k in values):
            return None
        if kind=='interval' and values['start']>=values['end']:
            return None
        if 'count' in values and values['count']>100000:
            return None
        return dict(kind=kind,language=language,values=values,spans=spans,
                    span=dict(start=offset,end=offset+len(text),quote=text))
    return None

def representation(premise,hypothesis):
    if not isinstance(premise,str) or not isinstance(hypothesis,str) or not 0<len(premise)<=10000 or not 0<len(hypothesis)<=2000:
        return dict(status='unrepresented',reason='shape')
    lines=premise.split('\n')
    if not 1<=len(lines)<=4:
        return dict(status='unrepresented',reason='line-count')
    records=[];offset=0
    for line in lines:
        record=parse_clause(line,SOURCE_PATTERNS,offset)
        if record is None:
            return dict(status='unrepresented',reason='unmatched-source')
        records.append(record);offset+=len(line)+1
    claim=parse_clause(hypothesis,CLAIM_PATTERNS)
    if claim is None:
        return dict(status='unrepresented',reason='unmatched-claim')
    if any(r['language']!=claim['language'] for r in records):
        return dict(status='unrepresented',reason='mixed-language')
    return dict(status='represented',records=records,claim=claim)

def longest_continuous(intervals):
    """Years use [start,end); union overlapping/touching intervals, never sum gaps."""
    if not intervals:return 0
    ordered=sorted(intervals)
    start,end=ordered[0];longest=0
    for a,b in ordered[1:]:
        if a<=end:end=max(end,b)
        else:longest=max(longest,end-start);start,end=a,b
    return max(longest,end-start)

def assess(premise,hypothesis):
    rep=representation(premise,hypothesis)
    if rep['status']!='represented':
        return dict(representation=rep,decision='abstain',reason='unrepresented')
    claim=rep['claim'];c=claim['values'];records=rep['records']
    if claim['kind']=='duration':
        intervals=[(r['values']['start'],r['values']['end']) for r in records
                   if r['kind']=='interval' and r['values']['actor']==c['actor'] and r['values']['role']==c['role']]
        maximum=longest_continuous(intervals)
        return dict(representation=rep,decision='allow' if maximum>=c['duration'] else 'veto',
                    reason='explicit-interval-union' if maximum>=c['duration'] else 'no-sufficient-continuous-interval',
                    longestYears=maximum)
    matching=[r['values']['count'] for r in records if r['kind']=='quantity'
              and all(r['values'][key]==c[key] for key in ('actor','unit','year'))]
    if not matching:
        return dict(representation=rep,decision='veto',reason='no-matching-personal-count')
    if len(set(matching))!=1:
        return dict(representation=rep,decision='abstain',reason='conflicting-exact-counts')
    supported=matching[0]>=c['count']
    return dict(representation=rep,decision='allow' if supported else 'veto',
                reason='explicit-personal-lower-bound' if supported else 'insufficient-exact-count',
                exactCount=matching[0])
