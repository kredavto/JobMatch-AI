/* Disposable PostgreSQL fixture bridge: actual TS issuer/reader, no network or production keys. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),crypto=require('node:crypto');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {issueLetterReceipt,verifyLetterReceipt}=require('../../lib/saved-letter-signing.ts');
const {composeLetter}=require('../../lib/cover-letter.ts');
const {createLetterSnapshotJson}=require('../../lib/letter-snapshot.ts');
const {validateSavedLetterVersion,SavedLettersStateSchema}=require('../../lib/saved-letter.ts');
async function main(){
 const [mode,input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'));
 const key=Buffer.from('ab'.repeat(32),'hex'),config={key,keyId:crypto.createHash('sha256').update(key).digest('hex')};
 let result;
 if(mode==='issue'){
  const workspace=data.workspace,selection=workspace.facts.filter(f=>f.verified).slice(0,1).map(f=>'edit-'+f.id),generated=composeLetter(workspace.facts,workspace.vacancy,selection,'professional').text;
  const snapshotJson=createLetterSnapshotJson({facts:workspace.facts,vacancy:workspace.vacancy,selection,style:'professional',generated,text:generated,reviewedIssueIds:[],wholeLetter:true});
  result=issueLetterReceipt(workspace.ownerId,workspace,data.letterRevision,snapshotJson,config);verifyLetterReceipt(result,workspace.ownerId,config);
 }else if(mode==='validate'){
  const record=await validateSavedLetterVersion(data.record,data.ownerId),state=SavedLettersStateSchema.parse(data.state);
  if(state.ownerId!==data.ownerId||!state.items.some(i=>i.id===record.id&&i.payloadSha256===record.payloadSha256&&i.version===record.version))throw Error('INVALID_FIXTURE');
  result={valid:true};
 }else throw Error('UNKNOWN_FIXTURE_MODE');
 fs.writeFileSync(output,JSON.stringify(result));
}
main().catch(()=>{process.stderr.write('FAIL: synthetic letter fixture bridge.\n');process.exitCode=2;});
