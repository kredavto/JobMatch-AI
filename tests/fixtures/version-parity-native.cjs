/* Current TypeScript prepare + existing renderer, independent of SQL text construction. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript');
if(process.env.JOBMATCH_LOCAL_VERSION_COMMANDS!=='1')throw Error('Explicit owned fixture required');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {prepareVersionCommand}=require('../../lib/version-command.ts'),{propose,parseVacancy,renderVersion}=require('../../lib/engine.ts');
try{const [input,output]=process.argv.slice(2),cases=JSON.parse(fs.readFileSync(input,'utf8'));
 const results=cases.map(({state,mode})=>{const candidates=propose(state.facts,parseVacancy(state.vacancy));let ids=mode===0?[]:mode===1?candidates.slice(0,1).map(e=>e.id):candidates.map(e=>e.id);if(mode===3)ids.reverse();const selected=candidates.filter(e=>ids.includes(e.id)),command=prepareVersionCommand(state,ids);return{command,expected:{text:renderVersion(state.original,selected,state.facts),vacancy:state.vacancy,evidence_ids:command.evidence_ids,evidence_snapshot:state.facts.filter(f=>command.evidence_ids.includes(f.id)),profile_revision:state.revision,engine_version:'rules-v1',score:command.score,match_metadata:command.match_metadata}};});
 fs.writeFileSync(output,JSON.stringify(results));
}catch{process.stderr.write('FAIL: production version parity fixture; no workspace data emitted.\n');process.exitCode=2;}
