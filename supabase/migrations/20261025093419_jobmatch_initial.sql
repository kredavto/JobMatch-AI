-- Initial schema for a NEW JobMatch database. Owner-only JSON workspace MVP.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision integer not null default 0 check (revision >= 0),
 payload jsonb not null check (octet_length(payload::text) < 15000000),
 updated_at timestamptz not null default now()
);
create table public.audit_log (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null check (length(action)<100),
 created timestamptz not null default now()
);
create index audit_owner on public.audit_log(user_id);
create table public.consent_records (
 user_id uuid primary key references auth.users(id) on delete cascade,
 version text not null, created timestamptz not null default now()
);
alter table public.workspaces enable row level security;
alter table public.audit_log enable row level security;
alter table public.consent_records enable row level security;
create policy workspace_select on public.workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy workspace_insert on public.workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy workspace_update on public.workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy workspace_delete on public.workspaces for delete to authenticated using ((select auth.uid())=user_id);
create policy audit_select on public.audit_log for select to authenticated using ((select auth.uid())=user_id);
create policy audit_insert on public.audit_log for insert to authenticated with check ((select auth.uid())=user_id);
create policy consent_select on public.consent_records for select to authenticated using ((select auth.uid())=user_id);
create policy consent_insert on public.consent_records for insert to authenticated with check ((select auth.uid())=user_id);
revoke all on public.workspaces,public.audit_log,public.consent_records from anon;
grant select,insert,update,delete on public.workspaces to authenticated;
grant select,insert on public.audit_log,public.consent_records to authenticated;
create function public.save_workspace(p_revision integer,p_payload jsonb,p_action text) returns integer
language plpgsql security invoker set search_path='' as $$
declare current_revision integer; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'AUTH'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.workspaces where user_id=uid for update;
 if coalesce(current_revision,0)<>p_revision then raise exception 'CONFLICT'; end if;
 insert into public.workspaces(user_id,revision,payload) values(uid,p_revision+1,p_payload)
 on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
 insert into public.audit_log(user_id,action) values(uid,p_action);
 insert into public.consent_records(user_id,version) values(uid,'privacy-v1') on conflict do nothing;
 return p_revision+1;
end;$$;
revoke all on function public.save_workspace(integer,jsonb,text) from public,anon;
grant execute on function public.save_workspace(integer,jsonb,text) to authenticated;
-- Narrow privilege elevation: deleting one's own Auth row and its cascades.
-- No ID argument, identity comes only from verified JWT; private schema is not exposed.
create function private.delete_own_auth_user() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH'; end if;
 delete from auth.sessions where user_id=auth.uid();
 delete from auth.users where id=auth.uid();
end;$$;
revoke all on function private.delete_own_auth_user() from public,anon;
grant execute on function private.delete_own_auth_user() to authenticated;
create function public.delete_my_account() returns void language sql security invoker set search_path='' as $$select private.delete_own_auth_user();$$;
revoke all on function public.delete_my_account() from public,anon;
grant execute on function public.delete_my_account() to authenticated;
