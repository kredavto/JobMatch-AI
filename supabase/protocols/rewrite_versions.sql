-- Reviewed source protocol, NOT a CLI-generated Supabase migration.
-- Apply only in the explicitly opted-in disposable PG17 drill until separately packaged.
-- No schema.sql/provider installation, key/config activation or hosted acceptance claimed.
begin;
set local lock_timeout='2s';
lock table public.workspaces,public.resume_versions in share row exclusive mode;
do $$begin
 if to_regprocedure('private.locked_workspace(integer)') is null or to_regprocedure('private.apply_version_intent(jsonb,integer,jsonb)') is null
  or to_regclass('private.letter_signing_config') is null then raise exception 'REWRITE_BASELINE_REQUIRED';end if;
 if not exists(select 1 from pg_proc where oid=to_regprocedure('private.validate_fact_write(jsonb,jsonb,text,integer)') and md5(prosrc) in ('1c7f56f9cf4f9cc8b09fdd5c266318a6','1510059b958b0926662fdd7230f86435')) then raise exception 'REWRITE_BASELINE_REQUIRED';end if;
 if not exists(select 1 from pg_proc where oid=to_regprocedure('private.locked_workspace(integer)') and md5(prosrc)='3aef286173c882bf31977f929c741848')
  or not exists(select 1 from pg_proc where oid=to_regprocedure('private.apply_version_intent(jsonb,integer,jsonb)') and md5(prosrc)='a85dd7103fa641ca6f746a91adcf3d6c')
  or not exists(select 1 from pg_proc where oid=to_regprocedure('private.validate_version_write(jsonb,jsonb,text,integer)') and md5(prosrc)='9a7c3bc3627f10f9122720eedf5cfc52') then raise exception 'REWRITE_BASELINE_REQUIRED';end if;
 if to_regprocedure('public.accept_rewrite_version(integer,text,text,text,text,integer,jsonb,text)') is null
  and exists(select 1 from public.resume_versions where extra ? 'ai_rewrite' or coalesce(extra->>'engine_version','') like 'ai-rewrite-%' or coalesce(extra->>'template_version','') like 'ai-rewrite-%') then raise exception 'REWRITE_LEGACY_METADATA_COLLISION';end if;
end$$;
-- Closed by default and on every reapplication. An operator must separately
-- bind this to the current server configuration ID; it is never a client choice.
create or replace function private.rewrite_storage_configuration() returns text language sql stable security invoker set search_path='' as $$select null::text;$$;
revoke all on function private.rewrite_storage_configuration() from public,anon,authenticated;
create or replace function private.rewrite_json_object(v jsonb,keys text[]) returns boolean language sql immutable strict security invoker set search_path='' as $$
 select jsonb_typeof(v)='object' and v ?& keys and v-keys='{}'::jsonb;
