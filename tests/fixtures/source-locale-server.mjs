/** Owned loopback UI fixture, using Vitest's declared Vite dependency. No package change. */
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ownRequire=createRequire(import.meta.url),vitestRequire=createRequire(ownRequire.resolve('vitest/package.json'));
const root=fileURLToPath(new URL('../../',import.meta.url));
let server;
try{
 if(process.env.JOBMATCH_LOCAL_SOURCE_LOCALES!=='1'||!process.send)throw Error();
 const {createServer}=await import(pathToFileURL(vitestRequire.resolve('vite')).href);
 server=await createServer({root,configFile:false,envFile:false,envPrefix:'__JOBMATCH_NO_PUBLIC_ENV__',define:{'process.env':'{}'},logLevel:'silent',clearScreen:false,server:{host:'127.0.0.1',port:0,strictPort:true,hmr:false,fs:{strict:true,allow:[root]}}});
 await server.listen();const address=server.httpServer.address();if(!address||typeof address==='string')throw Error();
 process.send({port:address.port});
 const close=async()=>{await server.close();process.exit(0);};
 process.on('message',message=>{if(message==='close')void close();});process.on('disconnect',()=>void close());
}catch{process.send?.({error:'FIXTURE_START_FAILED'});await server?.close();process.exit(1);}
