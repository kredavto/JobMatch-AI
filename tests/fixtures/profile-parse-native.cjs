/* Independent existing JavaScript parser parity expectations for native SQL imports. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript');
if(process.env.JOBMATCH_LOCAL_PROFILE_COMMANDS!=='1')throw Error('Explicit synthetic fixture required');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {parseFacts}=require('../../lib/engine.ts'),{WorkspaceCommandSchema}=require('../../lib/workspace-command.ts');
try{const [input,output]=process.argv.slice(2),cases=JSON.parse(fs.readFileSync(input,'utf8'));
 fs.writeFileSync(output,JSON.stringify(cases.map(text=>{const parsed=WorkspaceCommandSchema.safeParse({action:'import',text});if(!parsed.success)return{accepted:false};const facts=parseFacts(text);return facts.length<=500&&facts.every(f=>f.text.length<=2000)?{accepted:true,texts:facts.map(f=>f.text),sources:facts.map(f=>f.source)}:{accepted:false};})));
}catch{process.stderr.write('FAIL: synthetic production parser parity; no text emitted.\n');process.exitCode=2;}
