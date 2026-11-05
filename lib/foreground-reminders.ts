import {RemindersStateSchema,type RemindersState} from './persisted-reminders';
import {sameJson} from './application-write-response';
export const FOREGROUND_INTERVAL=30000;
export const FOREGROUND_GRACE=300000;
export type ForegroundKey={key:string;dueAt:number};
/** A bounded in-memory attempted-show ledger; never an assertion of OS delivery. */
export class ForegroundReminderWindow{
 private readonly seen=new Map<string,number>();
 private lastNow:number;
 constructor(readonly ownerId:string,readonly startedAt:number){if(!Number.isFinite(startedAt))throw Error('Invalid start');this.lastNow=startedAt;}
 read(raw:unknown,previous:RemindersState|null){
  const state=RemindersStateSchema.parse(raw);
  if(state.ownerId!==this.ownerId||previous&&(state.revision<previous.revision||state.revision===previous.revision&&!sameJson(state,previous)))throw Error('Invalid current reminder read');
  return state;
 }
 due(state:RemindersState,now:number):ForegroundKey[]{
  if(state.ownerId!==this.ownerId||!Number.isFinite(now)||now<this.lastNow)throw Error('Invalid clock/context');
  this.lastNow=now;
  for(const [key,stamp] of this.seen)if(stamp<now-FOREGROUND_GRACE*2)this.seen.delete(key);
  const keys=state.items.filter(r=>r.status==='scheduled').map(r=>({key:r.id+'|'+r.dueAt,dueAt:Date.parse(r.dueAt)})).filter(r=>r.dueAt>=this.startedAt&&r.dueAt<=now&&r.dueAt>=now-FOREGROUND_GRACE&&!this.seen.has(r.key));
  if(this.seen.size+keys.length>1000)throw Error('Foreground ledger limit');return keys;
 }
 attempted(keys:ForegroundKey[],now:number){if(!Number.isFinite(now)||now<this.lastNow||keys.length>100||new Set([...this.seen.keys(),...keys.map(row=>row.key)]).size>1000)throw Error('Invalid attempt ledger');for(const row of keys)this.seen.set(row.key,now);}
 currentKeys(state:RemindersState){return new Set(state.items.filter(r=>r.status==='scheduled').map(r=>r.id+'|'+r.dueAt));}
}
