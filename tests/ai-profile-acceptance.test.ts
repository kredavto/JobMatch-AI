import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createHmac} from 'node:crypto';
import {profilePreview} from '../lib/ai-profile-v2';
import {optionalProfileSigningConfig,requiredProfileSigningConfig,issueProfileReceipt,verifyProfileReceipt} from '../lib/ai-profile-signing';
import {decodeProfileReceipt,receiptForProfile,SelectedProfileIndicesSchema,validateProfileAcceptance,profilePayloadSha256} from '../lib/ai-profile-acceptance';
import type {StructuredProfile} from '../lib/structured-profile';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
// Known synthetic fixture key, never deployment configuration or model evidence.
const key='ab'.repeat(32),time=Date.parse('2026-10-31T12:00:00Z');
const source='😀 Engineer at Orbit.';
const profile:StructuredProfile={format:'jobmatch-structured-profile-v1',ownerId:owner,revision:2,workspace_revision:4,source_workspace_revision:3,source_original:source,source_fact_ids:['f1'],source_matches:true,entries:[]};
const preview=()=>profilePreview({entries:[{blockId:0,kind:'employment',fields:{title:'Engineer',organization:'Orbit',start:null,end:null,description:null,credential:null}}]},source,{model:'synthetic-fixture',operatorDeclaredModelDigest:'sha256:'+'c'.repeat(64),modelIdentityVerified:false});
const receipt=()=>issueProfileReceipt(profile,preview(),requiredProfileSigningConfig());
function resign(payload:unknown){const text=JSON.stringify(payload);return {payload:text,signature:createHmac('sha256',Buffer.from(key,'hex')).update('jobmatch-ai-profile-receipt-v1\n'+text).digest('hex')};}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(time);vi.stubEnv('JOBMATCH_AI_PROFILE_ACCEPTANCE_ENABLED','true');vi.stubEnv('JOBMATCH_AI_PROFILE_SIGNING_SECRET',key);});
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
describe('server receipt integrity, not accepted model or semantic truth',()=>{
 it('default-off never requires or exposes a signing key',()=>{for(const value of ['', 'false']){vi.stubEnv('JOBMATCH_AI_PROFILE_ACCEPTANCE_ENABLED',value);vi.stubEnv('JOBMATCH_AI_PROFILE_SIGNING_SECRET','PRIVATE');expect(optionalProfileSigningConfig()).toBeNull();expect(()=>requiredProfileSigningConfig()).toThrow();}});
 it.each(['PRIVATE','ab','AB'.repeat(32),'ab'.repeat(33)])('refuses an invalid configured key without reflecting it: %s',value=>{vi.stubEnv('JOBMATCH_AI_PROFILE_SIGNING_SECRET',value);expect(()=>requiredProfileSigningConfig()).toThrow('');try{requiredProfileSigningConfig();}catch(error){expect(error).toMatchObject({code:'AI_PROFILE_ACCEPTANCE_UNAVAILABLE',status:503,message:''});}});
 it('unknown enable marker refuses rather than enabling or silently ignoring it',()=>{vi.stubEnv('JOBMATCH_AI_PROFILE_ACCEPTANCE_ENABLED','PRIVATE');expect(()=>optionalProfileSigningConfig()).toThrow();});
 it('binds exact source, Unicode ranges, facts/revisions and frozen v2 without a key/token in payload',()=>{
  const p=structuredClone(profile),before=structuredClone(p),v=preview(),vBefore=structuredClone(v),signed=issueProfileReceipt(p,v,requiredProfileSigningConfig()),parsed=verifyProfileReceipt(signed,owner,requiredProfileSigningConfig()).payload;
  expect(p).toEqual(before);expect(v).toEqual(vBefore);expect(parsed.source).toEqual({ownerId:owner,workspaceRevision:4,profileRevision:2,sourceWorkspaceRevision:3,sourceOriginal:source,sourceFactIds:['f1']});expect(parsed.preview.candidates[0].fields.title).toEqual({quote:'Engineer',start:2,end:10});expect(parsed.preview.origin.modelIdentityVerified).toBe(false);expect(parsed.preview.acceptance).toBe('not-accepted');expect(parsed.expiresAt-parsed.issuedAt).toBe(600);expect(signed.payload).not.toContain(key);expect(signed.payload).not.toContain('token');expect(parsed.preview.contractVersion).toBe('paragraph-quotes-v2');
 });
 it('each issue has a distinct signed nonce without mutating source or adopting a record',()=>{const a=receipt(),b=receipt();expect(decodeProfileReceipt(a).id).not.toBe(decodeProfileReceipt(b).id);expect(a.signature).not.toBe(b.signature);expect(profile.entries).toEqual([]);});
 it('rejects payload/signature/owner/key tampering with one fixed public error',()=>{
  const signed=receipt();for(const value of [{...signed,payload:signed.payload+' '},{...signed,signature:'0'.repeat(64)},{...signed,signature:'PRIVATE'},{...signed,extra:'PRIVATE'}])expect(()=>verifyProfileReceipt(value,owner,requiredProfileSigningConfig())).toThrow();
  for(const [id,config]of [[other,requiredProfileSigningConfig()],[owner,{key:Buffer.from('cd'.repeat(32),'hex'),keyId:'0'.repeat(64)}]] as const){try{verifyProfileReceipt(signed,id,config);throw Error('unexpected');}catch(error){expect(error).toMatchObject({code:'AI_PROFILE_RECEIPT_INVALID',status:400,message:''});}}
 });
 it('accepts only the exact TTL window and at most five seconds of future clock skew',()=>{
  const signed=receipt();vi.setSystemTime(time-5000);expect(()=>verifyProfileReceipt(signed,owner,requiredProfileSigningConfig())).not.toThrow();vi.setSystemTime(time-6000);expect(()=>verifyProfileReceipt(signed,owner,requiredProfileSigningConfig())).toThrow();vi.setSystemTime(time+599000);expect(()=>verifyProfileReceipt(signed,owner,requiredProfileSigningConfig())).not.toThrow();vi.setSystemTime(time+600000);expect(()=>verifyProfileReceipt(signed,owner,requiredProfileSigningConfig())).toThrow();
 });
 it('even correctly signed malformed issuer data cannot weaken source or model flags',()=>{
  const base=decodeProfileReceipt(receipt());const mutations=[(p:typeof base)=>{p.expiresAt++;},(p:typeof base)=>{p.preview.acceptance='accepted' as 'not-accepted';},(p:typeof base)=>{p.preview.origin.modelIdentityVerified=true as false;},(p:typeof base)=>{p.preview.candidates[0].fields.title!.start++;},(p:typeof base)=>{p.source.sourceOriginal='PRIVATE';},(p:typeof base)=>{p.preview.contractVersion='paragraph-quotes-v1' as 'paragraph-quotes-v2';}];
  for(const mutate of mutations){const p=structuredClone(base);mutate(p);expect(()=>verifyProfileReceipt(resign(p),owner,requiredProfileSigningConfig())).toThrow();}
 });
 it('defensive browser binding refuses another owner/revision/source/fact association and preview',()=>{
  const signed=receipt();expect(receiptForProfile(signed,profile,preview())).toEqual(signed);
  for(const changed of [{ownerId:other},{revision:3},{workspace_revision:5},{source_workspace_revision:2},{source_original:'NEW '+source},{source_fact_ids:['f2']},{source_matches:false}])expect(()=>receiptForProfile(signed,{...profile,...changed})).toThrow();const v=preview();v.candidates=[];expect(()=>receiptForProfile(signed,profile,v)).toThrow();
 });
 it('selection is a bounded sorted unique nonempty batch, never negative/fractional/out-of-range',()=>{expect(SelectedProfileIndicesSchema.parse([0,2,9])).toEqual([0,2,9]);for(const ids of [[],[1,0],[0,0],[-1],[10],[0.5],['0'],Array(11).fill(0)])expect(SelectedProfileIndicesSchema.safeParse(ids).success).toBe(false);});
 it('retains historical source validation and checksum after expiry/key rotation without claiming offline MAC verification',async()=>{
  const signed=receipt(),p=decodeProfileReceipt(signed);const record={format:'jobmatch-ai-profile-acceptance-v1',id:p.id,ownerId:owner,created:new Date(time+1000).toISOString(),receipt:signed,payloadSha256:await profilePayloadSha256(signed.payload),selectedIndices:[0],entryIds:['33333333-3333-4333-8333-333333333333'],userSelectionAccepted:true,signatureVerifiedAtAcceptance:true,issuerIdentity:'server-key-holder',modelIdentityVerified:false,modelAcceptance:'not-accepted'};
  vi.setSystemTime(time+365*86400000);vi.stubEnv('JOBMATCH_AI_PROFILE_ACCEPTANCE_ENABLED','false');vi.stubEnv('JOBMATCH_AI_PROFILE_SIGNING_SECRET','');expect(await validateProfileAcceptance(record,owner)).toEqual(record);
  for(const changed of [{ownerId:other},{id:other},{payloadSha256:'0'.repeat(64)},{selectedIndices:[1]},{entryIds:[other,owner]},{created:new Date(time+600000).toISOString()},{modelIdentityVerified:true},{signatureVerifiedAtAcceptance:false}])await expect(validateProfileAcceptance({...record,...changed},owner)).rejects.toThrow();
 });
});
