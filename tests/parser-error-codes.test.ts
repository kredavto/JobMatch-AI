import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {parseImport} from '../lib/import-parser';
import {PARSER_ERRORS} from '../lib/parser-contract';
import {UserError} from '../lib/errors';
const mock=vi.hoisted(()=>({boundedBody:vi.fn()}));vi.mock('../lib/body',()=>mock);
beforeEach(()=>{vi.stubEnv('IMPORT_PARSER_MODE','worker');vi.stubEnv('IMPORT_PARSER_URL','https://parser.example.test/extract');vi.stubEnv('IMPORT_PARSER_TOKEN','a'.repeat(32));mock.boundedBody.mockReset();});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('forwards validated parser codes with public API codes and retains status',async()=>{for(const [parserCode,code] of [['BUSY','PARSER_BUSY'],['OCR_LIMIT','PARSER_OCR_LIMIT'],['INVALID','PARSER_INVALID']] as const){const status=PARSER_ERRORS[parserCode].status;vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({},{status})));mock.boundedBody.mockResolvedValueOnce(new TextEncoder().encode(JSON.stringify({ok:false,code:parserCode})));await expect(parseImport('file.pdf',Buffer.from('synthetic'))).rejects.toMatchObject({code,status});}});
it('matching Russian text alone no longer authorizes forwarding an internal error',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({})));mock.boundedBody.mockRejectedValueOnce(new UserError(PARSER_ERRORS.BUSY.message,503));await expect(parseImport('file.pdf',Buffer.from('synthetic'))).rejects.toMatchObject({code:'PARSER_UNAVAILABLE',status:503});});
