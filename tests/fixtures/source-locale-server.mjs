import {reminderExportFixture} from './reminder-export-fixture.mjs';
/** Owned loopback UI fixture, using Vitest's declared Vite dependency. No package change. */
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ownRequire=createRequire(import.meta.url),vitestRequire=createRequire(ownRequire.resolve('vitest/package.json'));
const root=fileURLToPath(new URL('../../',import.meta.url));
let server;
try{
 if(process.env.JOBMATCH_LOCAL_SOURCE_LOCALES!=='1'||!process.send)throw Error();

 const settingsDownloads=process.env.JOBMATCH_LOCAL_SETTINGS_EXPORT_FIXTURE==='1'?[{name:'owned-settings-downloads',configureServer(vite){
  const paths=new Set(['/api/fact-history','/api/letter-versions','/api/source-versions','/api/reminders']),ownerId='11111111-1111-4111-8111-111111111111';
  vite.middlewares.use((request,response,next)=>{
   const url=new URL(request.url||'/','http://127.0.0.1');if(!paths.has(url.pathname)){next();return;}
   if(request.method!=='GET'||JSON.stringify([...url.searchParams])!==JSON.stringify([['export','1'],['expectedOwnerId',ownerId]])){response.writeHead(409,{'Cache-Control':'no-store','Content-Type':'text/plain'});response.end('SYNTHETIC_OWNER_REFUSAL');return;}
   if(url.pathname==='/api/reminders'){response.writeHead(200,{'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="jobmatch-reminders.json"'});response.end(JSON.stringify(reminderExportFixture)+'\n');return;}
   response.writeHead(200,{'Cache-Control':'no-store','Content-Type':'application/x-ndjson','Content-Disposition':'attachment; filename="synthetic-settings.ndjson"'});
   response.end(JSON.stringify({format:'synthetic-settings-fixture',path:url.pathname,ownerId,method:request.method,query:[...url.searchParams]})+'\n'+JSON.stringify({complete:true})+'\n');
  });
 }}]:[];
 const {createServer}=await import(pathToFileURL(vitestRequire.resolve('vite')).href);
 server=await createServer({root,plugins:settingsDownloads,configFile:false,envFile:false,envPrefix:'__JOBMATCH_NO_PUBLIC_ENV__',define:{'process.env':'{}'},logLevel:'silent',clearScreen:false,server:{host:'127.0.0.1',port:0,strictPort:true,hmr:false,fs:{strict:true,allow:[root]}}});
 await server.listen();const address=server.httpServer.address();if(!address||typeof address==='string')throw Error();
 process.send({port:address.port});
 const close=async()=>{await server.close();process.exit(0);};
 process.on('message',message=>{if(message==='close')void close();});process.on('disconnect',()=>void close());
}catch{process.send?.({error:'FIXTURE_START_FAILED'});await server?.close();process.exit(1);}
