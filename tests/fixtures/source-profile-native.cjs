/* Actual production source codec on synthetic native PostgreSQL responses. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {validateSourceProfile,validateSourceWriteAck}=require('../../lib/source-profile.ts');
try{const [input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'));const p=data.before?validateSourceWriteAck(data.profile,data.before,data.command,data.context):validateSourceProfile(data.profile,data.context.ownerId,data.context);fs.writeFileSync(output,JSON.stringify({revision:p.revision,valid:true}));}catch{process.stderr.write('FAIL: synthetic source profile codec.\n');process.exitCode=2;}
