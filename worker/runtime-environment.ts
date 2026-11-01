import {validParserToken} from '../lib/parser-contract.js';
export type RuntimeRole='parser'|'gateway';
const base=new Set(['PATH','HOSTNAME','HOME','NODE_VERSION','YARN_VERSION','NODE_ENV','TZ','LANG','LC_ALL']);
export const EMPTY_RUNTIME_VARIABLES=['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','NODE_OPTIONS'] as const;
/** An untrusted child can read its parent's /proc environment. Deny unknown names, not only known secret names. */
export function assertRuntimeEnvironment(role:RuntimeRole,environment:NodeJS.ProcessEnv=process.env){
 if(role!=='parser'&&role!=='gateway')throw Error('Invalid runtime environment');
 for(const [name,value] of Object.entries(environment)){
  if(value===undefined)continue;
  if((EMPTY_RUNTIME_VARIABLES as readonly string[]).includes(name)){if(value!=='')throw Error('Invalid runtime environment');continue;}
  if(base.has(name))continue;
  if(role==='gateway'&&name==='PARSER_WORKER_TOKEN'&&validParserToken(value))continue;
  throw Error('Invalid runtime environment');
 }
 if(role==='gateway'&&!validParserToken(environment.PARSER_WORKER_TOKEN))throw Error('Invalid runtime environment');
}
