/* Actual current codec/renderer against native SQL; public synthetic loopback fixtures only. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript');
if(process.env.JOBMATCH_LOCAL_ORDINARY_ENGLISH!=='1'||process.env.JOBMATCH_LOCAL_VERSION_COMMANDS!=='1'||!['127.0.0.1','::1'].includes(process.env.PGHOST)||!/^jobmatch_versions_[a-f0-9]{32}$/.test(process.env.PGDATABASE??''))throw Error('Owned ordinary fixture required');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
try{const [input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'));
 const {prepareVersionCommand}=require('../../lib/version-command.ts'),{propose,parseVacancy,renderVersion}=require('../../lib/engine.ts'),{ORDINARY_ENGLISH_TEMPLATE:EN}=require('../../lib/ordinary-template.ts'),{validateOrdinaryVersionResult}=require('../../lib/ordinary-version-result.ts');
 let result;if(data.mode==='validate'){for(const row of data.rows)validateOrdinaryVersionResult(row.after,row.before,row.ids,row.owner,EN);result={valid:data.rows.length};}
 else if(data.mode==='prepare'){result=data.rows.map(({state,mode})=>{const edits=propose(state.facts,parseVacancy(state.vacancy)),ids=(mode===0?[]:mode===1?edits.slice(0,1):edits).map(e=>e.id);if(mode===3)ids.reverse();const command=prepareVersionCommand(state,ids,EN),chosen=edits.filter(e=>ids.includes(e.id));return{ids,command,expected:{text:renderVersion(state.original,chosen,state.facts,EN),vacancy:state.vacancy,evidence_ids:command.evidence_ids,evidence_snapshot:state.facts.filter(f=>command.evidence_ids.includes(f.id)),profile_revision:state.revision,engine_version:'rules-v1',score:command.score,match_metadata:command.match_metadata,template_version:EN}};});}
 else throw Error('Unknown mode');fs.writeFileSync(output,JSON.stringify(result));
}catch{process.stderr.write('FAIL: native ordinary codec; no source data emitted.\n');process.exitCode=2;}