$$;
revoke all on function private.rewrite_json_object(jsonb,text[]) from public,anon,authenticated;
create or replace function private.rewrite_storage_ready(p_key_id text,p_configuration_id text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare key bytea;begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_key_id is null or p_key_id!~'^[a-f0-9]{64}$' or p_configuration_id is null or p_configuration_id!~'^[a-f0-9]{64}$'
  or private.rewrite_storage_configuration() is distinct from p_configuration_id then return false;end if;
 select signing_key into key from private.letter_signing_config where singleton;
 return key is not null and encode(extensions.digest(key,'sha256'),'hex')=p_key_id;
end$$;
revoke all on function private.rewrite_storage_ready(text,text) from public,anon,authenticated;
grant execute on function private.rewrite_storage_ready(text,text) to authenticated;
create or replace function public.rewrite_storage_ready(p_key_id text,p_configuration_id text) returns boolean language sql stable security invoker set search_path='' as $$select private.rewrite_storage_ready(p_key_id,p_configuration_id);$$;
revoke all on function public.rewrite_storage_ready(text,text) from public,anon,authenticated;
grant execute on function public.rewrite_storage_ready(text,text) to authenticated;
create or replace function private.rewrite_version_json(r public.resume_versions) returns jsonb language sql stable security invoker set search_path='' as $$
 select r.extra||jsonb_build_object('id',r.id,'created',r.created,'text',r.text,'vacancy',r.vacancy,'score',r.score,'evidence_ids',r.evidence_ids);
$$;
revoke all on function private.rewrite_version_json(public.resume_versions) from public,anon,authenticated;
create or replace function private.validate_fact_write(old_state jsonb,new_state jsonb,p_action text,p_revision integer) returns void language plpgsql security invoker set search_path='' as $$
declare allowed text[];old_facts jsonb;new_facts jsonb;old_versions jsonb;new_versions jsonb;item jsonb;n integer;candidate jsonb;
begin
 -- Only the dedicated authenticated receipt protocol may create this namespace.
 if p_action='version' then
  candidate:=new_state->'versions'->jsonb_array_length(old_state->'versions');
  if candidate ? 'ai_rewrite' or coalesce(candidate->>'engine_version','') like 'ai-rewrite-%' or coalesce(candidate->>'template_version','') like 'ai-rewrite-%' then raise exception 'INVALID_WRITE';end if;
 end if;
 allowed:=case p_action when 'import' then array['original','facts','vacancy'] when 'demo' then array['original','facts','vacancy'] when 'fact' then array['original','facts'] when 'verify' then array['facts'] when 'goal' then array['goal'] when 'vacancy' then array['vacancy'] when 'version' then array['versions'] when 'restore' then array['versions'] when 'application' then array['applications'] else null end;
 if allowed is null or (new_state-allowed) is distinct from (old_state-allowed) then raise exception 'INVALID_WRITE';end if;
 if jsonb_typeof(new_state->'original') is distinct from 'string' or length(new_state->>'original')>1100000 or jsonb_typeof(new_state->'goal') is distinct from 'string' or length(new_state->>'goal')>1000 or jsonb_typeof(new_state->'vacancy') is distinct from 'string' or length(new_state->>'vacancy')>30000 then raise exception 'INVALID_WRITE';end if;
 if jsonb_typeof(new_state->'facts') is distinct from 'array' or jsonb_typeof(new_state->'versions') is distinct from 'array' or jsonb_typeof(new_state->'applications') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
 old_facts:=old_state->'facts';new_facts:=new_state->'facts';old_versions:=old_state->'versions';new_versions:=new_state->'versions';
 if jsonb_array_length(new_facts)>500 or jsonb_array_length(new_versions)>100 or jsonb_array_length(new_state->'applications')>500 then raise exception 'INVALID_WRITE';end if;
 for item in select value from jsonb_array_elements(new_facts) loop
  if jsonb_typeof(item->'verified') is distinct from 'boolean' or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 100 or jsonb_typeof(item->'text') is distinct from 'string' or length(item->>'text') not between 1 and 2000 or jsonb_typeof(item->'source') is distinct from 'string' or length(item->>'source')>500 then raise exception 'INVALID_WRITE';end if;
 end loop;
 if p_action in ('import','demo') then
  if length(new_state->>'original')>100000 or exists(select 1 from jsonb_array_elements(new_facts) f where f->'verified'<>'false'::jsonb) then raise exception 'INVALID_WRITE';end if;
 elsif p_action='verify' then
  if jsonb_array_length(new_facts)<>jsonb_array_length(old_facts) or exists(select 1 from jsonb_array_elements(new_facts) with ordinality f(v,i) where (v-'verified') is distinct from ((old_facts->(i::integer-1))-'verified')) then raise exception 'INVALID_WRITE';end if;
 elsif p_action='fact' then
  n:=jsonb_array_length(old_facts);candidate:=new_facts->n;
  if jsonb_array_length(new_facts)<>n+1 or (new_facts-n)<>old_facts or candidate->'verified' is distinct from 'false'::jsonb or new_state->>'original' is distinct from (old_state->>'original')||E'\n'||(candidate->>'text') then raise exception 'INVALID_WRITE';end if;

 end if;
 if p_action in ('version','restore') then perform private.validate_version_write(old_state,new_state,p_action,p_revision);elsif p_action='application' then perform private.validate_application_write(old_state,new_state);end if;

end;$$;
revoke all on function private.validate_fact_write(jsonb,jsonb,text,integer) from public,anon,authenticated;
create or replace function private.freeze_rewrite_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin if old.extra ? 'ai_rewrite' or new.extra ? 'ai_rewrite' then raise exception 'IMMUTABLE_REWRITE_VERSION';end if;return new;end$$;
revoke all on function private.freeze_rewrite_version() from public,anon,authenticated;
drop trigger if exists rewrite_version_frozen on public.resume_versions;
create trigger rewrite_version_frozen before update on public.resume_versions for each row execute function private.freeze_rewrite_version();
-- Authenticate the server's bounded lexical report and check its literal quote
-- ranges. This is not independent retokenization or semantic/model acceptance.
create or replace function private.rewrite_check_lexical(v jsonb,before_text text,after_text text) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb;span jsonb;quote_source text;manual_count integer:=0;begin
 if private.rewrite_json_object(v,array['format','coverage','semanticAssessment','edited','issues']) is distinct from true
  or v->>'format' is distinct from 'literal-edit-audit-v1' or v->>'coverage' is distinct from 'bounded-lexical-only'
  or v->>'semanticAssessment' is distinct from 'not-performed' or v->'edited' is distinct from to_jsonb(before_text<>after_text)
  or jsonb_typeof(v->'issues') is distinct from 'array' or jsonb_array_length(v->'issues')>128 then return false;end if;
 for item in select value from jsonb_array_elements(v->'issues') loop
  if private.rewrite_json_object(item,array['id','kind','before','after']) is distinct from true
   or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 100
   or jsonb_typeof(item->'kind') is distinct from 'string' or item->>'kind' not in ('manual-edit','number-added','number-removed','negation-added','negation-removed') then return false;end if;
  if item->>'kind'='manual-edit' then
   manual_count:=manual_count+1;if item->>'id' is distinct from 'manual-edit' or item->'before' is distinct from 'null'::jsonb or item->'after' is distinct from 'null'::jsonb then return false;end if;
  else
   if item->>'id'!~('^'||(item->>'kind')||'-[0-9]+$') then return false;end if;
   if right(item->>'kind',7)='removed' then span:=item->'before';quote_source:=before_text;if item->'after' is distinct from 'null'::jsonb then return false;end if;
   else span:=item->'after';quote_source:=after_text;if item->'before' is distinct from 'null'::jsonb then return false;end if;end if;
   if private.rewrite_json_object(span,array['quote','start','end']) is distinct from true or jsonb_typeof(span->'quote') is distinct from 'string'
    or jsonb_typeof(span->'start') is distinct from 'number' or span->>'start'!~'^[0-9]+$' or jsonb_typeof(span->'end') is distinct from 'number' or span->>'end'!~'^[0-9]+$'
    or (span->>'end')::integer>(length(quote_source)) or (span->>'end')::integer<=(span->>'start')::integer
    or substring(quote_source from (span->>'start')::integer+1 for (span->>'end')::integer-(span->>'start')::integer) is distinct from span->>'quote' then return false;end if;
  end if;
 end loop;
 return manual_count=case when before_text<>after_text then 1 else 0 end and (select count(distinct i->>'id') from jsonb_array_elements(v->'issues') i)=jsonb_array_length(v->'issues');
end$$;
revoke all on function private.rewrite_check_lexical(jsonb,text,text) from public,anon,authenticated;
create or replace function private.accept_rewrite_version(p_revision integer,p_payload text,p_signature text,p_key_id text,p_configuration_id text,p_score integer,p_match_metadata jsonb,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();key bytea;expected bytea;body jsonb;inner_receipt jsonb;preview_body jsonb;preview jsonb;src jsonb;review jsonb;
 fact jsonb;current_fact jsonb;decision jsonb;proposal jsonb;chosen jsonb;row_review jsonb;issue jsonb;comparison jsonb;ids jsonb:='[]';ack_ids jsonb;derived_issues jsonb:='[]';preview_row jsonb;
 state jsonb;candidate jsonb;next_state jsonb;archive jsonb;record public.resume_versions%rowtype;current_revision integer;n integer;i integer;
 nonce uuid;issued bigint;expires bigint;preview_issued bigint;accepted_at timestamptz;stamp text;
 line text;trimmed text;offset_cp integer;matches integer;start_cp integer;end_cp integer;at_cp integer;rendered text;rendered_preview text;chosen_text text;proposal_text text;origin text;basis_count integer;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'STORE_REVIEWED_AI_REWRITE' or p_revision is null or p_revision not between 0 and 2147483646
  or p_payload is null or octet_length(p_payload) not between 1 and 262144 or p_signature is null or p_signature!~'^[a-f0-9]{64}$'
  or p_key_id is null or p_key_id!~'^[a-f0-9]{64}$' or p_configuration_id is null or p_configuration_id!~'^[a-f0-9]{64}$' then raise exception 'INVALID_WRITE';end if;
 if not private.rewrite_storage_ready(p_key_id,p_configuration_id) then raise exception 'REWRITE_STORAGE_UNAVAILABLE';end if;
 -- Same key-before-owner lock order as the saved-letter protocol; rotation waits.
 select signing_key into key from private.letter_signing_config where singleton for share;
 if key is null or encode(extensions.digest(key,'sha256'),'hex')<>p_key_id then raise exception 'REWRITE_STORAGE_UNAVAILABLE';end if;
 expected:=extensions.hmac(convert_to('jobmatch-ai-rewrite-review-receipt-v1'||chr(10)||p_payload,'UTF8'),key,'sha256');
 if extensions.hmac(expected,key,'sha256')<>extensions.hmac(decode(p_signature,'hex'),key,'sha256') then raise exception 'INVALID_WRITE';end if;
 begin
  body:=p_payload::jsonb;
  if private.rewrite_json_object(body,array['format','id','issuerKeyId','issuedAt','expiresAt','previewReceipt','review']) is distinct from true
   or body->>'format' is distinct from 'jobmatch-ai-rewrite-review-receipt-v1' or body->>'issuerKeyId' is distinct from p_key_id
   or jsonb_typeof(body->'id') is distinct from 'string' or body->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
   or jsonb_typeof(body->'issuedAt') is distinct from 'number' or body->>'issuedAt'!~'^[0-9]+$' or jsonb_typeof(body->'expiresAt') is distinct from 'number' or body->>'expiresAt'!~'^[0-9]+$' then raise exception 'INVALID_WRITE';end if;
  nonce:=(body->>'id')::uuid;issued:=(body->>'issuedAt')::bigint;expires:=(body->>'expiresAt')::bigint;
  if issued>9007199254740991 or expires>9007199254740991 or issued>=expires then raise exception 'INVALID_WRITE';end if;
  inner_receipt:=body->'previewReceipt';
  if private.rewrite_json_object(inner_receipt,array['payload','signature']) is distinct from true
   or jsonb_typeof(inner_receipt->'payload') is distinct from 'string' or octet_length(inner_receipt->>'payload') not between 1 and 262144
   or jsonb_typeof(inner_receipt->'signature') is distinct from 'string' or inner_receipt->>'signature'!~'^[a-f0-9]{64}$' then raise exception 'INVALID_WRITE';end if;
  expected:=extensions.hmac(convert_to('jobmatch-ai-rewrite-preview-receipt-v1'||chr(10)||(inner_receipt->>'payload'),'UTF8'),key,'sha256');
  if extensions.hmac(expected,key,'sha256')<>extensions.hmac(decode(inner_receipt->>'signature','hex'),key,'sha256') then raise exception 'INVALID_WRITE';end if;
  preview_body:=(inner_receipt->>'payload')::jsonb;preview:=preview_body->'preview';src:=preview->'source';review:=body->'review';
  if private.rewrite_json_object(preview_body,array['format','id','issuerKeyId','issuedAt','expiresAt','preview']) is distinct from true
   or preview_body->>'format' is distinct from 'jobmatch-ai-rewrite-preview-receipt-v1' or preview_body->>'issuerKeyId' is distinct from p_key_id
   or jsonb_typeof(preview_body->'id') is distinct from 'string' or preview_body->>'id'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
   or jsonb_typeof(preview_body->'issuedAt') is distinct from 'number' or preview_body->>'issuedAt'!~'^[0-9]+$'
   or preview_body->'expiresAt' is distinct from body->'expiresAt' then raise exception 'INVALID_WRITE';end if;
  preview_issued:=(preview_body->>'issuedAt')::bigint;
  if preview_issued>9007199254740391 or expires<>preview_issued+600 or issued<preview_issued-5 then raise exception 'INVALID_WRITE';end if;
  if private.rewrite_json_object(preview,array['format','generator','modelAcceptance','modelIdentity','semanticAssessment','sourceVerification','reviewStatus','promptVersion','promptSha256','configurationId','declaredModel','requestedLanguage','source','claims','review','text']) is distinct from true
   or preview->>'format' is distinct from 'jobmatch-ai-rewrite-preview-v1' or preview->>'generator' is distinct from 'ai-proposed-paraphrase'
   or preview->>'modelAcceptance' is distinct from 'not-accepted' or preview->>'modelIdentity' is distinct from 'unverified' or preview->>'semanticAssessment' is distinct from 'not-performed'
   or preview->>'sourceVerification' is distinct from 'current-at-preview-only' or preview->>'reviewStatus' is distinct from 'not-reviewed'
   or preview->>'promptVersion' is distinct from 'per-fact-paraphrase-v1' or preview->>'promptSha256' is distinct from 'e531f3a6d343ae61773928fc6e2d3aec58aa2804af2e34e01ad039bbf2d48a7f'
   or preview->>'configurationId' is distinct from p_configuration_id or jsonb_typeof(preview->'requestedLanguage') is distinct from 'string' or preview->>'requestedLanguage' not in ('ru','en')
   or jsonb_typeof(preview->'declaredModel') is distinct from 'string' or length(preview->>'declaredModel') not between 1 and 100 or preview->>'declaredModel'!~'^[a-zA-Z0-9_./:-]+$'
   or jsonb_typeof(preview->'text') is distinct from 'string' or length(preview->>'text') not between 1 and 300000 then raise exception 'INVALID_WRITE';end if;
  if private.rewrite_json_object(src,array['ownerId','revision','originalSha256','originalLength','vacancy','facts']) is distinct from true
   or src->>'ownerId' is distinct from uid::text or src->'revision' is distinct from to_jsonb(p_revision)
   or jsonb_typeof(src->'originalSha256') is distinct from 'string' or src->>'originalSha256'!~'^[a-f0-9]{64}$'
   or jsonb_typeof(src->'originalLength') is distinct from 'number' or src->>'originalLength'!~'^[0-9]+$' or (src->>'originalLength')::integer not between 1 and 100000
   or jsonb_typeof(src->'vacancy') is distinct from 'string' or length(src->>'vacancy') not between 1 and 30000
   or jsonb_typeof(src->'facts') is distinct from 'array' or jsonb_array_length(src->'facts') not between 1 and 12 then raise exception 'INVALID_WRITE';end if;
  n:=jsonb_array_length(src->'facts');
  if (select count(distinct f->>'id') from jsonb_array_elements(src->'facts') f)<>n then raise exception 'INVALID_WRITE';end if;
  if private.rewrite_json_object(review,array['format','source','configurationId','promptSha256','requestedLanguage','proposalClaims','decisions','claims','rows','issues','text','coverage','semanticAssessment','modelAcceptance','reviewSha256','reviewStatus','confirmation']) is distinct from true
   or review->>'format' is distinct from 'jobmatch-ai-rewrite-human-review-v1' or review->'source' is distinct from src
   or review->'configurationId' is distinct from preview->'configurationId' or review->'promptSha256' is distinct from preview->'promptSha256'
   or review->'requestedLanguage' is distinct from preview->'requestedLanguage' or review->'proposalClaims' is distinct from preview->'claims'
   or review->>'coverage' is distinct from 'bounded-lexical-only' or review->>'semanticAssessment' is distinct from 'not-performed'
   or review->>'modelAcceptance' is distinct from 'not-accepted' or review->>'reviewStatus' is distinct from 'user-confirmed'
   or jsonb_typeof(review->'reviewSha256') is distinct from 'string' or review->>'reviewSha256'!~'^[a-f0-9]{64}$'
   or jsonb_typeof(review->'text') is distinct from 'string' or length(review->>'text') not between 1 and 300000 then raise exception 'INVALID_WRITE';end if;
  foreach line in array array['decisions','claims','rows'] loop
   if jsonb_typeof(review->line) is distinct from 'array' or jsonb_array_length(review->line)<>n then raise exception 'INVALID_WRITE';end if;
  end loop;
  if jsonb_typeof(preview->'claims') is distinct from 'array' or jsonb_array_length(preview->'claims')<>n
   or jsonb_typeof(review->'issues') is distinct from 'array' or jsonb_array_length(review->'issues')>128
   or private.rewrite_json_object(review->'confirmation',array['consent','reviewed','acknowledgedReviewSha256','acknowledgedIssueIds']) is distinct from true
   or review#>'{confirmation,consent}' is distinct from 'true'::jsonb or review#>'{confirmation,reviewed}' is distinct from 'true'::jsonb
   or review#>'{confirmation,acknowledgedReviewSha256}' is distinct from review->'reviewSha256' then raise exception 'INVALID_WRITE';end if;
  if private.rewrite_json_object(preview->'review',array['format','coverage','semanticAssessment','claims']) is distinct from true
   or preview#>>'{review,format}' is distinct from 'jobmatch-ai-rewrite-review-v1' or preview#>>'{review,coverage}' is distinct from 'bounded-lexical-only'
   or preview#>>'{review,semanticAssessment}' is distinct from 'not-performed' or jsonb_typeof(preview#>'{review,claims}') is distinct from 'array'
   or jsonb_array_length(preview#>'{review,claims}')<>n then raise exception 'INVALID_WRITE';end if;
  for i in 0..n-1 loop
   fact:=src->'facts'->i;decision:=review->'decisions'->i;proposal:=preview->'claims'->i;chosen:=review->'claims'->i;row_review:=review->'rows'->i;
   if private.rewrite_json_object(fact,array['id','text','source','verified','start','end']) is distinct from true
    or jsonb_typeof(fact->'id') is distinct from 'string' or length(fact->>'id') not between 1 and 100 or private.trim_fact_line(fact->>'id')=''
    or jsonb_typeof(fact->'text') is distinct from 'string' or length(fact->>'text') not between 1 and 2000 or private.trim_fact_line(fact->>'text')=''
    or jsonb_typeof(fact->'source') is distinct from 'string' or length(fact->>'source') not between 1 and 500 or private.trim_fact_line(fact->>'source')=''
    or fact->'verified' is distinct from 'true'::jsonb or jsonb_typeof(fact->'start') is distinct from 'number' or fact->>'start'!~'^[0-9]+$'
    or jsonb_typeof(fact->'end') is distinct from 'number' or fact->>'end'!~'^[0-9]+$' then raise exception 'INVALID_WRITE';end if;
   start_cp:=(fact->>'start')::integer;end_cp:=(fact->>'end')::integer;
   if end_cp> (src->>'originalLength')::integer or end_cp-start_cp<>length(fact->>'text') then raise exception 'INVALID_WRITE';end if;
   ids:=ids||jsonb_build_array(fact->'id');
   if private.rewrite_json_object(proposal,array['fact_id','status','text']) is distinct from true or proposal->'fact_id' is distinct from fact->'id'
    or jsonb_typeof(proposal->'status') is distinct from 'string' or proposal->>'status' not in ('proposed','refused')
    or not((proposal->>'status'='proposed' and jsonb_typeof(proposal->'text')='string' and length(proposal->>'text') between 1 and 2000 and private.trim_fact_line(proposal->>'text')<>'') or (proposal->>'status'='refused' and proposal->'text'='null'::jsonb)) then raise exception 'INVALID_WRITE';end if;
   proposal_text:=coalesce(proposal->>'text',fact->>'text');preview_row:=preview#>'{review,claims}'->i;
   if private.rewrite_json_object(preview_row,array['fact_id','status','changed','lexical']) is distinct from true
    or preview_row->'fact_id' is distinct from fact->'id' or preview_row->'status' is distinct from proposal->'status'
    or preview_row->'changed' is distinct from to_jsonb(proposal->>'status'='proposed' and proposal_text<>fact->>'text')
    or private.rewrite_check_lexical(preview_row->'lexical',fact->>'text',proposal_text) is distinct from true then raise exception 'INVALID_WRITE';end if;
   if decision->'fact_id' is distinct from fact->'id' or decision->'reviewed' is distinct from 'true'::jsonb
    or jsonb_typeof(decision->'action') is distinct from 'string' or decision->>'action' not in ('keep-source','accept-proposal','edit') then raise exception 'INVALID_WRITE';end if;
   if private.rewrite_json_object(decision,case when decision->>'action'='edit' then array['fact_id','reviewed','action','text'] else array['fact_id','reviewed','action'] end) is distinct from true then raise exception 'INVALID_WRITE';end if;
   if decision->>'action'='keep-source' then chosen_text:=fact->>'text';origin:='source';basis_count:=0;
   elsif decision->>'action'='accept-proposal' then
    if proposal->>'status' is distinct from 'proposed' then raise exception 'INVALID_WRITE';end if;chosen_text:=proposal->>'text';origin:='model-proposal';basis_count:=1;
   else
    if jsonb_typeof(decision->'text') is distinct from 'string' or length(decision->>'text') not between 1 and 2000 or private.trim_fact_line(decision->>'text')='' then raise exception 'INVALID_WRITE';end if;
    chosen_text:=decision->>'text';origin:='manual';basis_count:=case when proposal->>'status'='proposed' then 2 else 1 end;
   end if;
   if chosen is distinct from jsonb_build_object('fact_id',fact->'id','status','proposed','text',chosen_text)
    or private.rewrite_json_object(row_review,array['fact_id','origin','comparisons']) is distinct from true
    or row_review->'fact_id' is distinct from fact->'id' or row_review->>'origin' is distinct from origin
    or jsonb_typeof(row_review->'comparisons') is distinct from 'array' or jsonb_array_length(row_review->'comparisons')<>basis_count then raise exception 'INVALID_WRITE';end if;
   if basis_count>0 and row_review#>>'{comparisons,0,basis}' is distinct from 'source' or basis_count=2 and row_review#>>'{comparisons,1,basis}' is distinct from 'proposal' then raise exception 'INVALID_WRITE';end if;
   for comparison in select value from jsonb_array_elements(row_review->'comparisons') loop
    if private.rewrite_json_object(comparison,array['basis','lexical']) is distinct from true
     or jsonb_typeof(comparison->'basis') is distinct from 'string' or comparison->>'basis' not in ('source','proposal')
     or comparison#>>'{lexical,format}' is distinct from 'literal-edit-audit-v1' or comparison#>>'{lexical,coverage}' is distinct from 'bounded-lexical-only'
     or comparison#>>'{lexical,semanticAssessment}' is distinct from 'not-performed' or jsonb_typeof(comparison#>'{lexical,issues}') is distinct from 'array'
     or jsonb_array_length(comparison#>'{lexical,issues}')>128 then raise exception 'INVALID_WRITE';end if;
    if private.rewrite_check_lexical(comparison->'lexical',case when comparison->>'basis'='source' then fact->>'text' else proposal_text end,chosen_text) is distinct from true then raise exception 'INVALID_WRITE';end if;
    for issue in select value from jsonb_array_elements(comparison#>'{lexical,issues}') loop
     derived_issues:=derived_issues||jsonb_build_array(jsonb_build_object('id',format('[%s,%s,%s]',to_jsonb(fact->>'id')::text,to_jsonb(comparison->>'basis')::text,to_jsonb(issue->>'id')::text),'fact_id',fact->'id','basis',comparison->'basis','issue',issue));
    end loop;
   end loop;
  end loop;
  if review->'issues' is distinct from derived_issues then raise exception 'INVALID_WRITE';end if;
  for issue in select value from jsonb_array_elements(review->'issues') loop
   if private.rewrite_json_object(issue,array['id','fact_id','basis','issue']) is distinct from true
    or jsonb_typeof(issue->'id') is distinct from 'string' or length(issue->>'id') not between 1 and 1024
    or not ids ? (issue->>'fact_id') or jsonb_typeof(issue->'basis') is distinct from 'string' or issue->>'basis' not in ('source','proposal')
    or jsonb_typeof(issue->'issue') is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
  end loop;
  select coalesce(jsonb_agg(v->'id' order by pos),'[]') into ack_ids from jsonb_array_elements(review->'issues') with ordinality a(v,pos);
  if (select count(distinct v) from jsonb_array_elements(ack_ids) v)<>jsonb_array_length(ack_ids)
   or review#>'{confirmation,acknowledgedIssueIds}' is distinct from ack_ids then raise exception 'INVALID_WRITE';end if;
 exception when data_exception then raise exception 'INVALID_WRITE';end;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.workspaces where user_id=uid for update;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if not private.rewrite_storage_ready(p_key_id,p_configuration_id) then raise exception 'REWRITE_STORAGE_UNAVAILABLE';end if;
 accepted_at:=clock_timestamp();
 if issued>extract(epoch from accepted_at)+5 or preview_issued>extract(epoch from accepted_at)+5 or expires<=extract(epoch from accepted_at) then raise exception 'INVALID_WRITE';end if;
 select * into record from public.resume_versions where user_id=uid and id=nonce::text;
 if found then
  -- Duplicate ACK only while the current acceptance capability/key/deadline is
  -- still valid. Historical reads, not replay, handle expiry/rotation/disable.
  if record.extra#>'{ai_rewrite,receipt}' is distinct from jsonb_build_object('payload',p_payload,'signature',p_signature)
   or record.extra->'profile_revision' is distinct from to_jsonb(p_revision) or record.score is distinct from p_score or record.extra->'match_metadata' is distinct from p_match_metadata then raise exception 'CONFLICT';end if;
  if not private.session_is_active() then raise exception 'AUTH';end if;
  if not private.rewrite_storage_ready(p_key_id,p_configuration_id) then raise exception 'REWRITE_STORAGE_UNAVAILABLE';end if;
  if expires<=extract(epoch from clock_timestamp()) then raise exception 'INVALID_WRITE';end if;
  return jsonb_build_object('format','jobmatch-ai-rewrite-save-result-v1','ownerId',uid,'workspaceRevision',p_revision+1,'version',private.rewrite_version_json(record));
 end if;
 if current_revision is distinct from p_revision then raise exception 'CONFLICT';end if;
 state:=private.locked_workspace(p_revision);
 if src->>'originalSha256' is distinct from encode(extensions.digest(convert_to(state->>'original','UTF8'),'sha256'),'hex')
  or src->>'originalLength' is distinct from length(state->>'original')::text or src->>'vacancy' is distinct from state->>'vacancy' then raise exception 'CONFLICT';end if;
 if (select coalesce(jsonb_agg(f->'id' order by pos),'[]') from jsonb_array_elements(state->'facts') with ordinality a(f,pos) where ids ? (f->>'id')) is distinct from ids then raise exception 'CONFLICT';end if;
 for fact in select value from jsonb_array_elements(src->'facts') loop
  select jsonb_build_object('id',f->'id','text',f->'text','source',f->'source','verified',f->'verified') into current_fact from jsonb_array_elements(state->'facts') f where f->>'id'=fact->>'id';
  if current_fact is distinct from fact-array['start','end'] then raise exception 'CONFLICT';end if;
  matches:=0;offset_cp:=0;
  for line in select value from regexp_split_to_table(state->>'original',E'\n') value loop
   trimmed:=private.trim_fact_line(line);
   if trimmed=fact->>'text' then
    matches:=matches+1;
    if (fact->>'start')::integer<>offset_cp+strpos(line,trimmed)-1 then raise exception 'CONFLICT';end if;
   end if;
   offset_cp:=offset_cp+length(line)+1;
  end loop;
  if matches<>1 then raise exception 'CONFLICT';end if;
 end loop;
 rendered:='';rendered_preview:='';at_cp:=0;
 for fact in select value from jsonb_array_elements(src->'facts') a(value) order by (value->>'start')::integer loop
  start_cp:=(fact->>'start')::integer;end_cp:=(fact->>'end')::integer;
  if start_cp<at_cp or substring(state->>'original' from start_cp+1 for end_cp-start_cp) is distinct from fact->>'text' then raise exception 'CONFLICT';end if;
  select value->>'text' into chosen_text from jsonb_array_elements(review->'claims') value where value->'fact_id'=fact->'id';
  select coalesce(value->>'text',fact->>'text') into proposal_text from jsonb_array_elements(preview->'claims') value where value->'fact_id'=fact->'id';
  rendered_preview:=rendered_preview||substring(state->>'original' from at_cp+1 for start_cp-at_cp)||proposal_text;
  rendered:=rendered||substring(state->>'original' from at_cp+1 for start_cp-at_cp)||chosen_text;at_cp:=end_cp;
 end loop;
 rendered:=rendered||substring(state->>'original' from at_cp+1);
 rendered_preview:=rendered_preview||substring(state->>'original' from at_cp+1);
 if rendered is distinct from review->>'text' or rendered_preview is distinct from preview->>'text' then raise exception 'INVALID_WRITE';end if;
 -- Reuse the frozen native literal constructor solely for lifecycle/evidence and
 -- the existing server-evaluated score-metadata shape. No SQL relevance attestation.
 next_state:=private.apply_version_intent(state,p_revision,jsonb_build_object('action','version','evidence_ids',ids,'score',p_score,'match_metadata',p_match_metadata));
 candidate:=next_state->'versions'->-1;
 stamp:=to_char(accepted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 archive:=jsonb_build_object('format','jobmatch-ai-rewrite-archive-v1','ownerId',uid,'acceptedAt',stamp,'sourceOriginal',state->>'original',
  'receipt',jsonb_build_object('payload',p_payload,'signature',p_signature),
  'receiptSha256',encode(extensions.digest(convert_to('jobmatch-ai-rewrite-archive-receipt-v1'||chr(10)||p_payload||chr(10)||p_signature,'UTF8'),'sha256'),'hex'),
  'sourceVerification','current-at-storage-acceptance','receiptSignature','verified-at-storage-acceptance','storageConsent','STORE_REVIEWED_AI_REWRITE',
  'contentReview','user-declared-only','semanticAssessment','not-performed','modelAcceptance','not-accepted');
 if octet_length(archive::text)>1048576 then raise exception 'INVALID_WRITE';end if;
 candidate:=candidate||jsonb_build_object('id',nonce::text,'created',stamp,'text',rendered,'engine_version','ai-rewrite-human-reviewed-v1','template_version','ai-rewrite-reviewed-v1','ai_rewrite',archive);
 next_state:=jsonb_set(state,'{versions}',(state->'versions')||jsonb_build_array(candidate));
 if octet_length(next_state::text)>=15000000 then raise exception 'INVALID_WRITE';end if;
 insert into public.resume_versions(user_id,id,position,created,text,vacancy,score,evidence_ids,extra)
 values(uid,nonce::text,jsonb_array_length(state->'versions')+1,stamp,rendered,candidate->>'vacancy',p_score,ids,candidate-array['id','created','text','vacancy','score','evidence_ids']) returning * into record;
 update public.workspaces set revision=p_revision+1,updated_at=now() where user_id=uid;
 insert into public.audit_log(user_id,action) values(uid,'ai-rewrite-version-accept');
 insert into public.consent_records(user_id,version) values(uid,'privacy-v1') on conflict do nothing;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if not private.rewrite_storage_ready(p_key_id,p_configuration_id) then raise exception 'REWRITE_STORAGE_UNAVAILABLE';end if;
 if expires<=extract(epoch from clock_timestamp()) then raise exception 'INVALID_WRITE';end if;
 if private.locked_workspace(p_revision+1) is distinct from next_state then raise exception 'PROJECTION_CONFLICT';end if;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if not private.rewrite_storage_ready(p_key_id,p_configuration_id) then raise exception 'REWRITE_STORAGE_UNAVAILABLE';end if;
 if expires<=extract(epoch from clock_timestamp()) then raise exception 'INVALID_WRITE';end if;
 return jsonb_build_object('format','jobmatch-ai-rewrite-save-result-v1','ownerId',uid,'workspaceRevision',p_revision+1,'version',private.rewrite_version_json(record));
end$$;
revoke all on function private.accept_rewrite_version(integer,text,text,text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function private.accept_rewrite_version(integer,text,text,text,text,integer,jsonb,text) to authenticated;
create or replace function public.accept_rewrite_version(p_revision integer,p_payload text,p_signature text,p_key_id text,p_configuration_id text,p_score integer,p_match_metadata jsonb,p_accept text) returns jsonb
language sql security invoker set search_path='' as $$select private.accept_rewrite_version(p_revision,p_payload,p_signature,p_key_id,p_configuration_id,p_score,p_match_metadata,p_accept);$$;
revoke all on function public.accept_rewrite_version(integer,text,text,text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.accept_rewrite_version(integer,text,text,text,text,integer,jsonb,text) to authenticated;
do $$declare f record;begin if exists(select 1 from pg_roles where rolname='service_role') then
 -- Do not let hosted default grants create attested-looking rows through a
 -- privileged REST/table or projection-helper bypass. Owner JWT commands keep
 -- their normal guarded grants; administrative SQL remains an operator action.
 revoke insert,update on public.resume_versions from service_role;
 revoke all on function private.project_workspace(uuid,jsonb),private.commit_workspace(integer,jsonb,text) from service_role;
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and (p.proname like 'rewrite_%' or p.proname in ('accept_rewrite_version','freeze_rewrite_version')) loop
  execute format('revoke all on function %s from service_role',f.oid::regprocedure);
 end loop;
end if;end$$;
commit;

