import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
// Dedicated loopback test server. Never a Next app route or public/build artifact.
if(process.env.JOBMATCH_SYNTHETIC_BROWSER_HARNESS!=='true')throw Error('Synthetic test harness opt-in required');
const root=fileURLToPath(new URL('.',import.meta.url));
const repo=fileURLToPath(new URL('../../..',import.meta.url));
const server=await createServer({configFile:false,envFile:false,root,publicDir:false,plugins:[{name:'never-build-harness',config(_,context){if(context.command!=='serve')throw Error('Harness cannot be built');}}],server:{host:'127.0.0.1',port:3119,strictPort:true,fs:{allow:[repo]}}});
await server.listen();
for(const event of ['SIGTERM','SIGINT'])process.on(event,async()=>{await server.close();process.exit(0);});
