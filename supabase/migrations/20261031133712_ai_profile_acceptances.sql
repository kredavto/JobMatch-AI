create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$begin
 if not exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto' and n.nspname='extensions') then raise exception 'AI_PROFILE_REQUIRES_PGCRYPTO_IN_EXTENSIONS';end if;
end$$;
-- User-reviewed AI field batches. No deployment key or user data is seeded.
-- Source-only change; no Supabase CLI/provider operation is performed by this file.
create table private.ai_profile_signing_config(
 singleton boolean primary key default true check(singleton),
 signing_key bytea not null check(octet_length(signing_key)=32)
);
alter table private.ai_profile_signing_config enable row level security;
revoke all on private.ai_profile_signing_config from public,anon,authenticated;

create table public.ai_profile_acceptances(
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id uuid not null,created timestamptz not null default clock_timestamp(),
 payload text not null check(octet_length(payload) between 1 and 128000),
 signature text not null check(signature ~ '^[a-f0-9]{64}$'),
 selected_indices integer[] not null check(array_ndims(selected_indices)=1 and cardinality(selected_indices) between 1 and 10 and array_position(selected_indices,null) is null and 0<=all(selected_indices) and 9>=all(selected_indices)),
 entry_ids uuid[] not null check(array_ndims(entry_ids)=1 and cardinality(entry_ids)=cardinality(selected_indices) and array_position(entry_ids,null) is null),
 payload_sha256 text generated always as(encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex')) stored,
 primary key(user_id,id)
);
alter table public.ai_profile_acceptances enable row level security;
revoke all on public.ai_profile_acceptances from public,anon,authenticated;
grant select on public.ai_profile_acceptances to authenticated;
create policy ai_profile_acceptances_owner on public.ai_profile_acceptances for select to authenticated
 using((select auth.uid())=user_id and(select public.session_is_active()));
create function private.freeze_ai_profile_acceptance() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'IMMUTABLE_AI_PROFILE_ACCEPTANCE';end;$$;
revoke all on function private.freeze_ai_profile_acceptance() from public,anon,authenticated;
create trigger ai_profile_acceptance_frozen before update on public.ai_profile_acceptances
 for each row execute function private.freeze_ai_profile_acceptance();

create function private.ai_profile_signing_ready(p_key_id text) returns boolean
language plpgsql security definer set search_path='' as $$
declare key bytea;
begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_key_id is null or p_key_id !~ '^[a-f0-9]{64}$' then return false;end if;
 select signing_key into key from private.ai_profile_signing_config where singleton;
 return key is not null and encode(extensions.digest(key,'sha256'),'hex')=p_key_id;
end;$$;
revoke all on function private.ai_profile_signing_ready(text) from public,anon,authenticated;
create function public.ai_profile_signing_ready(p_key_id text) returns boolean
language sql security definer set search_path='' as $$select private.ai_profile_signing_ready(p_key_id);$$;
revoke all on function public.ai_profile_signing_ready(text) from public,anon,authenticated;
grant execute on function public.ai_profile_signing_ready(text) to authenticated;

create function private.verified_ai_profile_receipt(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare key bytea;expected bytea;body jsonb;src jsonb;preview jsonb;issued bigint;expires bigint;seconds bigint;
begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_payload is null or octet_length(p_payload) not between 1 and 128000 or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then raise exception 'AI_PROFILE_RECEIPT_INVALID';end if;
 -- A shared lock serializes key rotation against acceptance; no historical key is exported.
 select signing_key into key from private.ai_profile_signing_config where singleton for share;
 if key is null then raise exception 'AI_PROFILE_ACCEPTANCE_UNAVAILABLE';end if;
 expected:=extensions.hmac(convert_to('jobmatch-ai-profile-receipt-v1'||chr(10)||p_payload,'UTF8'),key,'sha256');
 -- Compare keyed digests rather than leaking a prefix of the expected MAC through bytea equality.
 if extensions.hmac(decode(p_signature,'hex'),key,'sha256')<>extensions.hmac(expected,key,'sha256') then raise exception 'AI_PROFILE_RECEIPT_INVALID';end if;
 begin
  body:=p_payload::jsonb;src:=body->'source';preview:=body->'preview';
  if jsonb_typeof(body) is distinct from 'object'
   or array(select jsonb_object_keys(body) order by 1) is distinct from array['expiresAt','format','id','issuedAt','issuerKeyId','preview','source']
   or jsonb_typeof(body->'id') is distinct from 'string'
   or body->>'format' is distinct from 'jobmatch-ai-profile-receipt-v1'
   or body->>'issuerKeyId' is distinct from encode(extensions.digest(key,'sha256'),'hex')
   or jsonb_typeof(body->'issuedAt') is distinct from 'number' or jsonb_typeof(body->'expiresAt') is distinct from 'number'
   or (body->>'issuedAt') !~ '^[0-9]+$' or (body->>'expiresAt') !~ '^[0-9]+$'
   or jsonb_typeof(src) is distinct from 'object'
   or array(select jsonb_object_keys(src) order by 1) is distinct from array['ownerId','profileRevision','sourceFactIds','sourceOriginal','sourceWorkspaceRevision','workspaceRevision']
   or (src->>'ownerId')::uuid is distinct from auth.uid()
   or jsonb_typeof(src->'sourceOriginal') is distinct from 'string' or length(src->>'sourceOriginal')>12000
   or octet_length(src->>'sourceOriginal')>48000 or jsonb_typeof(src->'sourceFactIds') is distinct from 'array'
   or jsonb_array_length(src->'sourceFactIds')>500
   or jsonb_typeof(preview) is distinct from 'object'
   or array(select jsonb_object_keys(preview) order by 1) is distinct from array['acceptance','candidates','contractVersion','format','origin','promptVersion','semanticAssessment','sourceBlocks']
   or preview->>'format' is distinct from 'jobmatch-ai-profile-preview-v1'
   or preview->>'contractVersion' is distinct from 'paragraph-quotes-v2'
   or preview->>'promptVersion' is distinct from 'profile-paragraph-quotes-v2'
   or preview->>'acceptance' is distinct from 'not-accepted'
   or preview->>'semanticAssessment' is distinct from 'not-performed'
   or jsonb_typeof(preview->'origin') is distinct from 'object'
   or array(select jsonb_object_keys(preview->'origin') order by 1) is distinct from array['model','modelIdentityVerified','operatorDeclaredModelDigest']
   or preview->'origin'->'modelIdentityVerified' is distinct from 'false'::jsonb
   or jsonb_typeof(preview->'origin'->'model') is distinct from 'string'
   or jsonb_typeof(preview->'origin'->'operatorDeclaredModelDigest') is distinct from 'string'
   or (preview->'origin'->>'model') !~ '^[a-zA-Z0-9_./:-]{1,100}$'
   or (preview->'origin'->>'operatorDeclaredModelDigest') !~ '^sha256:[a-f0-9]{64}$'
   or jsonb_typeof(preview->'candidates') is distinct from 'array' or jsonb_array_length(preview->'candidates')>10
   then raise exception 'AI_PROFILE_RECEIPT_INVALID';end if;
  perform (body->>'id')::uuid;
   if exists(select 1 from unnest(array['workspaceRevision','profileRevision','sourceWorkspaceRevision']) name
    where jsonb_typeof(src->name) is distinct from 'number' or (src->>name) !~ '^[0-9]+$' or (src->>name)::numeric>2147483647) then raise exception 'AI_PROFILE_RECEIPT_INVALID';end if;
  if (src->>'sourceWorkspaceRevision')::integer>(src->>'workspaceRevision')::integer then raise exception 'AI_PROFILE_RECEIPT_INVALID';end if;
  issued:=(body->>'issuedAt')::bigint;expires:=(body->>'expiresAt')::bigint;seconds:=floor(extract(epoch from clock_timestamp()));
  if issued>9007199254740391 or expires<>issued+600 or issued>seconds+5 or expires<=seconds then raise exception 'AI_PROFILE_RECEIPT_INVALID';end if;
 exception when data_exception then raise exception 'AI_PROFILE_RECEIPT_INVALID';
 end;
 return body;
end;$$;
revoke all on function private.verified_ai_profile_receipt(text,text) from public,anon,authenticated;

create function private.ai_profile_acceptance_json(r public.ai_profile_acceptances) returns jsonb
language sql stable set search_path='' set timezone='UTC' as $$
 select jsonb_build_object('format','jobmatch-ai-profile-acceptance-v1','id',r.id,'ownerId',r.user_id,'created',r.created,
 'receipt',jsonb_build_object('payload',r.payload,'signature',r.signature),'payloadSha256',r.payload_sha256,
 'selectedIndices',to_jsonb(r.selected_indices),'entryIds',to_jsonb(r.entry_ids),'userSelectionAccepted',true,
 'signatureVerifiedAtAcceptance',true,'issuerIdentity','server-key-holder','modelIdentityVerified',false,'modelAcceptance','not-accepted');
$$;
revoke all on function private.ai_profile_acceptance_json(public.ai_profile_acceptances) from public,anon,authenticated;

create function private.accept_ai_profile_candidates(p_workspace_revision integer,p_profile_revision integer,p_payload text,p_signature text,p_selected_indices integer[],p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set statement_timeout='5s' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();body jsonb;src jsonb;profile jsonb;candidate jsonb;state jsonb;selected integer;head integer;accepted_at timestamptz;before_ids uuid[];added uuid[];entry_ids uuid[]:='{}';receipt public.ai_profile_acceptances;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_accept is distinct from 'SAVE_REVIEWED_AI_FIELDS' or p_workspace_revision is null or p_workspace_revision<0
  or p_profile_revision is null or p_profile_revision<0 or p_selected_indices is null
  or array_ndims(p_selected_indices)<>1 or cardinality(p_selected_indices) not between 1 and 10
  or array_position(p_selected_indices,null) is not null
  or (select count(distinct n) from unnest(p_selected_indices) n)<>cardinality(p_selected_indices)
  or p_selected_indices is distinct from (select array_agg(n order by n) from unnest(p_selected_indices) n)
  or p_profile_revision>2147483647-cardinality(p_selected_indices) then raise exception 'INVALID_WRITE';end if;
 body:=private.verified_ai_profile_receipt(p_payload,p_signature);src:=body->'source';
 if (src->>'workspaceRevision')::integer<>p_workspace_revision or (src->>'profileRevision')::integer<>p_profile_revision then raise exception 'CONFLICT';end if;
 if exists(select 1 from unnest(p_selected_indices) n where n<0 or n>=jsonb_array_length(body->'preview'->'candidates')) then raise exception 'INVALID_WRITE';end if;
 state:=private.locked_workspace(p_workspace_revision);
 perform 1 from public.structured_profiles where user_id=uid for update;
 profile:=public.read_structured_profile();
 if (profile->>'revision')::integer<>p_profile_revision or not (profile->>'source_matches')::boolean
  or profile->>'source_original' is distinct from src->>'sourceOriginal'
  or (profile->>'source_workspace_revision')::integer<>(src->>'sourceWorkspaceRevision')::integer
  or profile->'source_fact_ids' is distinct from src->'sourceFactIds' then raise exception 'CONFLICT';end if;
 accepted_at:=clock_timestamp();
 if (body->>'expiresAt')::bigint<=floor(extract(epoch from accepted_at)) then raise exception 'AI_PROFILE_RECEIPT_INVALID';end if;
 if exists(select 1 from public.ai_profile_acceptances where user_id=uid and id=(body->>'id')::uuid) then raise exception 'CONFLICT';end if;
 if (select count(*) from public.ai_profile_acceptances where user_id=uid)>=50
  or jsonb_array_length(profile->'entries')+cardinality(p_selected_indices)>50 then raise exception 'INVALID_WRITE';end if;
 select coalesce(array_agg((value->>'id')::uuid),'{}') into before_ids from jsonb_array_elements(profile->'entries');
 head:=p_profile_revision;
 foreach selected in array p_selected_indices loop
  candidate:=body->'preview'->'candidates'->selected;
  profile:=public.command_structured_profile(p_workspace_revision,head,jsonb_build_object('action','add','kind',candidate->>'kind','fields',candidate->'fields'));
  select coalesce(array_agg((value->>'id')::uuid),'{}') into added from jsonb_array_elements(profile->'entries') where not((value->>'id')::uuid=any(before_ids));
  if cardinality(added)<>1 or (profile->>'revision')::integer<>head+1
   or exists(select 1 from jsonb_array_elements(profile->'entries') e where (e->>'id')::uuid=added[1] and (e->>'confirmed')::boolean) then raise exception 'INVALID_WRITE';end if;
  entry_ids:=entry_ids||added[1];before_ids:=before_ids||added[1];head:=head+1;
 end loop;
 insert into public.ai_profile_acceptances(user_id,id,created,payload,signature,selected_indices,entry_ids)
 values(uid,(body->>'id')::uuid,accepted_at,p_payload,p_signature,p_selected_indices,entry_ids) returning * into receipt;
 insert into public.audit_log(user_id,action) values(uid,'ai_profile_accept');
 return jsonb_build_object('profile',profile,'record',private.ai_profile_acceptance_json(receipt));
end;$$;
revoke all on function private.accept_ai_profile_candidates(integer,integer,text,text,integer[],text) from public,anon,authenticated;
create function public.accept_ai_profile_candidates(p_workspace_revision integer,p_profile_revision integer,p_payload text,p_signature text,p_selected_indices integer[],p_accept text) returns jsonb
language sql security definer set search_path='' as $$
 select private.accept_ai_profile_candidates(p_workspace_revision,p_profile_revision,p_payload,p_signature,p_selected_indices,p_accept);
$$;
revoke all on function public.accept_ai_profile_candidates(integer,integer,text,text,integer[],text) from public,anon,authenticated;
grant execute on function public.accept_ai_profile_candidates(integer,integer,text,text,integer[],text) to authenticated;

create function private.read_ai_profile_acceptance(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();r public.ai_profile_acceptances;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 select * into r from public.ai_profile_acceptances where user_id=uid and id=p_id;
 if not found then return null;end if;return private.ai_profile_acceptance_json(r);
end;$$;
revoke all on function private.read_ai_profile_acceptance(uuid) from public,anon,authenticated;
create function public.read_ai_profile_acceptance(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$select private.read_ai_profile_acceptance(p_id);$$;
revoke all on function public.read_ai_profile_acceptance(uuid) from public,anon,authenticated;
grant execute on function public.read_ai_profile_acceptance(uuid) to authenticated;

create function private.list_ai_profile_acceptances() returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();items jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if (select count(*) from public.ai_profile_acceptances where user_id=uid)>50 then raise exception 'INVALID_WRITE';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'created',created,'entryCount',cardinality(entry_ids),
 'workspaceRevision',(payload::jsonb->'source'->>'workspaceRevision')::integer,
 'profileRevision',(payload::jsonb->'source'->>'profileRevision')::integer,
 'model',payload::jsonb->'preview'->'origin'->>'model','operatorDeclaredModelDigest',payload::jsonb->'preview'->'origin'->>'operatorDeclaredModelDigest',
 'contractVersion','paragraph-quotes-v2','payloadSha256',payload_sha256,'modelIdentityVerified',false,'modelAcceptance','not-accepted') order by created desc,id),'[]'::jsonb)
 into items from public.ai_profile_acceptances where user_id=uid;
 return jsonb_build_object('format','jobmatch-ai-profile-acceptance-list-v1','ownerId',uid,'items',items);
end;$$;
revoke all on function private.list_ai_profile_acceptances() from public,anon,authenticated;
create function public.list_ai_profile_acceptances() returns jsonb
language sql stable security definer set search_path='' as $$select private.list_ai_profile_acceptances();$$;
revoke all on function public.list_ai_profile_acceptances() from public,anon,authenticated;
grant execute on function public.list_ai_profile_acceptances() to authenticated;
