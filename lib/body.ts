import {UserError} from './errors';
/** Bound bytes while streaming, including chunked requests with no Content-Length. */
export async function boundedBody(request:Request,maxBytes:number):Promise<Uint8Array>{
 const declared=request.headers.get('content-length');
 if(declared && (!/^\d+$/.test(declared)||Number(declared)>maxBytes))throw new UserError('Запрос слишком большой',413);
 if(!request.body)return new Uint8Array();const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new UserError('Запрос слишком большой',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}return data;
}
