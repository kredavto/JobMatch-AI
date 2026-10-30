import type {Workspace,Version} from '../../lib/db';
import {prepareVersionCommand} from '../../lib/version-command';
import {parseVacancy,propose,renderVersion} from '../../lib/engine';
import {ORDINARY_ENGLISH_TEMPLATE} from '../../lib/ordinary-template';
export const ordinaryOwner='11111111-1111-4111-8111-111111111111';
export const ordinaryIds=['edit-sql','edit-py'];
export function ordinaryState():Workspace{
 const legacy={id:'legacy-v',created:'2026-10-28',text:'OLD RUSSIAN BYTES',vacancy:'old vacancy',evidence_ids:[],score:70,future:{keep:true}};
 return {ownerId:ordinaryOwner,revision:7,original:'SYNTHETIC 😀\r\n SQL \r\nPython\r\nRésumé — 42%',vacancy:'Must-have:\nSQL\nNice-to-have:\nPython',goal:'',
  facts:[{id:'py',text:'Python',source:'fixture',verified:true},{id:'sql',text:'SQL',source:'fixture',verified:true}],versions:[legacy],applications:[]};
}
export function ordinaryResult(previous=ordinaryState(),ids=ordinaryIds):Workspace{
 previous=structuredClone(previous);
 const command=prepareVersionCommand(previous,ids,ORDINARY_ENGLISH_TEMPLATE);
 const edits=propose(previous.facts,parseVacancy(previous.vacancy)).filter(edit=>command.evidence_ids.includes(edit.evidence_ids[0]));
 const version:Version={id:'33333333-3333-4333-8333-333333333333',created:'2026-10-30T00:00:00.000Z',
  text:renderVersion(previous.original,edits,previous.facts,ORDINARY_ENGLISH_TEMPLATE),vacancy:previous.vacancy,
  evidence_ids:command.evidence_ids,evidence_snapshot:previous.facts.filter(fact=>command.evidence_ids.includes(fact.id)),
  score:command.score,match_metadata:command.match_metadata,profile_revision:previous.revision,engine_version:'rules-v1',template_version:ORDINARY_ENGLISH_TEMPLATE};
 return {...previous,revision:previous.revision+1,versions:[...previous.versions,version]};
}
