import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import JSZip from 'jszip';
import {NextRequest} from 'next/server';
import {resumeDocx} from '../lib/resume-docx';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {POST} from '../app/api/import/route';
const owner='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{vi.stubEnv('IMPORT_PARSER_MODE','inline');vi.clearAllMocks();db.identity.mockResolvedValue({id:owner,token:'fixture'});});
afterEach(()=>vi.unstubAllEnvs());
async function request(extra?:string){
 const safe=await resumeDocx('Проверенный опыт: SQL');const zip=await JSZip.loadAsync(safe);if(extra)zip.file(extra,'unsupported payload');
 const form=new FormData();form.set('file',new File([await zip.generateAsync({type:'arraybuffer'})],'resume.docx'));
 return new NextRequest('https://app.test/api/import',{method:'POST',headers:{origin:'https://app.test','x-jobmatch-owner':owner},body:form});
}
it('imports valid DOCX via multipart without saving or confirming facts',async()=>{const response=await POST(await request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect((await response.json()).text).toContain('Проверенный опыт: SQL');expect(db.consumeQuota).toHaveBeenCalledWith({id:owner,token:'fixture'},'import');});
it.each(['word/embeddings/oleObject1.bin','word/activeX/control.xml','WORD/document.xml'])('rejects unsupported DOCX at the import endpoint: %s',async part=>{const response=await POST(await request(part));expect(response.status).toBe(400);const data=await response.json();expect(data.text).toBeUndefined();expect(data.error).not.toContain('payload');});
it('requires a live session before parsing a document',async()=>{db.identity.mockRejectedValue(new Error('AUTH'));expect((await POST(await request('word/embeddings/a.bin'))).status).toBe(401);expect(db.consumeQuota).not.toHaveBeenCalled();});
