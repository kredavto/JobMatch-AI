import {z} from 'zod';
import type {Workspace} from './db';
import {WorkspaceSchema} from './workspace-schema';
import {parseVacancy,propose,renderVersion} from './engine';
import {prepareVersionCommand} from './version-command';
import {ORDINARY_ENGLISH_TEMPLATE} from './ordinary-template';
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
const equal=(a:unknown,b:unknown)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
/** Bind a new English version acknowledgement to the submitted saved source, not the current draft. */
export function validateEnglishVersionResult(raw:unknown,previous:Workspace,rawIds:unknown,owner:string):Workspace{
 const next=WorkspaceSchema.parse(raw),command=prepareVersionCommand(previous,rawIds,ORDINARY_ENGLISH_TEMPLATE);
 if(previous.ownerId!==owner||next.ownerId!==owner||next.versions.length!==previous.versions.length+1)throw Error('VERSION_RESULT');
 const version=next.versions.at(-1)!;
 z.uuid().parse(version.id);z.iso.datetime().parse(version.created);
 if(previous.versions.some(row=>row.id===version.id))throw Error('VERSION_RESULT');
 const candidates=propose(previous.facts,parseVacancy(previous.vacancy)).filter(edit=>command.evidence_ids.includes(edit.evidence_ids[0]));
 const expectedVersion={id:version.id,created:version.created,text:renderVersion(previous.original,candidates,previous.facts,ORDINARY_ENGLISH_TEMPLATE),
  vacancy:previous.vacancy,evidence_ids:command.evidence_ids,evidence_snapshot:previous.facts.filter(fact=>command.evidence_ids.includes(fact.id)),
  profile_revision:previous.revision,engine_version:'rules-v1',score:command.score,match_metadata:command.match_metadata,template_version:ORDINARY_ENGLISH_TEMPLATE};
 const expected={...previous,revision:previous.revision+1,versions:[...previous.versions,expectedVersion]};
 if(!equal(next,expected))throw Error('VERSION_RESULT');
 return next;
}
