import {it,expect,vi,beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
import {UserError} from '../lib/errors';
import {PARSER_ERRORS} from '../lib/parser-contract';
const fixture=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),parseImport:vi.fn()}));
vi.mock('../lib/db',()=>fixture);vi.mock('../lib/import-parser',()=>fixture);
import {POST} from '../app/api/import/route';
beforeEach(()=>{vi.clearAllMocks();fixture.identity.mockResolvedValue({id:'11111111-1111-4111-8111-111111111111',token:'synthetic'});fixture.consumeQuota.mockResolvedValue(undefined);});
function request(){const form=new FormData();form.set('file',new File(['Synthetic PDF'],'resume.pdf'));return new NextRequest('https://app.test/api/import',{method:'POST',headers:{origin:'https://app.test'},body:form});}
it('preserves the strict legacy OCR_LIMIT wire shape by code, without serializing exception copy',async()=>{fixture.parseImport.mockRejectedValue(new UserError('PRIVATE_DIAGNOSTIC',400,'PARSER_OCR_LIMIT'));const r=await POST(request());expect(r.status).toBe(400);expect(await r.json()).toEqual({code:'OCR_LIMIT'});expect(fixture.parseImport).toHaveBeenCalledTimes(1);});
it.each([new UserError(PARSER_ERRORS.OCR_LIMIT.message,400),new UserError('PRIVATE_DIAGNOSTIC',408,'PARSER_OCR_LIMIT')])('copy alone or mismatched status cannot authorize an OCR claim %#',async error=>{fixture.parseImport.mockRejectedValue(error);const r=await POST(request());expect(r.status).toBe(error.status);const body=await r.json();expect(body.code).toBe('REQUEST_FAILED');expect(JSON.stringify(body)).not.toContain('PRIVATE_DIAGNOSTIC');expect(body.code).not.toBe('OCR_LIMIT');});
