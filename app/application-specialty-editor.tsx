'use client';
import {useId} from 'react';
import type {Application} from '../lib/db';
import {specialtyLabel,validSpecialty} from '../lib/application-specialty';
import {sameSpecialtyValue,type SpecialtyDraft} from '../lib/application-specialty-result';
import {specialtyCopy} from '../lib/i18n/application-specialty';
import type {UiLocale} from '../lib/i18n/locale';

export default function ApplicationSpecialtyEditor({application,draft,disabled,locale,onDraft,onSave}:{application:Application;draft?:SpecialtyDraft;disabled:boolean;locale:UiLocale;onDraft:(draft:SpecialtyDraft|null)=>void;onSave:(label:string)=>void}){
 const t=specialtyCopy[locale],hintId=useId(),label=specialtyLabel(application),raw=application.specialty;
 const legacy=Object.hasOwn(application,'specialty')&&!validSpecialty(raw);
 return <div>
  <label>{t.label}<input aria-describedby={hintId} maxLength={240} value={draft?.text??label??''} onChange={e=>onDraft({base:draft?draft.base:raw,text:e.target.value})}/></label>
  <p id={hintId} className="muted">{t.hint}</p>{legacy&&<p className="notice">{t.legacy}</p>}
  {raw!==undefined&&raw!==''&&!draft&&<button disabled={disabled} onClick={()=>onDraft({base:raw,text:''})}>{t.clear}</button>}
  {draft&&<><p>{t.unsaved}</p>{!sameSpecialtyValue(draft.base,raw)&&<p role="alert">{t.conflict}</p>}
   <p>{t.saved}: <strong>{label??t.unset}</strong></p>{!validSpecialty(draft.text)&&<p role="alert">{t.invalid}</p>}
   <button disabled={disabled||!validSpecialty(draft.text)||sameSpecialtyValue(draft.text,raw)} onClick={()=>onSave(draft.text)}>{t.save}</button>
   <button disabled={disabled} onClick={()=>onDraft(null)}>{t.cancel}</button>
  </>}
 </div>;
}
