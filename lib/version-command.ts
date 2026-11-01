import {z} from 'zod';
import type {Workspace} from './db';
import {UserError} from './errors';
import {parseVacancy,match,propose} from './engine';
import {matchMetadata} from './match-config';
import {WorkspaceCommandSchema} from './workspace-command';

const selection=z.array(z.string().min(1).max(105)).max(500)
 .refine(ids=>new Set(ids).size===ids.length,'Duplicate edit IDs');
/** Server evaluation is revision-bound; SQL constructs text/evidence/lifecycle from its locked state. */
export function prepareVersionCommand(state:Workspace,rawIds:unknown){
 if(!state.original||!state.vacancy)throw new UserError('Добавьте резюме и текст вакансии',400,'PROFILE_INPUT_REQUIRED');
 if(state.versions.length>=100)throw new UserError('Лимит 100 версий',400,'VERSION_LIMIT');
 const ids=selection.parse(rawIds),requirements=parseVacancy(state.vacancy),candidates=propose(state.facts,requirements);
 if(ids.some(id=>!candidates.some(edit=>edit.id===id)))throw new UserError('Правка устарела',400,'EDIT_STALE');
 const selected=candidates.filter(edit=>ids.includes(edit.id));
 const analysis=match(state.facts,requirements);
 return WorkspaceCommandSchema.parse({action:'version',evidence_ids:selected.flatMap(edit=>edit.evidence_ids),
  score:analysis.score,match_metadata:matchMetadata(analysis.rows)});
}
