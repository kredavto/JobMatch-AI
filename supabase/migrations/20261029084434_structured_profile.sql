-- Independent derived profile; existing workspace/version write contracts stay intact.
create table public.structured_profiles(
 user_id uuid primary key references public.workspaces(user_id) on delete cascade,
 revision integer not null check(revision>0),
 source_workspace_revision integer not null check(source_workspace_revision>=0),
 source_original text not null check(length(source_original)<=100000),
 source_fact_ids jsonb not null check(jsonb_typeof(source_fact_ids)='array')
);
create table public.structured_profile_entries(
 user_id uuid not null references public.structured_profiles(user_id) on delete cascade,
 id uuid not null default gen_random_uuid(),
 kind text not null check(kind in ('employment','education','certification','achievement')),
 fields jsonb not null check(jsonb_typeof(fields)='object'),
 confirmed boolean not null default false,
 created timestamptz not null default now(),
 primary key(user_id,id)
);
alter table public.structured_profiles enable row level security;
alter table public.structured_profile_entries enable row level security;
revoke all on public.structured_profiles,public.structured_profile_entries from public,anon,authenticated;
grant select on public.structured_profiles,public.structured_profile_entries to authenticated;
create policy owner_read on public.structured_profiles for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));
create policy owner_read on public.structured_profile_entries for select to authenticated using((select auth.uid())=user_id and(select public.session_is_active()));

create function public.read_structured_profile() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();state jsonb;profile public.structured_profiles%rowtype;fact_ids jsonb;entries jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 state:=public.read_workspace();
 fact_ids:=coalesce((select jsonb_agg(value->'id' order by n) from jsonb_array_elements(coalesce(state->'facts','[]'::jsonb)) with ordinality f(value,n)),'[]'::jsonb);
 select * into profile from public.structured_profiles where user_id=uid;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'fields',fields,'confirmed',confirmed,'created',created) order by created,id),'[]'::jsonb)
 into entries from public.structured_profile_entries where user_id=uid;
 return jsonb_build_object('format','jobmatch-structured-profile-v1','ownerId',uid,
  'revision',coalesce(profile.revision,0),'workspace_revision',coalesce((state->>'revision')::integer,0),
  'source_workspace_revision',coalesce(profile.source_workspace_revision,(state->>'revision')::integer,0),
  'source_original',coalesce(profile.source_original,state->>'original',''),
  'source_fact_ids',coalesce(profile.source_fact_ids,fact_ids),
  'source_matches',profile.user_id is null or (profile.source_original=state->>'original' and profile.source_fact_ids=fact_ids),
  'entries',entries);
end;$$;
revoke all on function public.read_structured_profile() from public,anon;
grant execute on function public.read_structured_profile() to authenticated;

