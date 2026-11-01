-- Main-compatible manual source profile. Default native storage capability is OFF.
-- Retraction/deletion/clear remain available to the owner when creation is disabled.
begin;
create table public.source_profiles(
 user_id uuid primary key references public.workspaces(user_id) on delete cascade,
 revision integer not null check(revision>0),
 source_workspace_revision integer,
 source_original text,
 source_fact_ids jsonb,
 check((source_original is null and source_workspace_revision is null and source_fact_ids is null) or
  (source_original is not null and source_workspace_revision is not null and source_fact_ids is not null and
   source_workspace_revision>=0 and length(source_original) between 1 and 100000 and private.trim_fact_line(source_original)<>'' and
   jsonb_typeof(source_fact_ids)='array' and jsonb_array_length(source_fact_ids) between 1 and 500))
);
create table public.source_profile_entries(
 user_id uuid not null references public.source_profiles(user_id) on delete cascade,
 id uuid not null default gen_random_uuid(),kind text not null check(kind in ('employment','education','certification','achievement')),
 fields jsonb not null check(jsonb_typeof(fields)='object'),confirmed boolean not null default false,
 created timestamptz not null default clock_timestamp(),primary key(user_id,id)
);
alter table public.source_profiles enable row level security;
alter table public.source_profile_entries enable row level security;
revoke all on public.source_profiles,public.source_profile_entries from public,anon,authenticated;
grant select on public.source_profiles,public.source_profile_entries to authenticated;
create policy source_profile_owner on public.source_profiles for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));
create policy source_entry_owner on public.source_profile_entries for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));

-- An operator may explicitly GRANT this capability after storage approval. No key/config row.
-- The guarded command checks the authenticated role's ACL, never definer current_user.
create function private.source_profile_storage_permission() returns boolean language sql security invoker set search_path='' as $$select true;$$;
revoke all on function private.source_profile_storage_permission() from public,anon,authenticated;
create function private.source_profile_storage_ready() returns boolean language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not private.session_is_active() then raise exception 'AUTH';end if;
 return has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE');
end$$;
revoke all on function private.source_profile_storage_ready() from public,anon,authenticated;
grant execute on function private.source_profile_storage_ready() to authenticated;
create function public.source_profile_storage_ready() returns boolean language sql security invoker set search_path='' as $$select private.source_profile_storage_ready();$$;
revoke all on function public.source_profile_storage_ready() from public,anon,authenticated;
grant execute on function public.source_profile_storage_ready() to authenticated;

create function private.read_source_profile() returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare uid uuid:=auth.uid();state jsonb;p public.source_profiles%rowtype;ids jsonb;entries jsonb;captured boolean;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 state:=public.read_workspace();
 ids:=coalesce((select jsonb_agg(f.value->'id' order by f.n) from jsonb_array_elements(coalesce(state->'facts','[]'::jsonb)) with ordinality f(value,n)),'[]'::jsonb);
 select * into p from public.source_profiles where user_id=uid;captured:=p.source_original is not null;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'fields',fields,'confirmed',confirmed,'created',created) order by created,id),'[]'::jsonb)
 into entries from public.source_profile_entries where user_id=uid;
 return jsonb_build_object('format','jobmatch-source-profile-v1','ownerId',uid,'revision',coalesce(p.revision,0),
 'workspace_revision',coalesce((state->>'revision')::integer,0),'source_workspace_revision',coalesce(p.source_workspace_revision,(state->>'revision')::integer,0),
 'source_original',coalesce(p.source_original,state->>'original',''),'source_fact_ids',coalesce(p.source_fact_ids,ids),
 'source_captured',captured,'source_matches',not captured or(p.source_original=state->>'original' and p.source_fact_ids=ids),'entries',entries,
 'sourceVerification','exact-ranges-only','semanticAssessment','not-performed','modelVersion',null);
end$$;
revoke all on function private.read_source_profile() from public,anon,authenticated;
grant execute on function private.read_source_profile() to authenticated;
create function public.read_source_profile() returns jsonb language sql security invoker set search_path='' as $$select private.read_source_profile();$$;
revoke all on function public.read_source_profile() from public,anon,authenticated;
grant execute on function public.read_source_profile() to authenticated;

