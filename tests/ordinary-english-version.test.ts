import {it,expect} from 'vitest';
import {renderVersion,propose,parseVacancy} from '../lib/engine';
import {prepareVersionCommand} from '../lib/version-command';
import {WorkspaceCommandSchema} from '../lib/workspace-command';
import {validateEnglishVersionResult} from '../lib/ordinary-version-result';
import {ORDINARY_TEMPLATE,ORDINARY_ENGLISH_TEMPLATE as EN,OrdinaryTemplateSchema} from '../lib/ordinary-template';
import {ordinaryState,ordinaryResult,ordinaryIds,ordinaryOwner} from './fixtures/ordinary-version';
it('freezes English headings and keeps source Unicode/numbers/quotes and selected ranking literal',()=>{
 const s=ordinaryState(),edits=propose(s.facts,parseVacancy(s.vacancy));
 expect(renderVersion(s.original,edits,s.facts,EN)).toBe('RELEVANT EXPERIENCE\nSQL\nPython\n\nPROFILE\nSYNTHETIC 😀\nRésumé — 42%');
 expect(renderVersion(s.original,edits,s.facts)).toBe('РЕЛЕВАНТНЫЙ ОПЫТ\nSQL\nPython\n\nПРОФИЛЬ\nSYNTHETIC 😀\nRésumé — 42%');
 expect(renderVersion(s.original,edits,s.facts,ORDINARY_TEMPLATE)).toBe(renderVersion(s.original,edits,s.facts));
 expect(renderVersion(s.original,[],s.facts,EN)).toBe(s.original);
});
it('retains the legacy untagged command and only records the exact English tag',()=>{
 const s=ordinaryState(),legacy=prepareVersionCommand(s,ordinaryIds);
 expect(prepareVersionCommand(s,ordinaryIds,ORDINARY_TEMPLATE)).toEqual(legacy);expect(legacy).not.toHaveProperty('template_version');
 expect(prepareVersionCommand(s,ordinaryIds,EN)).toEqual({...legacy,template_version:EN});
});
it.each(['en',null,'ordinary-literal-en-v2','ORDINARY-LITERAL-EN-V1',{}])('refuses unsupported template values %j',tag=>{
 expect(OrdinaryTemplateSchema.safeParse(tag).success).toBe(false);expect(()=>prepareVersionCommand(ordinaryState(),ordinaryIds,tag)).toThrow();
 const base=prepareVersionCommand(ordinaryState(),ordinaryIds);expect(WorkspaceCommandSchema.safeParse({...base,template_version:tag}).success).toBe(false);
});
it('accepts an exact owner/revision/source-bound acknowledgement while preserving legacy extra metadata',()=>{
 const s=ordinaryState(),copy=structuredClone(s),next=ordinaryResult(s);
 expect(validateEnglishVersionResult(next,s,ordinaryIds,ordinaryOwner)).toEqual(next);expect(s).toEqual(copy);expect(next.versions[0]).not.toHaveProperty('template_version');
 const reordered=Object.fromEntries(Object.entries(next).reverse());expect(validateEnglishVersionResult(reordered,s,ordinaryIds,ordinaryOwner)).toEqual(next);
});
it.each(['template','text','source','fact','oldVersion','revision','score','evidence','snapshot','metadata','id','created','restored','extra','owner','vacancy','goal','applications'])('rejects a successful English write with altered %s before installation',field=>{
 const s=ordinaryState(),next=ordinaryResult(s),v=next.versions.at(-1)!;
 if(field==='template')v.template_version=ORDINARY_TEMPLATE;
 if(field==='text')v.text+=' 5 years';
 if(field==='source')next.original+=' private altered';
 if(field==='fact')next.facts[0].text='Changed';
 if(field==='oldVersion')next.versions[0].text='Changed';
 if(field==='revision')next.revision++;
 if(field==='score')v.score=0;
 if(field==='evidence')v.evidence_ids.reverse();
 if(field==='snapshot')v.evidence_snapshot=[];
 if(field==='metadata')v.match_metadata=undefined;
 if(field==='id')v.id='legacy-v';
 if(field==='created')v.created='2026-10-30';
 if(field==='restored')v.restored_from='legacy-v';
 if(field==='extra')Object.assign(v,{unverifiedField:'forged'});
 if(field==='owner')next.ownerId='22222222-2222-4222-8222-222222222222';
 if(field==='vacancy')next.vacancy='Changed';
 if(field==='goal')next.goal='Changed';
 if(field==='applications')next.applications.push({id:'forged',title:'forged',status:'Планируется',note:'',created:'2026-10-30',events:[]});
 expect(()=>validateEnglishVersionResult(next,s,ordinaryIds,ordinaryOwner)).toThrow();
});
it('does not infer a template for history or allow risky/unconfirmed selection to be restored as a new English write',()=>{
 const s=ordinaryState();s.facts[0].verified=false;expect(()=>prepareVersionCommand(s,ordinaryIds,EN)).toThrow();
 s.facts[0].verified=true;s.facts[0].text='Never used Python';expect(()=>prepareVersionCommand(s,ordinaryIds,EN)).toThrow();
});
