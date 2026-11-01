import {createConnection} from 'node:net';
/** VERSION uses daemon-local ctime. Deployment must enforce TZ=UTC on clamd. */
export function parseLoadedVersion(response:string,now:number){
 const match=/^ClamAV (\d+\.\d+\.\d+)\/([1-9]\d*)\/([A-Z][a-z]{2}) ([A-Z][a-z]{2}) ([ \d]\d) (\d{2}):(\d{2}):(\d{2}) (\d{4})\x00$/.exec(response);
 if(!match||!Number.isSafeInteger(now))return null;
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const month=months.indexOf(match[4]),day=Number(match[5]),year=Number(match[9]),hour=Number(match[6]),minute=Number(match[7]),second=Number(match[8]),version=Number(match[2]);
 if(month<0||year<2020||!Number.isSafeInteger(version))return null;
 const date=new Date(Date.UTC(year,month,day,hour,minute,second));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month||date.getUTCDate()!==day||date.getUTCHours()!==hour||date.getUTCMinutes()!==minute||date.getUTCSeconds()!==second||days[date.getUTCDay()]!==match[3]||date.getTime()>now)return null;
 return{format:'jobmatch-scanner-readiness-v1' as const,ready:true as const,engine:match[1],loadedDatabaseVersion:version,loadedDatabaseTime:date.toISOString(),observedAt:new Date(now).toISOString(),expiresAt:new Date(now+10000).toISOString()};
}
export function measureLoadedVersion(options:{host?:string;port?:number;now?:()=>number}={}):Promise<ReturnType<typeof parseLoadedVersion>>{
 return new Promise(resolve=>{
  const socket=createConnection({host:options.host??'scanner',port:options.port??3310});let done=false,size=0;const chunks:Buffer[]=[];
  const finish=(value:ReturnType<typeof parseLoadedVersion>)=>{if(done)return;done=true;clearTimeout(timer);socket.destroy();resolve(value);};
  const timer=setTimeout(()=>finish(null),200);
  socket.on('connect',()=>socket.write('zVERSION\0'));socket.on('error',()=>finish(null));
  socket.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>512)finish(null);else chunks.push(chunk);});
  socket.on('end',()=>{try{finish(parseLoadedVersion(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)),(options.now??Date.now)()));}catch{finish(null);}});
  socket.on('close',()=>{if(!done)finish(null);});
 });
}
