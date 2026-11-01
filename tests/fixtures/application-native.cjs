/* Production command wire/ack decoder on actual native SQL rows; transport is a fixture. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {applyWorkspaceCommand}=require('../../lib/db.ts'),{WorkspaceCommandSchema}=require('../../lib/workspace-command.ts');
(async()=>{try{
 const [input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'));let calls=0;
 process.env.SUPABASE_URL='https://application-fixture.test';process.env.SUPABASE_PUBLISHABLE_KEY='synthetic-publishable';
 global.fetch=async(url,init)=>{calls++;assert.equal(url,'https://application-fixture.test/rest/v1/rpc/apply_workspace_command');assert.equal(init.headers.Authorization,'Bearer synthetic-session');assert.deepEqual(JSON.parse(init.body),{p_revision:data.revision,p_command:WorkspaceCommandSchema.parse(data.command)});return Response.json(data.state);};
 const state=await applyWorkspaceCommand({id:data.ownerId,token:'synthetic-session'},data.revision,data.command);assert.equal(calls,1);assert.equal(state.revision,data.revision+1);fs.writeFileSync(output,JSON.stringify({valid:true}));
}catch{process.stderr.write('FAIL: synthetic application wire/ack codec; no rows or credentials printed.\n');process.exitCode=2;}})();
