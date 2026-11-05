import {z} from 'zod';
import type {Workspace} from './db';
import {WorkspaceSchema} from './workspace-schema';
import {parseVacancy,propose,renderVersion} from './engine';
import {prepareVersionCommand} from './version-command';
import {ORDINARY_ENGLISH_TEMPLATE,ORDINARY_TEMPLATE,type OrdinaryTemplate} from './ordinary-template';
import {sameJson} from './application-write-response';
/** Bind a new literal version acknowledgement to the submitted saved source, not the current draft. */
export function validateOrdinaryVersionResult(raw:unknown,previous:Workspace,rawIds:unknown,owner:string,template:OrdinaryTemplate=ORDINARY_TEMPLATE):Workspace{
 const next=WorkspaceSchema.parse(raw),command=prepareVersionCommand(previous,rawIds,template);
 if(previous.ownerId!==owner||next.ownerId!==owner||next.versions.length!==previous.versions.length+1)throw Error('VERSION_RESULT');
 const version=next.versions.at(-1)!;
 z.uuid().parse(version.id);z.iso.datetime().parse(version.created);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(version.id)||version.created!==new Date(version.created).toISOString())throw Error('VERSION_RESULT');
 if(previous.versions.some(row=>row.id===version.id))throw Error('VERSION_RESULT');
 const candidates=propose(previous.facts,parseVacancy(previous.vacancy)).filter(edit=>command.evidence_ids.includes(edit.evidence_ids[0]));
 const expectedVersion={id:version.id,created:version.created,text:renderVersion(previous.original,candidates,previous.facts,template),
  vacancy:previous.vacancy,evidence_ids:command.evidence_ids,evidence_snapshot:previous.facts.filter(fact=>command.evidence_ids.includes(fact.id)),
  profile_revision:previous.revision,engine_version:'rules-v1',score:command.score,match_metadata:command.match_metadata,...(template===ORDINARY_ENGLISH_TEMPLATE?{template_version:ORDINARY_ENGLISH_TEMPLATE}:{})};
 const expected={...previous,revision:previous.revision+1,versions:[...previous.versions,expectedVersion]};
 if(!sameJson(next,expected))throw Error('VERSION_RESULT');
 return next;
}

export function validateEnglishVersionResult(raw:unknown,previous:Workspace,rawIds:unknown,owner:string){return validateOrdinaryVersionResult(raw,previous,rawIds,owner,ORDINARY_ENGLISH_TEMPLATE);}
