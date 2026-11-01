import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import AuthPanel from '../../app/auth-panel';
import ConfirmationForm from '../../app/confirm-email/confirmation-form';
import RecoveryForm from '../../app/recover/recovery-form';
import {requestJson,RequestError,validatedAuthAck} from '../../lib/client-api';
import {normalizeLocale,type UiLocale} from '../../lib/i18n/locale';
import '../../app/globals.css';
/** Synthetic parent for the real controlled view; real Root adoption is tested in Next E2E. */
function AuthHarness({locale}:{locale:UiLocale}){
 const [register,setRegister]=useState(true),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<RequestError|null>(null),[confirmation,setConfirmation]=useState(false);
 async function submit(){setBusy(true);setError(null);setConfirmation(false);try{const ack=validatedAuthAck(await requestJson('/api/service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:register?'register':'login',email,password,consent})}),register);if('confirmationRequired' in ack){setConsent(false);setConfirmation(true);setRegister(false);}}catch(value){setError(value instanceof RequestError?value:new RequestError('Request failed',502,'CLIENT_REQUEST_FAILED'));}finally{setPassword('');setBusy(false);}}
 return <AuthPanel locale={locale} register={register} email={email} password={password} consent={consent} busy={busy} error={error} confirmationRequested={confirmation} onEmail={setEmail} onPassword={setPassword} onConsent={setConsent} onRegister={setRegister} onContextChange={()=>{setError(null);setConfirmation(false);}} onSubmit={submit}/>;
}
function Fixture(){
 const [query]=useState(()=>new URLSearchParams(location.search)),[locale,setLocale]=useState<UiLocale>(()=>normalizeLocale(new URLSearchParams(location.search).get('locale'))),[visible,setVisible]=useState(true);
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 return <><div><label htmlFor="auth-fixture-language">Fixture language</label><select id="auth-fixture-language" value={locale} onChange={event=>setLocale(event.target.value as UiLocale)}><option value="ru">Русский</option><option value="en">English</option></select><button type="button" onClick={()=>setLocale(value=>value==='ru'?'en':'ru')}>Switch test locale</button><button type="button" onClick={()=>setVisible(false)}>Leave test form</button></div>{visible&&(query.get('view')==='auth'?<AuthHarness locale={locale}/>:<main id="main-content" className="content">{query.get('view')==='confirmation'?<ConfirmationForm locale={locale}/>:<RecoveryForm locale={locale} initialCode={query.get('code')||''} invalid={query.has('invalid')}/>}</main>)}</>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
