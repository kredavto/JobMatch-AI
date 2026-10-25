-- Expand phase: normalized relational entities + legacy JSON write compatibility.
create table public.profile_facts (
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id text not null, position integer not null check(position>0),
 text text not null, source text not null, verified boolean not null,
 extra jsonb not null default '{}', primary key(user_id,id)
);
create table public.resume_versions (
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id text not null, position integer not null check(position>0),
 created text not null, text text not null, vacancy text not null,
 score integer not null check(score between 0 and 100),
 evidence_ids jsonb not null check(jsonb_typeof(evidence_ids)='array'),
 extra jsonb not null default '{}', primary key(user_id,id)
);
create table public.applications (
 user_id uuid not null references public.workspaces(user_id) on delete cascade,
 id text not null, position integer not null check(position>0),
 title text not null, status text not null, note text not null, created text not null,
 resume_version_id text, version_link_present boolean not null,
 extra jsonb not null default '{}', primary key(user_id,id),
 foreign key(user_id,resume_version_id) references public.resume_versions(user_id,id)
);
create index applications_version on public.applications(user_id,resume_version_id);
create table public.application_events (
 user_id uuid not null, application_id text not null, position integer not null check(position>0),
 status text not null, date text not null, extra jsonb not null default '{}',
 primary key(user_id,application_id,position),
 foreign key(user_id,application_id) references public.applications(user_id,id) on delete cascade
);
do $$declare t text;begin
 foreach t in array array['profile_facts','resume_versions','applications','application_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id and (select public.session_is_active()))',t);
 end loop;
