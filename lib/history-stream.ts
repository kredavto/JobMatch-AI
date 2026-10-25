import type {validateHistoryPage} from './history-schema';
type Page=ReturnType<typeof validateHistoryPage>;
export const historyExportLimits={rows:5000,bytes:50*1024*1024};
/** One record per pull; no full archive buffering. Cancellation prevents further page fetches. */
export function historyStream(first:Page,read:(cursor:number)=>Promise<Page>,limits=historyExportLimits){
 let page=first,index=0,rows=0,bytes=0,cancelled=false;
 const encoder=new TextEncoder();
 const line=(data:unknown)=>encoder.encode(JSON.stringify(data)+'\n');
 return new ReadableStream<Uint8Array>({
  async pull(controller){
   if(cancelled)return;
   try{
    if(index===page.rows.length){
     if(page.next===null){controller.enqueue(line({complete:true}));controller.close();return;}
     page=await read(page.next);index=0;
     if(cancelled)return;
     if(!page.rows.length){controller.enqueue(line({complete:true}));controller.close();return;}
    }
    const chunk=line(page.rows[index]);
    if(rows>=limits.rows||bytes+chunk.byteLength>limits.bytes)throw new Error('EXPORT_LIMIT');
    index++;rows++;bytes+=chunk.byteLength;controller.enqueue(chunk);
   }catch{
    if(cancelled)return;
    controller.enqueue(line({complete:false,error:'Экспорт прерван или превышен лимит объема. Файл неполный; повторите скачивание или обратитесь за расширенным экспортом.'}));
    controller.close();
   }
  },
  cancel(){cancelled=true;}
 });
}
