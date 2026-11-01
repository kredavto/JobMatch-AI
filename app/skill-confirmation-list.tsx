'use client';
import {useRef,useState} from 'react';
import type {Fact} from '../lib/engine';
import {profileCopy} from '../lib/i18n/profile';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
/** Bulk selection is a local draft, never an independent verification. */
export default function SkillConfirmationList({locale='ru',facts,disabled,onConfirm}:{locale?:UiLocale;facts:Fact[];disabled:boolean;onConfirm:(ids:string[],verified:boolean)=>Promise<boolean>}){
 const t=profileCopy[normalizeLocale(locale)];
 const [selection,setSelection]=useState<Fact[]|null>(null),[working,setWorking]=useState(false),pending=useRef(false);
 const eligible=facts.filter(f=>!f.verified),selected=eligible.filter(f=>selection?.some(s=>s.id===f.id&&s.text===f.text&&s.source===f.source));
 const all=eligible.length>0&&selected.length===eligible.length,partial=selected.length>0&&!all,blocked=disabled||working;
 async function confirm(ids:string[],verified:boolean){if(disabled||pending.current)return;pending.current=true;setWorking(true);try{if(await onConfirm(ids,verified))setSelection(null);}finally{pending.current=false;setWorking(false);}}
 return <><label className="check"><input type="checkbox" checked={all} aria-checked={partial?'mixed':all} ref={node=>{if(node)node.indeterminate=partial;}} disabled={blocked||!eligible.length} onChange={e=>setSelection(e.target.checked?eligible:[])}/>{t.bulkAll}</label><p className="muted">{t.bulkHelp}</p>{selection!==null&&<div className="actions"><button className="primary" disabled={blocked||!selected.length} onClick={()=>void confirm(selected.map(f=>f.id),true)}>{t.bulkSave}</button><button disabled={blocked} onClick={()=>setSelection(null)}>{t.bulkCancel}</button></div>}{facts.map(f=><label className="fact" key={f.id}><input type="checkbox" checked={f.verified||selected.some(s=>s.id===f.id)} disabled={blocked||(selection!==null&&f.verified)} onChange={e=>{const verified=e.target.checked;if(selection!==null){setSelection(current=>verified?[...(current||[]).filter(s=>s.id!==f.id),f]:(current||[]).filter(s=>s.id!==f.id));return;}void confirm([f.id],verified);}}/><span lang="">{f.text}<small>{f.id} · {f.source} · {f.verified?'verified':'unverified'}</small></span></label>)}</>;
}
