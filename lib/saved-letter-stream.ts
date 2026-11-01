import {SavedLettersStateSchema,validateSavedLetterVersion} from './saved-letter';
/** Immutable initial-list export; cancellation/errors never fabricate a complete footer. */
export function savedLetterStream(value:unknown,read:(id:string)=>Promise<unknown>,signal?:AbortSignal){
 const state=SavedLettersStateSchema.parse(value),encoder=new TextEncoder();let index=0,started=false,stopped=false;
 const encode=(data:unknown)=>encoder.encode(JSON.stringify(data)+'\n');
 return new ReadableStream<Uint8Array>({
  async pull(controller){
   if(stopped)return;if(signal?.aborted){stopped=true;controller.close();return;}
   try{
    if(!started){started=true;controller.enqueue(encode({format:'jobmatch-saved-letters-export-v1',ownerId:state.ownerId,through:state.revision,scope:'initial-version-list',exportedAt:new Date().toISOString()}));return;}
    if(index===state.items.length){stopped=true;controller.enqueue(encode({complete:true,count:index,through:state.revision}));controller.close();return;}
    const item=state.items[index],row=await validateSavedLetterVersion(await read(item.id),state.ownerId);
    if(stopped)return;if(signal?.aborted){stopped=true;controller.close();return;}
    if(row.id!==item.id||row.version!==item.version||row.created!==item.created||row.payloadSha256!==item.payloadSha256)throw Error();
    index++;controller.enqueue(encode(row));
   }catch{if(!stopped){stopped=true;controller.enqueue(encode({complete:false,count:index,through:state.revision,error:'EXPORT_INCOMPLETE'}));controller.close();}}
  },cancel(){stopped=true;}
 });
}
