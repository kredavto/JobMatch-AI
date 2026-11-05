/* Actual production command wire/ACK on native SQL state. HTTP transport is synthetic. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {commandReminder}=require('../../lib/persisted-reminders-db.ts');
(async()=>{try{
 const [input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'));let calls=0;
 process.env.SUPABASE_URL='https://reminder-fixture.test';process.env.SUPABASE_PUBLISHABLE_KEY='synthetic-publishable';
 global.fetch=async(url,init)=>{calls++;assert.equal(init.headers.Authorization,'Bearer synthetic-session');
  if(calls===1){assert.equal(url,'https://reminder-fixture.test/rest/v1/rpc/read_reminders');assert.deepEqual(JSON.parse(init.body),{});return Response.json(data.before);}
  assert.equal(calls,2);assert.equal(url,'https://reminder-fixture.test/rest/v1/rpc/command_reminder');assert.deepEqual(JSON.parse(init.body),{p_workspace_revision:data.workspaceRevision,p_revision:data.before.revision,p_command:data.command});return Response.json(data.after);
 };
 const state=await commandReminder({id:data.before.ownerId,token:'synthetic-session'},data.workspaceRevision,data.before.revision,data.command);assert.deepEqual(state,data.after);assert.equal(calls,2);fs.writeFileSync(output,JSON.stringify({valid:true}));
}catch{process.stderr.write('FAIL: reminder wire/ACK refused; no records or credentials printed.\n');process.exitCode=2;}})();
