-- Compatible English saved letters. No rows, keys or feature flags are changed.
create or replace function private.accept_saved_letter(p_workspace_revision integer,p_letter_revision integer,p_payload text,p_signature text,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();key bytea;expected bytea;body jsonb;src jsonb;snap jsonb;facts jsonb;selected jsonb;fact jsonb;current_fact jsonb;state jsonb;
 issued bigint;expires bigint;current_revision integer;current_letters integer;accepted_at timestamptz;nonce uuid;record public.saved_letter_versions%rowtype;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'SAVE_REVIEWED_LETTER_VERSION' or p_workspace_revision is null or p_workspace_revision<0 or p_letter_revision is null or p_letter_revision not between 0 and 49
  or p_payload is null or octet_length(p_payload) not between 1 and 262144 or p_signature is null or p_signature!~'^[a-f0-9]{64}$' then raise exception 'INVALID_WRITE';end if;
 -- Rotation conflicts with this shared row lock; no historical key is exported.
 select signing_key into key from private.letter_signing_config where singleton for share;
 if key is null then raise exception 'LETTER_UNAVAILABLE';end if;
 expected:=extensions.hmac(convert_to('jobmatch-letter-receipt-v1'||chr(10)||p_payload,'UTF8'),key,'sha256');
 if extensions.hmac(expected,key,'sha256')<>extensions.hmac(decode(p_signature,'hex'),key,'sha256') then raise exception 'INVALID_WRITE';end if;
 begin
  body:=p_payload::jsonb;src:=body->'source';snap:=body->'snapshot';
  if jsonb_typeof(body) is distinct from 'object' or jsonb_typeof(src) is distinct from 'object' or jsonb_typeof(snap) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
  if array(select jsonb_object_keys(body) order by 1) is distinct from array['expiresAt','format','id','issuedAt','issuerKeyId','snapshot','source']
   or array(select jsonb_object_keys(src) order by 1) is distinct from array['letterRevision','originalSha256','ownerId','workspaceRevision']
   or body->>'format' is distinct from 'jobmatch-letter-receipt-v1' or body->>'issuerKeyId' is distinct from encode(extensions.digest(key,'sha256'),'hex')
   or (src->>'ownerId')::uuid is distinct from uid or src->>'originalSha256'!~'^[a-f0-9]{64}$'
   or jsonb_typeof(body->'id') is distinct from 'string' or jsonb_typeof(body->'issuedAt') is distinct from 'number' or jsonb_typeof(body->'expiresAt') is distinct from 'number'
   or body->>'issuedAt'!~'^[0-9]+$' or body->>'expiresAt'!~'^[0-9]+$'
   or jsonb_typeof(src->'workspaceRevision') is distinct from 'number' or jsonb_typeof(src->'letterRevision') is distinct from 'number'
   or src->>'workspaceRevision'!~'^[0-9]+$' or src->>'letterRevision'!~'^[0-9]+$'
   or (src->>'workspaceRevision')::integer is distinct from p_workspace_revision or (src->>'letterRevision')::integer is distinct from p_letter_revision
   or ((snap->>'format' is not distinct from 'jobmatch-local-letter-snapshot-v1' and snap->>'templateVersion' is not distinct from 'main-ru-letter-81cb1a6-v1')
     or (snap->>'format' is not distinct from 'jobmatch-english-letter-record-v1' and snap->>'templateVersion' is not distinct from 'main-en-letter-v1'
      and snap->>'documentLanguage' is not distinct from 'en' and snap->>'contentReview' is not distinct from 'reported-user-review'
      and snap->>'semanticAssessment' is not distinct from 'not-performed' and snap->'modelVersion' is not distinct from 'null'::jsonb
      and array(select jsonb_object_keys(snap) order by 1) is not distinct from array['approval','contentReview','documentLanguage','format','generated','modelVersion','review','selection','semanticAssessment','source','style','templateVersion','text','trust'])) is not true
   or snap->>'trust' is distinct from 'unsigned-editable-local-snapshot'
   or jsonb_typeof(snap->'style') is distinct from 'string' or snap->>'style' not in ('professional','brief','confident','executive')
   or jsonb_typeof(snap->'generated') is distinct from 'string' or jsonb_typeof(snap->'text') is distinct from 'string'
   or length(snap->>'generated') not between 1 and 15000 or length(snap->>'text') not between 1 and 15000
   or snap#>>'{review,format}' is distinct from 'literal-edit-audit-v1' or snap#>>'{review,coverage}' is distinct from 'bounded-lexical-only'
   or snap#>>'{review,semanticAssessment}' is distinct from 'not-performed' or snap#>'{approval,wholeLetter}' is distinct from 'true'::jsonb
   or snap#>'{review,edited}' is distinct from to_jsonb((snap->>'generated')<>(snap->>'text')) then raise exception 'INVALID_WRITE';end if;
  nonce:=(body->>'id')::uuid;issued:=(body->>'issuedAt')::bigint;expires:=(body->>'expiresAt')::bigint;
  if issued>9007199254740391 or expires<>issued+600 then raise exception 'INVALID_WRITE';end if;
  facts:=snap#>'{source,facts}';selected:=snap->'selection';
  if jsonb_typeof(facts) is distinct from 'array' or jsonb_typeof(selected) is distinct from 'array' or jsonb_array_length(facts) not between 1 and 5
   or jsonb_array_length(facts)<>jsonb_array_length(selected) or jsonb_typeof(snap#>'{source,vacancy}') is distinct from 'string'
   or length(snap#>>'{source,vacancy}') not between 1 and 30000 then raise exception 'INVALID_WRITE';end if;
  if (select count(distinct f->>'id') from jsonb_array_elements(facts) f)<>jsonb_array_length(facts)
   or (select count(distinct s) from jsonb_array_elements_text(selected) s)<>jsonb_array_length(selected) then raise exception 'INVALID_WRITE';end if;
 exception when data_exception then raise exception 'INVALID_WRITE';end;
 -- Same advisory/workspace order as legacy and command writers; no source can race acceptance.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.workspaces where user_id=uid for update;
 if current_revision is distinct from p_workspace_revision then raise exception 'CONFLICT';end if;
 select coalesce(max(version),0) into current_letters from public.saved_letter_versions where user_id=uid;
 if current_letters<>p_letter_revision then raise exception 'CONFLICT';end if;
 state:=public.read_workspace();
 if src->>'originalSha256' is distinct from encode(extensions.digest(convert_to(state->>'original','UTF8'),'sha256'),'hex') or snap#>>'{source,vacancy}' is distinct from state->>'vacancy' then raise exception 'CONFLICT';end if;
 for fact in select value from jsonb_array_elements(facts) loop
  if jsonb_typeof(fact) is distinct from 'object' or fact->'verified' is distinct from 'true'::jsonb or jsonb_typeof(fact->'id') is distinct from 'string'
   or jsonb_typeof(fact->'text') is distinct from 'string' or jsonb_typeof(fact->'source') is distinct from 'string'
   or length(fact->>'id') not between 1 and 200 or length(fact->>'text') not between 1 and 2000 or length(fact->>'source') not between 1 and 2000
   or not selected ? ('edit-'||(fact->>'id')) then raise exception 'INVALID_WRITE';end if;
  select jsonb_build_object('id',f->'id','text',f->'text','source',f->'source','verified',f->'verified') into current_fact from jsonb_array_elements(state->'facts') f where f->>'id'=fact->>'id';
  if current_fact is distinct from fact then raise exception 'CONFLICT';end if;
 end loop;
 accepted_at:=clock_timestamp();
 if issued>extract(epoch from accepted_at)+5 or expires<=extract(epoch from accepted_at) then raise exception 'INVALID_WRITE';end if;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 insert into public.saved_letter_versions(user_id,id,version,created,payload,signature,payload_sha256)
 values(uid,nonce,p_letter_revision+1,accepted_at,p_payload,p_signature,encode(extensions.digest(convert_to(p_payload,'UTF8'),'sha256'),'hex')) returning * into record;
 insert into public.audit_log(user_id,action) values(uid,'saved-letter-accept');
 return jsonb_build_object('state',private.read_saved_letters(),'record',private.saved_letter_json(record));
end$$;

-- Separate English capability avoids issuing an unusable English preview against an old schema.
create function private.english_letter_signing_ready(p_key_id text) returns boolean
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 return private.letter_signing_ready(p_key_id);
end$$;
revoke all on function private.english_letter_signing_ready(text) from public,anon,authenticated;
create function public.english_letter_signing_ready(p_key_id text) returns boolean
language sql security invoker set search_path='' as $$select private.english_letter_signing_ready(p_key_id);$$;
revoke all on function public.english_letter_signing_ready(text) from public,anon,authenticated;
grant execute on function private.english_letter_signing_ready(text),public.english_letter_signing_ready(text) to authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then
 revoke all on function private.english_letter_signing_ready(text),public.english_letter_signing_ready(text) from service_role;
end if;end$$;
