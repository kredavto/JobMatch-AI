-- Independent, append-only profile fact snapshots. Dates describe capture, not verification.
create table public.fact_history (
 id integer generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 workspace_revision integer not null,
 kind text not null check(kind in ('baseline','change')),
 facts jsonb not null check(jsonb_typeof(facts)='array'),
 captured_at timestamptz not null default now()
);
create index fact_history_owner_cursor on public.fact_history(user_id,id desc);
alter table public.fact_history enable row level security;
revoke all on public.fact_history from public,anon,authenticated;
grant select on public.fact_history to authenticated;
create policy fact_history_select on public.fact_history for select to authenticated
using ((select auth.uid())=user_id and (select public.session_is_active()));
-- Existing profiles get a baseline today, never invented historical confirmation dates.
insert into public.fact_history(user_id,workspace_revision,kind,facts)
select user_id,revision,'baseline',coalesce(payload->'facts','[]'::jsonb) from public.workspaces;
-- Elevation is necessary: clients may write workspace but must not write history.
create function private.capture_fact_history() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>new.user_id or not public.session_is_active() then raise exception 'AUTH'; end if;
 if TG_OP='INSERT' or coalesce(old.payload->'facts','[]'::jsonb) is distinct from coalesce(new.payload->'facts','[]'::jsonb) then
  insert into public.fact_history(user_id,workspace_revision,kind,facts)
  values(new.user_id,new.revision,'change',coalesce(new.payload->'facts','[]'::jsonb));
 end if;
 return new;
end;$$;
revoke all on function private.capture_fact_history() from public,anon,authenticated;
create trigger workspace_capture_facts after insert or update of payload on public.workspaces
for each row execute function private.capture_fact_history();