end;$$;
-- Invoker helper, NOT available to clients. Used by privileged trigger and migration only.
create function private.project_workspace(p_uid uuid,p jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.profile_facts(user_id,id,position,text,source,verified,extra)
 select p_uid,v->>'id',n,v->>'text',v->>'source',(v->>'verified')::boolean,v-array['id','text','source','verified']
 from jsonb_array_elements(coalesce(p->'facts','[]')) with ordinality as f(v,n)
 on conflict(user_id,id) do update set position=excluded.position,text=excluded.text,source=excluded.source,verified=excluded.verified,extra=excluded.extra
 where (profile_facts.position,profile_facts.text,profile_facts.source,profile_facts.verified,profile_facts.extra)
 is distinct from (excluded.position,excluded.text,excluded.source,excluded.verified,excluded.extra);
 delete from public.profile_facts where user_id=p_uid and not exists(select 1 from jsonb_array_elements(coalesce(p->'facts','[]')) f where f->>'id'=profile_facts.id);
 insert into public.resume_versions(user_id,id,position,created,text,vacancy,score,evidence_ids,extra)
 select p_uid,v->>'id',n,v->>'created',v->>'text',v->>'vacancy',(v->>'score')::integer,v->'evidence_ids',v-array['id','created','text','vacancy','score','evidence_ids']
 from jsonb_array_elements(coalesce(p->'versions','[]')) with ordinality as f(v,n)
 on conflict(user_id,id) do update set position=excluded.position,created=excluded.created,text=excluded.text,vacancy=excluded.vacancy,score=excluded.score,evidence_ids=excluded.evidence_ids,extra=excluded.extra
 where (resume_versions.position,resume_versions.created,resume_versions.text,resume_versions.vacancy,resume_versions.score,resume_versions.evidence_ids,resume_versions.extra)
 is distinct from (excluded.position,excluded.created,excluded.text,excluded.vacancy,excluded.score,excluded.evidence_ids,excluded.extra);
 insert into public.applications(user_id,id,position,title,status,note,created,resume_version_id,version_link_present,extra)
 select p_uid,v->>'id',n,v->>'title',v->>'status',v->>'note',v->>'created',v->>'resumeVersionId',v?'resumeVersionId',v-array['id','title','status','note','created','resumeVersionId','events']
 from jsonb_array_elements(coalesce(p->'applications','[]')) with ordinality as f(v,n)
 on conflict(user_id,id) do update set position=excluded.position,title=excluded.title,status=excluded.status,note=excluded.note,created=excluded.created,resume_version_id=excluded.resume_version_id,version_link_present=excluded.version_link_present,extra=excluded.extra
 where (applications.position,applications.title,applications.status,applications.note,applications.created,applications.resume_version_id,applications.version_link_present,applications.extra)
 is distinct from (excluded.position,excluded.title,excluded.status,excluded.note,excluded.created,excluded.resume_version_id,excluded.version_link_present,excluded.extra);
 delete from public.applications where user_id=p_uid and not exists(select 1 from jsonb_array_elements(coalesce(p->'applications','[]')) a where a->>'id'=applications.id);
 -- Parent version removal happens only after links have been updated/deleted.
 delete from public.resume_versions where user_id=p_uid and not exists(select 1 from jsonb_array_elements(coalesce(p->'versions','[]')) v where v->>'id'=resume_versions.id);
 insert into public.application_events(user_id,application_id,position,status,date,extra)
 select p_uid,a->>'id',n,e->>'status',e->>'date',e-array['status','date']
 from jsonb_array_elements(coalesce(p->'applications','[]')) a
 cross join lateral jsonb_array_elements(coalesce(a->'events','[]')) with ordinality as events(e,n)
 on conflict(user_id,application_id,position) do update set status=excluded.status,date=excluded.date,extra=excluded.extra
 where (application_events.status,application_events.date,application_events.extra) is distinct from (excluded.status,excluded.date,excluded.extra);
 delete from public.application_events where user_id=p_uid and not exists(
 select 1 from jsonb_array_elements(coalesce(p->'applications','[]')) a
 where a->>'id'=application_events.application_id and application_events.position<=jsonb_array_length(coalesce(a->'events','[]')));
end;$$;
revoke all on function private.project_workspace(uuid,jsonb) from public,anon,authenticated;
-- No external ID parameter, RLS remains active. One statement gives a consistent snapshot.
create function public.read_workspace() returns jsonb
language sql stable security invoker set search_path='' as $$
 select (w.payload-array['facts','versions','applications','revision']) || jsonb_build_object(
 'revision',w.revision,
 'facts',coalesce((select jsonb_agg(f.extra||jsonb_build_object('id',f.id,'text',f.text,'source',f.source,'verified',f.verified) order by f.position) from public.profile_facts f where f.user_id=w.user_id),'[]'),
 'versions',coalesce((select jsonb_agg(v.extra||jsonb_build_object('id',v.id,'created',v.created,'text',v.text,'vacancy',v.vacancy,'score',v.score,'evidence_ids',v.evidence_ids) order by v.position) from public.resume_versions v where v.user_id=w.user_id),'[]'),
 'applications',coalesce((select jsonb_agg(a.extra||jsonb_build_object('id',a.id,'title',a.title,'status',a.status,'note',a.note,'created',a.created,
 'events',coalesce((select jsonb_agg(e.extra||jsonb_build_object('status',e.status,'date',e.date) order by e.position) from public.application_events e where e.user_id=a.user_id and e.application_id=a.id),'[]'))
 ||case when a.version_link_present then jsonb_build_object('resumeVersionId',a.resume_version_id) else '{}'::jsonb end order by a.position) from public.applications a where a.user_id=w.user_id),'[]'))
 from public.workspaces w where w.user_id=(select auth.uid()) and (select public.session_is_active());
$$;
revoke all on function public.read_workspace() from public,anon;
grant execute on function public.read_workspace() to authenticated;
-- Preserve original payload and identifiers. Invalid rows abort migration, never silently repair.
do $$declare w record;begin
 for w in select user_id,payload from public.workspaces loop perform private.project_workspace(w.user_id,w.payload);end loop;
end;$$;
create function private.sync_workspace_entities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>new.user_id or not public.session_is_active() then raise exception 'AUTH';end if;
 if TG_OP='INSERT' or (old.payload->'facts',old.payload->'versions',old.payload->'applications') is distinct from (new.payload->'facts',new.payload->'versions',new.payload->'applications') then
  perform private.project_workspace(new.user_id,new.payload);
 end if;
 return new;
end;$$;
revoke all on function private.sync_workspace_entities() from public,anon,authenticated;
create trigger workspace_sync_entities after insert or update of payload on public.workspaces for each row execute function private.sync_workspace_entities();
