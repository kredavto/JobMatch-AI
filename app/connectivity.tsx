'use client';
import {ui} from '../lib/i18n';
import {useEffect,useSyncExternalStore} from 'react';
function subscribe(callback:()=>void){window.addEventListener('online',callback);window.addEventListener('offline',callback);return()=>{window.removeEventListener('online',callback);window.removeEventListener('offline',callback);};}
export default function Connectivity(){
 const online=useSyncExternalStore(subscribe,()=>navigator.onLine,()=>true);
 useEffect(()=>{if('serviceWorker' in navigator&&process.env.NODE_ENV==='production'){void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Online app remains usable when the browser disallows service workers. */});}},[]);
 return online?null:<div className="connection-banner" role="status" aria-live="polite">{ui.common.offline}</div>;
}