create function private.command_source_profile(p_workspace_revision integer,p_profile_revision integer,p_command jsonb,p_accept text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();state jsonb;p public.source_profiles%rowtype;ids jsonb;action text;store boolean;current_source boolean;
 current_revision integer;item jsonb;field_name text;start_at integer;end_at integer;quote text;record_id uuid;confirmed_value boolean;begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_workspace_revision is null or p_workspace_revision<0 or p_profile_revision is null or p_profile_revision not between 0 and 2147483646
  or jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>40000 or jsonb_typeof(p_command->'action') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
 action:=p_command->>'action';
 if action='add' then
  if (p_command-array['action','kind','fields'])<>'{}'::jsonb or jsonb_typeof(p_command->'kind') is distinct from 'string'
   or p_command->>'kind' not in ('employment','education','certification','achievement') or jsonb_typeof(p_command->'fields') is distinct from 'object'
   or ((p_command->'fields')-array['title','organization','start','end','description','credential'])<>'{}'::jsonb
   or not((p_command->'fields')?(case when p_command->>'kind'='achievement' then 'description' else 'title' end))
   or ((p_command->'fields')?'credential' and p_command->>'kind'<>'certification') then raise exception 'INVALID_WRITE';end if;
 elsif action in ('confirm','delete') then
  if (p_command-(case when action='confirm' then array['action','id','confirmed'] else array['action','id'] end))<>'{}'::jsonb
   or jsonb_typeof(p_command->'id') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
  begin record_id:=(p_command->>'id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_WRITE';end;
  if action='confirm' then
   if jsonb_typeof(p_command->'confirmed') is distinct from 'boolean' then raise exception 'INVALID_WRITE';end if;
   confirmed_value:=(p_command->>'confirmed')::boolean;
  end if;
 elsif action in ('reset','clear') then
  if (p_command-array['action','confirm'])<>'{}'::jsonb or p_command->>'confirm' is distinct from(case when action='reset' then 'RESET_SOURCE_PROFILE' else 'CLEAR_SOURCE_PROFILE_DATA' end) then raise exception 'INVALID_WRITE';end if;
 else raise exception 'INVALID_WRITE';end if;
 store:=action in ('add','reset') or(action='confirm' and confirmed_value);
 if p_accept is distinct from(case when store then 'STORE_REVIEWED_SOURCE_PROFILE' else 'REMOVE_SOURCE_PROFILE_DATA' end) then raise exception 'INVALID_WRITE';end if;
 if store and not has_function_privilege('authenticated','private.source_profile_storage_permission()','EXECUTE') then raise exception 'SOURCE_PROFILE_UNAVAILABLE';end if;
 -- Same advisory/workspace lock order as letter, command and legacy writers.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.workspaces where user_id=uid for update;
 if current_revision is distinct from p_workspace_revision then raise exception 'CONFLICT';end if;
 state:=public.read_workspace();
 ids:=coalesce((select jsonb_agg(f.value->'id' order by f.n) from jsonb_array_elements(coalesce(state->'facts','[]'::jsonb)) with ordinality f(value,n)),'[]'::jsonb);
 select * into p from public.source_profiles where user_id=uid for update;
 if coalesce(p.revision,0)<>p_profile_revision then raise exception 'CONFLICT';end if;
 current_source:=p.source_original is null or(p.source_original=state->>'original' and p.source_fact_ids=ids);
 if store and(private.trim_fact_line(coalesce(state->>'original',''))='' or length(state->>'original')>100000 or jsonb_array_length(ids) not between 1 and 500) then raise exception 'INVALID_WRITE';end if;
 if action='add' then
  if not current_source then raise exception 'CONFLICT';end if;
  for field_name,item in select key,value from jsonb_each(p_command->'fields') loop
   if jsonb_typeof(item) is distinct from 'object' or (item-array['quote','start','end'])<>'{}'::jsonb
    or jsonb_typeof(item->'quote') is distinct from 'string' or length(item->>'quote') not between 1 and 500 or private.trim_fact_line(item->>'quote')=''
    or jsonb_typeof(item->'start') is distinct from 'number' or coalesce(item->>'start','')!~'^(0|[1-9][0-9]{0,5})$'
    or jsonb_typeof(item->'end') is distinct from 'number' or coalesce(item->>'end','')!~'^[1-9][0-9]{0,5}$' then raise exception 'INVALID_WRITE';end if;
   start_at:=(item->>'start')::integer;end_at:=(item->>'end')::integer;quote:=item->>'quote';
   if start_at>=end_at or end_at>length(state->>'original') or end_at-start_at<>length(quote)
    or substring(state->>'original' from start_at+1 for end_at-start_at)<>quote then raise exception 'INVALID_WRITE';end if;
  end loop;
  if (select count(*) from public.source_profile_entries where user_id=uid)>=50
   or exists(select 1 from public.source_profile_entries where user_id=uid and kind=p_command->>'kind' and fields=p_command->'fields') then raise exception 'INVALID_WRITE';end if;
 elsif action in ('confirm','delete') then
  if not exists(select 1 from public.source_profile_entries where user_id=uid and id=record_id) then raise exception 'INVALID_WRITE';end if;
  if action='confirm' and confirmed_value and not current_source then raise exception 'CONFLICT';end if;
 elsif action='clear' and p.user_id is null then raise exception 'INVALID_WRITE';end if;
 if not private.session_is_active() then raise exception 'AUTH';end if;
 if action in ('add','reset') then
  insert into public.source_profiles(user_id,revision,source_workspace_revision,source_original,source_fact_ids)
  values(uid,1,p_workspace_revision,state->>'original',ids)
  on conflict(user_id) do update set revision=public.source_profiles.revision+1,
   source_workspace_revision=case when public.source_profiles.source_original is null or action='reset' then excluded.source_workspace_revision else public.source_profiles.source_workspace_revision end,
   source_original=case when public.source_profiles.source_original is null or action='reset' then excluded.source_original else public.source_profiles.source_original end,
   source_fact_ids=case when public.source_profiles.source_original is null or action='reset' then excluded.source_fact_ids else public.source_profiles.source_fact_ids end;
 else update public.source_profiles set revision=revision+1 where user_id=uid;end if;
 if action='reset' then delete from public.source_profile_entries where user_id=uid;
 elsif action='clear' then
  delete from public.source_profile_entries where user_id=uid;
  update public.source_profiles set source_workspace_revision=null,source_original=null,source_fact_ids=null where user_id=uid;
 elsif action='add' then insert into public.source_profile_entries(user_id,kind,fields) values(uid,p_command->>'kind',p_command->'fields');
 elsif action='delete' then delete from public.source_profile_entries where user_id=uid and id=record_id;
 else update public.source_profile_entries set confirmed=confirmed_value where user_id=uid and id=record_id;end if;
 insert into public.audit_log(user_id,action) values(uid,'source-profile-'||action);
 return private.read_source_profile();
end$$;
revoke all on function private.command_source_profile(integer,integer,jsonb,text) from public,anon,authenticated;
grant execute on function private.command_source_profile(integer,integer,jsonb,text) to authenticated;
create function public.command_source_profile(p_workspace_revision integer,p_profile_revision integer,p_command jsonb,p_accept text) returns jsonb
language sql security invoker set search_path='' as $$select private.command_source_profile(p_workspace_revision,p_profile_revision,p_command,p_accept);$$;
revoke all on function public.command_source_profile(integer,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.command_source_profile(integer,integer,jsonb,text) to authenticated;
do $$declare f record;begin if exists(select 1 from pg_roles where rolname='service_role') then
 execute 'revoke all on public.source_profiles,public.source_profile_entries from service_role';
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('source_profile_storage_permission','source_profile_storage_ready','read_source_profile','command_source_profile') loop
  execute format('revoke all on function %s from service_role',f.oid::regprocedure);
 end loop;
end if;end$$;
commit;
