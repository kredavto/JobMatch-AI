import {validParserToken} from '../lib/parser-contract.js';
export type RuntimeRole='parser'|'gateway'|'observer';
const base=new Set(['PATH','PWD','HOSTNAME','HOME','NODE_VERSION','YARN_VERSION','NODE_ENV','TZ','LANG','LC_ALL']);
export const EMPTY_RUNTIME_VARIABLES=['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','NODE_OPTIONS'] as const;
/** An untrusted child can read its parent's /proc environment. Deny unknown names, not only known secret names. */
export function assertRuntimeEnvironment(role:RuntimeRole,environment:NodeJS.ProcessEnv=process.env){
 if(role!=='parser'&&role!=='gateway'&&role!=='observer')throw Error('Invalid runtime environment');
 for(const [name,value] of Object.entries(environment)){
  if(value===undefined)continue;
  if((EMPTY_RUNTIME_VARIABLES as readonly string[]).includes(name)){if(value!=='')throw Error('Invalid runtime environment');continue;}
  if(name==='PWD'&&value!==process.cwd())throw Error('Invalid runtime environment');
  if(role==='parser'&&name==='PARSER_WORKER_OCR'&&['true','false'].includes(value))continue;
  if(role==='gateway'&&name==='PARSER_SCAN_MODE'&&['off','required'].includes(value))continue;
  if(role==='gateway'&&environment.PARSER_SCAN_MODE==='required'&&name==='PARSER_SCANNER_PUBLIC_KEY'&&value.length>0&&value.length<=4096)continue;
  if(role==='gateway'&&environment.PARSER_SCAN_MODE==='required'&&name==='PARSER_SCANNER_ENGINES'&&value.length<=128&&/^[0-9]+\.[0-9]+\.[0-9]+(,[0-9]+\.[0-9]+\.[0-9]+)*$/.test(value))continue;
  if(role==='observer'&&name==='SCANNER_TIMEZONE_UTC_CONFIRMED'&&value==='true')continue;
  if(role==='observer'&&name==='SCANNER_ALLOWED_ENGINES'&&value.length<=128&&/^[0-9]+\.[0-9]+\.[0-9]+(,[0-9]+\.[0-9]+\.[0-9]+)*$/.test(value))continue;
  if(base.has(name))continue;
  if(role==='gateway'&&name==='PARSER_WORKER_TOKEN'&&validParserToken(value))continue;
  throw Error('Invalid runtime environment');
 }
 if(role==='gateway'&&!validParserToken(environment.PARSER_WORKER_TOKEN))throw Error('Invalid runtime environment');
}