create function public.command_structured_profile(p_workspace_revision integer,p_profile_revision integer,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();state jsonb;profile public.structured_profiles%rowtype;action text;fact_ids jsonb;current_source boolean;item jsonb;field_name text;start_at integer;end_at integer;quote text;record_id uuid;confirmed_value boolean;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_profile_revision is null or p_profile_revision<0 or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'INVALID_WRITE';end if;
 -- Same lock/order as all command/legacy workspace writers; source cannot race import.
 state:=private.locked_workspace(p_workspace_revision);
 if private.trim_fact_line(coalesce(state->>'original',''))='' or jsonb_array_length(state->'facts')=0 then raise exception 'INVALID_WRITE';end if;
 fact_ids:=coalesce((select jsonb_agg(value->'id' order by n) from jsonb_array_elements(state->'facts') with ordinality f(value,n)),'[]'::jsonb);
 select * into profile from public.structured_profiles where user_id=uid for update;
 if coalesce(profile.revision,0)<>p_profile_revision then raise exception 'CONFLICT';end if;
 current_source:=profile.user_id is null or (profile.source_original=state->>'original' and profile.source_fact_ids=fact_ids);
 action:=p_command->>'action';
 if action='add' then
  if not current_source then raise exception 'CONFLICT';end if;
  if p_command-array['action','kind','fields']<>'{}'::jsonb or jsonb_typeof(p_command->'kind') is distinct from 'string'
   or p_command->>'kind' not in ('employment','education','certification','achievement') or jsonb_typeof(p_command->'fields') is distinct from 'object'
   or p_command->'fields'-array['title','organization','start','end','description','credential']<>'{}'::jsonb
   or not (p_command->'fields' ? (case when p_command->>'kind'='achievement' then 'description' else 'title' end))
   or (p_command->'fields' ? 'credential' and p_command->>'kind'<>'certification') then raise exception 'INVALID_WRITE';end if;
  for field_name,item in select key,value from jsonb_each(p_command->'fields') loop
   if jsonb_typeof(item) is distinct from 'object' or item-array['quote','start','end']<>'{}'::jsonb
    or jsonb_typeof(item->'quote') is distinct from 'string' or length(item->>'quote') not between 1 and 500 or private.trim_fact_line(item->>'quote')=''
    or jsonb_typeof(item->'start') is distinct from 'number' or coalesce(item->>'start','') !~ '^(0|[1-9][0-9]{0,5})$'
    or jsonb_typeof(item->'end') is distinct from 'number' or coalesce(item->>'end','') !~ '^[1-9][0-9]{0,5}$' then raise exception 'INVALID_WRITE';end if;
   start_at:=(item->>'start')::integer;end_at:=(item->>'end')::integer;quote:=item->>'quote';
   if start_at>=end_at or end_at>length(state->>'original') or end_at-start_at<>length(quote)
    or substring(state->>'original' from start_at+1 for end_at-start_at)<>quote then raise exception 'INVALID_WRITE';end if;
  end loop;
  if (select count(*) from public.structured_profile_entries where user_id=uid)>=50 then raise exception 'INVALID_WRITE';end if;
 elsif action in ('delete','confirm') then
  if p_command-(case when action='confirm' then array['action','id','confirmed'] else array['action','id'] end)<>'{}'::jsonb
   or jsonb_typeof(p_command->'id') is distinct from 'string' then raise exception 'INVALID_WRITE';end if;
  begin record_id:=(p_command->>'id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_WRITE';end;
  if not exists(select 1 from public.structured_profile_entries where user_id=uid and id=record_id) then raise exception 'INVALID_WRITE';end if;
  if action='confirm' then
   if jsonb_typeof(p_command->'confirmed') is distinct from 'boolean' then raise exception 'INVALID_WRITE';end if;
   confirmed_value:=(p_command->>'confirmed')::boolean;
   if confirmed_value and not current_source then raise exception 'CONFLICT';end if;
  end if;
 elsif action='reset' then
  if p_command-array['action','confirm']<>'{}'::jsonb or p_command->>'confirm' is distinct from 'RESET_STRUCTURED_PROFILE' then raise exception 'INVALID_WRITE';end if;
 else raise exception 'INVALID_WRITE';end if;
 -- New IDs, timestamps, source and confirmation are server-owned.
 insert into public.structured_profiles(user_id,revision,source_workspace_revision,source_original,source_fact_ids)
 values(uid,1,p_workspace_revision,state->>'original',fact_ids)
 on conflict(user_id) do update set revision=public.structured_profiles.revision+1;
 if action='reset' then
  delete from public.structured_profile_entries where user_id=uid;
  update public.structured_profiles set source_workspace_revision=p_workspace_revision,source_original=state->>'original',source_fact_ids=fact_ids where user_id=uid;
 elsif action='add' then
  insert into public.structured_profile_entries(user_id,kind,fields) values(uid,p_command->>'kind',p_command->'fields');
 elsif action='delete' then
  delete from public.structured_profile_entries where user_id=uid and id=record_id;
 else
  update public.structured_profile_entries set confirmed=confirmed_value where user_id=uid and id=record_id;
 end if;
 insert into public.audit_log(user_id,action) values(uid,'structured_'||action);
 return public.read_structured_profile();
end;$$;
revoke all on function public.command_structured_profile(integer,integer,jsonb) from public,anon;
grant execute on function public.command_structured_profile(integer,integer,jsonb) to authenticated;
