'use client';
import {useEffect,useRef} from 'react';
import type {Application} from '../lib/db';
import {validSpecialty} from '../lib/application-specialty';
import {applicationsCopy} from '../lib/i18n/applications';
import type {UiLocale} from '../lib/i18n/locale';
import {sameSpecialtyBasis,specialtyBasis,specialtyText,type SpecialtyDraft} from './application-specialty-draft';
export default function ApplicationSpecialtyEditor({application,ownerId,draft,busy,locale,onDraft,onSave}:{application:Application;ownerId?:string;draft?:SpecialtyDraft;busy:boolean;locale:UiLocale;onDraft:(draft:SpecialtyDraft|null)=>void;onSave:()=>unknown}){
 const t=applicationsCopy[locale].specialty,editRef=useRef<HTMLButtonElement>(null),inputRef=useRef<HTMLInputElement>(null),wasEditing=useRef(false),restoreFocus=useRef(false);
 const editing=!!draft&&draft.ownerId===ownerId,basis=specialtyBasis(application),stale=!!draft&&!sameSpecialtyBasis(draft.base,basis),unknown=basis.present&&!validSpecialty(basis.value);
 useEffect(()=>{if(editing&&!wasEditing.current)inputRef.current?.focus();if(!editing&&wasEditing.current)restoreFocus.current=true;if(!editing&&!busy&&restoreFocus.current){editRef.current?.focus();restoreFocus.current=false;}wasEditing.current=editing;},[editing,busy]);
 return <div data-application-specialty=""><p>{t.label}: <span lang="">{specialtyText(application)||t.unclassified}</span></p>{unknown&&<p>{t.unknown}</p>}
 {!editing?<button ref={editRef} data-action="edit-application-specialty" disabled={busy||!ownerId} onClick={()=>{if(ownerId)onDraft({ownerId,base:basis,text:specialtyText(application)});}}>{t.edit}</button>:<>
 <label>{t.label}<input ref={inputRef} data-application-specialty-input="" aria-label={t.label} aria-invalid={!validSpecialty(draft.text)} lang="" maxLength={240} value={draft.text} onChange={e=>onDraft({...draft,text:e.target.value})}/></label>
 <p>{t.help}</p>{!validSpecialty(draft.text)&&<p role="alert">{t.invalid}</p>}{stale&&<p role="alert" data-specialty-conflict="">{t.conflict}</p>}
 <details><summary>{t.saved}</summary><pre lang="">{unknown?JSON.stringify(basis.value):specialtyText(application)||t.unclassified}</pre></details>
 {stale&&<button data-action="compare-application-specialty" disabled={busy} onClick={()=>onDraft({...draft,base:basis})}>{t.compare}</button>}
 <button data-action="clear-application-specialty" onClick={()=>onDraft({...draft,text:''})}>{t.clear}</button>
 <button data-action="save-application-specialty" disabled={busy||stale||!validSpecialty(draft.text)} onClick={onSave}>{t.save}</button>
 <button data-action="cancel-application-specialty" onClick={()=>onDraft(null)}>{t.cancel}</button>{busy&&<p>{t.pending}</p>}
 </>}
 </div>;
}
