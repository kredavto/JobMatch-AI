import {beforeEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
import JSZip from 'jszip';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),readWorkspace:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {GET} from '../app/api/resume-export/route';
import {validatedPersonalExport} from '../lib/settings-export';
import {reviewedVersionFixture} from './fixtures/rewrite-version';
import {validateReviewedRewriteVersion} from '../lib/ai-rewrite-version';
let f:Awaited<ReturnType<typeof reviewedVersionFixture>>;
beforeEach(async()=>{vi.resetAllMocks();f=await reviewedVersionFixture();db.identity.mockResolvedValue({id:f.state.ownerId,token:'public-fixture'});db.readWorkspace.mockResolvedValue({...f.state,revision:8,versions:[f.row]});});
it('actual DOCX handler preserves chosen literal paragraphs and does not invent ordinary headings',async()=>{
 const response=await GET(new NextRequest('https://app.test/api/resume-export?id='+f.row.id+'&expectedOwnerId='+f.state.ownerId));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
 const zip=await JSZip.loadAsync(await response.arrayBuffer()),xml=await zip.file('word/document.xml')!.async('string');
 const paragraphs=[...xml.matchAll(/<w:p>(.*?)<\/w:p>/gs)].map(match=>[...match[1].matchAll(/<w:t(?: xml:space="preserve")?>(.*?)<\/w:t>/gs)].map(x=>x[1].replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'")).join(''));
 expect(paragraphs.join('\n')).toBe(f.row.text.replace(/\r\n?/g,'\n'));expect(xml).not.toContain('РЕЛЕВАНТНЫЙ ОПЫТ');expect(xml).not.toContain('RELEVANT EXPERIENCE');expect(xml).not.toContain('<w:b/>');
});
it('personal export retains the exact archive/receipt/source and immutable restore provenance',async()=>{
 const copy={...f.row,id:'22222222-2222-4222-8222-222222222222',created:new Date(Date.parse(f.row.created)+1000).toISOString(),restored_from:f.row.id};const workspace={...f.state,revision:9,versions:[f.row,copy]},raw={format:'jobmatch-personal-data-v1',complete:true,scope:'workspace-audit-consent',exported_at:new Date().toISOString(),fact_history_export:'/api/fact-history?export=1',user:{id:f.state.ownerId},workspace,audit:[],consent:[]};
 const archive=validatedPersonalExport(raw,{ownerId:f.state.ownerId,currentOwnerId:f.state.ownerId});expect(archive.workspace).toEqual(workspace);const checked=await validateReviewedRewriteVersion(archive.workspace.versions[1],f.state.ownerId!);expect(checked.archive).toEqual(f.archive);expect(checked.version.text).toBe(f.row.text);
 expect(()=>validatedPersonalExport(raw,{ownerId:f.state.ownerId,currentOwnerId:'33333333-3333-4333-8333-333333333333'})).toThrow();
});
