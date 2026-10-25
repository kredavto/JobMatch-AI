import {it,expect,vi,beforeEach} from 'vitest';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import {NextRequest} from 'next/server';
import {resumeDocx} from '../lib/resume-docx';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),readWorkspace:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {GET} from '../app/api/resume-export/route';
const owner='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{vi.clearAllMocks();db.identity.mockResolvedValue({id:owner,token:'fixture'});db.readWorkspace.mockResolvedValue({versions:[{id:'saved',text:'Проверенный опыт'}]});});
it('roundtrips Cyrillic, emoji, XML characters, tabs and blank lines without added facts',async()=>{
 const lines=['  Иван & <SQL> "опыт"  ','CRM\tБитрикс24','','Проект 🚀'];
 const bytes=await resumeDocx(lines.join('\r\n'));
 const result=await mammoth.extractRawText({buffer:Buffer.from(bytes)});
 expect(result.value).toBe(lines.join('\n\n')+'\n\n');
 const zip=await JSZip.loadAsync(bytes);expect(Object.keys(zip.files).filter(k=>!zip.files[k].dir).sort()).toEqual(['[Content_Types].xml','_rels/.rels','word/document.xml']);
 expect(await zip.file('_rels/.rels')!.async('string')).not.toContain('External');
});
it.each(['bad\u0000text','bad\ud800', 'x'.repeat(200001)])('rejects invalid or oversized content',async text=>{await expect(resumeDocx(text)).rejects.toThrow();});
it('exports only the saved owned text and disables caching',async()=>{
 const response=await GET(new NextRequest('https://app.test/api/resume-export?id=saved&expectedOwnerId='+owner));
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');
 expect((await mammoth.extractRawText({buffer:Buffer.from(await response.arrayBuffer())})).value).toBe('Проверенный опыт\n\n');
 expect(db.readWorkspace).toHaveBeenCalledWith({id:owner,token:'fixture'});
});
it('rejects another owner before database reads',async()=>{
 const r=await GET(new NextRequest('https://app.test/api/resume-export?id=saved&expectedOwnerId=22222222-2222-4222-8222-222222222222'));expect(r.status).toBe(409);expect(db.readWorkspace).not.toHaveBeenCalled();
});
it('does not export unknown or foreign version ids',async()=>{expect((await GET(new NextRequest('https://app.test/api/resume-export?id=foreign'))).status).toBe(404);});
it('requires authentication',async()=>{db.identity.mockRejectedValue(new Error('AUTH'));expect((await GET(new NextRequest('https://app.test/api/resume-export?id=saved'))).status).toBe(401);expect(db.readWorkspace).not.toHaveBeenCalled();});
it('honors quota failure without reading personal data',async()=>{db.consumeQuota.mockRejectedValueOnce(new Error('RATE'));expect((await GET(new NextRequest('https://app.test/api/resume-export?id=saved'))).status).toBe(429);expect(db.readWorkspace).not.toHaveBeenCalled();});
