-- Saved letter versions: source-only change; no key is seeded and no provider operation is performed.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$begin if not exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto' and n.nspname='extensions') then raise exception 'LETTER_REQUIRES_PGCRYPTO_IN_EXTENSIONS';end if;end$$;
create table private.letter_signing_config(singleton boolean primary key default true check(singleton),signing_key bytea not null check(octet_length(signing_key)=32));
alter table private.letter_signing_config enable row level security;
revoke all on private.letter_signing_config from public,anon,authenticated;
create table public.saved_letter_versions(
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id uuid not null,version integer not null check(version between 1 and 50),created timestamptz not null,
 payload text not null check(octet_length(payload) between 1 and 262144),signature text not null check(signature~'^[a-f0-9]{64}$'),
 payload_sha256 text not null check(payload_sha256~'^[a-f0-9]{64}$' and payload_sha256=encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex')),
 primary key(user_id,id),unique(user_id,version)
);
alter table public.saved_letter_versions enable row level security;
revoke all on public.saved_letter_versions from public,anon,authenticated;
grant select on public.saved_letter_versions to authenticated;
create policy saved_letters_owner on public.saved_letter_versions for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));
create function private.freeze_saved_letter() returns trigger language plpgsql set search_path='' as $$begin raise exception 'IMMUTABLE_SAVED_LETTER';end$$;
revoke all on function private.freeze_saved_letter() from public,anon,authenticated;
create trigger saved_letter_frozen before update on public.saved_letter_versions for each row execute function private.freeze_saved_letter();

create function private.letter_signing_ready(p_key_id text) returns boolean language plpgsql security definer set search_path='' as $$
declare key bytea;begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_key_id is null or p_key_id!~'^[a-f0-9]{64}$' then return false;end if;
 select signing_key into key from private.letter_signing_config where singleton;
 return key is not null and encode(extensions.digest(key,'sha256'),'hex')=p_key_id;
end$$;
revoke all on function private.letter_signing_ready(text) from public,anon,authenticated;
grant execute on function private.letter_signing_ready(text) to authenticated;
create function public.letter_signing_ready(p_key_id text) returns boolean language sql security invoker set search_path='' as $$select private.letter_signing_ready(p_key_id);$$;
revoke all on function public.letter_signing_ready(text) from public,anon,authenticated;
grant execute on function public.letter_signing_ready(text) to authenticated;

create function private.saved_letter_json(r public.saved_letter_versions) returns jsonb language sql stable set search_path='' set timezone='UTC' as $$
 select jsonb_build_object('format','jobmatch-saved-letter-version-v1','ownerId',r.user_id,'id',r.id,'version',r.version,'created',r.created,
 'receipt',jsonb_build_object('payload',r.payload,'signature',r.signature),'payloadSha256',r.payload_sha256,'issuer','server-key-holder',
 'sourceVerification','current-at-acceptance','receiptSignature','verified-at-acceptance','contentReview','reported-user-review','semanticAssessment','not-performed','modelVersion',null);
$$;
revoke all on function private.saved_letter_json(public.saved_letter_versions) from public,anon,authenticated;
create function private.read_saved_letters() returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();items jsonb;revision integer;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select coalesce(max(version),0),coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'created',created,
 'workspaceRevision',(payload::jsonb#>>'{source,workspaceRevision}')::integer,'templateVersion',payload::jsonb#>>'{snapshot,templateVersion}',
 'style',payload::jsonb#>>'{snapshot,style}','edited',(payload::jsonb#>>'{snapshot,review,edited}')::boolean,'payloadSha256',payload_sha256) order by version desc),'[]'::jsonb)
 into revision,items from public.saved_letter_versions where user_id=uid;
 return jsonb_build_object('format','jobmatch-saved-letters-state-v1','ownerId',uid,'revision',revision,'items',items);
end$$;
revoke all on function private.read_saved_letters() from public,anon,authenticated;
grant execute on function private.read_saved_letters() to authenticated;
create function public.read_saved_letters() returns jsonb language sql security invoker set search_path='' as $$select private.read_saved_letters();$$;
revoke all on function public.read_saved_letters() from public,anon,authenticated;
grant execute on function public.read_saved_letters() to authenticated;
create function private.read_saved_letter(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select private.saved_letter_json(r) into result from public.saved_letter_versions r where user_id=uid and id=p_id;return result;
end$$;
revoke all on function private.read_saved_letter(uuid) from public,anon,authenticated;
grant execute on function private.read_saved_letter(uuid) to authenticated;
create function public.read_saved_letter(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.read_saved_letter(p_id);$$;
revoke all on function public.read_saved_letter(uuid) from public,anon,authenticated;
grant execute on function public.read_saved_letter(uuid) to authenticated;

create function private.accept_saved_letter(p_workspace_revision integer,p_letter_revision integer,p_payload text,p_signature text,p_accept text) returns jsonb
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
   or snap->>'format' is distinct from 'jobmatch-local-letter-snapshot-v1' or snap->>'trust' is distinct from 'unsigned-editable-local-snapshot'
   or snap->>'templateVersion' is distinct from 'main-ru-letter-81cb1a6-v1' or jsonb_typeof(snap->'style') is distinct from 'string' or snap->>'style' not in ('professional','brief','confident','executive')
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
revoke all on function private.accept_saved_letter(integer,integer,text,text,text) from public,anon,authenticated;
grant execute on function private.accept_saved_letter(integer,integer,text,text,text) to authenticated;
create function public.accept_saved_letter(p_workspace_revision integer,p_letter_revision integer,p_payload text,p_signature text,p_accept text) returns jsonb
language sql security invoker set search_path='' as $$select private.accept_saved_letter(p_workspace_revision,p_letter_revision,p_payload,p_signature,p_accept);$$;
revoke all on function public.accept_saved_letter(integer,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.accept_saved_letter(integer,integer,text,text,text) to authenticated;
-- Existing projects can have automatic service-role grants; application RPCs use user JWTs only.
do $$declare r record;begin if exists(select 1 from pg_roles where rolname='service_role') then
 execute 'revoke all on private.letter_signing_config,public.saved_letter_versions from service_role';
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('freeze_saved_letter','letter_signing_ready','saved_letter_json','read_saved_letters','read_saved_letter','accept_saved_letter') loop
 execute format('revoke all on function %s from service_role',r.oid::regprocedure);end loop;
end if;end$$;
