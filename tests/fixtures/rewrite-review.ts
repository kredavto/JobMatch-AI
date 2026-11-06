import {createHash} from 'node:crypto';
import type {Workspace} from '../../lib/db';
import {makeRewritePreview,prepareRewriteSource,type RewriteLocale} from '../../lib/ai-rewrite';
import {issueRewriteReceipt} from '../../lib/ai-rewrite-signing';
/** Public authored responses; neither fixture text nor fixture key is a model/production credential. */
export const rewriteState=():Workspace=>({ownerId:'11111111-1111-4111-8111-111111111111',revision:7,original:'🧑‍💻 Synthetic\r\n  Built 5 SQL reports  \r\nNo Python\nUNSELECTED PRIVATE FIXTURE',vacancy:'Synthetic SQL role',facts:[{id:'sql',text:'Built 5 SQL reports',source:'Synthetic source not sent by browser',verified:true},{id:'negative',text:'No Python',source:'Synthetic',verified:true}],goal:'Analyst',versions:[],applications:[]});
export async function rewriteFixture(state=rewriteState(),ids=['sql','negative'],language:RewriteLocale='ru',refused=false){
 const key=Buffer.from('12'.repeat(32),'hex'),config={signing:{key,keyId:createHash('sha256').update(key).digest('hex')},configurationId:'34'.repeat(32)};
 const source=await prepareRewriteSource(state,state.ownerId!,ids);
 const preview=await makeRewritePreview(source,language,'synthetic-unaccepted',{claims:source.facts.map(f=>f.id==='sql'&&!refused?{fact_id:f.id,status:'proposed',text:'Created 6 SQL reports'}:{fact_id:f.id,status:'refused',text:null})},state.original,config.configurationId);
 const receipt=await issueRewriteReceipt(state.ownerId!,state,preview,config.signing);
 return{state,config,preview,receipt,response:{ownerId:state.ownerId!,revision:state.revision,receipt}};
}
