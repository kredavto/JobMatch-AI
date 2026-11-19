-- DRAFT ONLY. Additive isolated migration; no real accounts enrolled; AI disabled.
begin;
create table private.ai_rewrite_config (
 id boolean primary key default true check(id), enabled boolean not null default false,
 policy_version text not null default 'groq-full-resume-account-v1',
 global_daily_cap integer not null default 0 check(global_daily_cap between 0 and 10000),
 user_daily_cap integer not null default 0 check(user_daily_cap between 0 and 1000)
);
insert into private.ai_rewrite_config(id) values(true);
create table private.ai_rewrite_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false, expires_at timestamptz not null
);
create table private.ai_rewrite_consents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 consent_id uuid not null unique default gen_random_uuid(), revision bigint not null check(revision>0),
 policy_version text not null, recipient text not null default 'groq' check(recipient='groq'),
 scope text not null default 'account' check(scope='account'),
 granted_at timestamptz not null, revoked_at timestamptz
);
-- Deliberately no cascading user FK: deleting an account cannot refund global usage.
-- No text, body digest, source, output, email, IP or provider credentials stored.
create table private.ai_rewrite_requests (
 request_id uuid primary key, user_id uuid not null, consent_id uuid not null,
 consent_revision bigint not null, reserved_at timestamptz not null,
 day date not null
);
create index ai_rewrite_requests_day_user on private.ai_rewrite_requests(day,user_id);
alter table private.ai_rewrite_config enable row level security;
alter table private.ai_rewrite_entitlements enable row level security;
alter table private.ai_rewrite_consents enable row level security;
alter table private.ai_rewrite_requests enable row level security;
revoke all on private.ai_rewrite_config,private.ai_rewrite_entitlements,private.ai_rewrite_consents,private.ai_rewrite_requests from public,anon,authenticated,service_role;

create function private.ai_rewrite_user() returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH'; end if;
 if not exists(select 1 from auth.users u where u.id=uid and not coalesce(u.is_anonymous,false) and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)) then raise exception 'AUTH'; end if;
 return uid;
end;$$;
create function private.ai_rewrite_consent_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.ai_rewrite_user(); c private.ai_rewrite_consents; policy text;
begin
 select policy_version into policy from private.ai_rewrite_config where id=true;
 select * into c from private.ai_rewrite_consents where user_id=uid;
 return jsonb_build_object('revision',coalesce(c.revision,0),'consent_id',c.consent_id,'policy_version',policy,'recipient','groq','scope','account','granted',coalesce(c.revoked_at is null and c.policy_version=policy and c.revision is not null,false));
end;$$;
create function private.ai_rewrite_change_consent(p_expected_revision bigint,p_policy_version text,p_grant boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.ai_rewrite_user(); cfg private.ai_rewrite_config; c private.ai_rewrite_consents;
begin
 -- Common first lock serializes consent/reservation operations; no external I/O in tx.
 select * into strict cfg from private.ai_rewrite_config where id=true for update;
 select * into c from private.ai_rewrite_consents where user_id=uid for update;
 if p_expected_revision is null or p_expected_revision<>coalesce(c.revision,0) then raise exception 'CONFLICT'; end if;
 if p_grant is true then
  if p_policy_version is distinct from cfg.policy_version then raise exception 'POLICY'; end if;
  insert into private.ai_rewrite_consents(user_id,revision,policy_version,granted_at)
   values(uid,1,cfg.policy_version,clock_timestamp())
   on conflict(user_id) do update set revision=ai_rewrite_consents.revision+1,consent_id=gen_random_uuid(),policy_version=excluded.policy_version,granted_at=excluded.granted_at,revoked_at=null;
 else
  if c.revision is not null then update private.ai_rewrite_consents set revision=revision+1,revoked_at=clock_timestamp() where user_id=uid; end if;
 end if;
 return private.ai_rewrite_consent_status();
end;$$;
create function private.ai_rewrite_reserve(p_request_id uuid,p_consent_id uuid,p_expected_revision bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.ai_rewrite_user(); cfg private.ai_rewrite_config; c private.ai_rewrite_consents; now_at timestamptz; today date; total bigint; mine bigint;
begin
 select * into strict cfg from private.ai_rewrite_config where id=true for update;
 now_at:=clock_timestamp(); today:=(now_at at time zone 'UTC')::date;
 if not cfg.enabled or p_request_id is null or p_consent_id is null or p_expected_revision is null then return false; end if;
 if not exists(select 1 from private.ai_rewrite_entitlements where user_id=uid and enabled and expires_at>now_at) then return false; end if;
 select * into c from private.ai_rewrite_consents where user_id=uid for update;
 if c.revision is null or c.revoked_at is not null or c.policy_version<>cfg.policy_version or c.consent_id<>p_consent_id or c.revision<>p_expected_revision then return false; end if;
 if exists(select 1 from private.ai_rewrite_requests where request_id=p_request_id) then return false; end if;
 select count(*),count(*) filter(where user_id=uid) into total,mine from private.ai_rewrite_requests where day=today;
 if total>=cfg.global_daily_cap or mine>=cfg.user_daily_cap then return false; end if;
 insert into private.ai_rewrite_requests(request_id,user_id,consent_id,consent_revision,reserved_at,day) values(p_request_id,uid,c.consent_id,c.revision,now_at,today);
 return true;
end;$$;
create function public.ai_rewrite_consent_status() returns jsonb language sql security invoker set search_path='' as $$select private.ai_rewrite_consent_status();$$;
create function public.ai_rewrite_grant_consent(p_expected_revision bigint,p_policy_version text) returns jsonb language sql security invoker set search_path='' as $$select private.ai_rewrite_change_consent(p_expected_revision,p_policy_version,true);$$;
create function public.ai_rewrite_revoke_consent(p_expected_revision bigint) returns jsonb language sql security invoker set search_path='' as $$select private.ai_rewrite_change_consent(p_expected_revision,null,false);$$;
create function public.ai_rewrite_reserve(p_request_id uuid,p_consent_id uuid,p_expected_revision bigint) returns boolean language sql security invoker set search_path='' as $$select private.ai_rewrite_reserve(p_request_id,p_consent_id,p_expected_revision);$$;
create function private.ai_rewrite_can_deliver(p_request_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.ai_rewrite_user();
begin
 return exists(select 1 from private.ai_rewrite_requests r
 join private.ai_rewrite_consents c on c.user_id=r.user_id and c.consent_id=r.consent_id and c.revision=r.consent_revision
 join private.ai_rewrite_entitlements e on e.user_id=r.user_id
 join private.ai_rewrite_config cfg on cfg.id=true
 where r.request_id=p_request_id and r.user_id=uid and c.revoked_at is null and c.policy_version=cfg.policy_version and cfg.enabled and e.enabled and e.expires_at>clock_timestamp());
end;$$;
create function public.ai_rewrite_can_deliver(p_request_id uuid) returns boolean language sql security invoker set search_path='' as $$select private.ai_rewrite_can_deliver(p_request_id);$$;
revoke all on function private.ai_rewrite_can_deliver(uuid),public.ai_rewrite_can_deliver(uuid) from public,anon,authenticated,service_role;
grant execute on function private.ai_rewrite_can_deliver(uuid),public.ai_rewrite_can_deliver(uuid) to authenticated;
-- Revoke inherited/default execute grants explicitly, including service_role.
revoke all on function private.ai_rewrite_user(),private.ai_rewrite_consent_status(),private.ai_rewrite_change_consent(bigint,text,boolean),private.ai_rewrite_reserve(uuid,uuid,bigint),public.ai_rewrite_consent_status(),public.ai_rewrite_grant_consent(bigint,text),public.ai_rewrite_revoke_consent(bigint),public.ai_rewrite_reserve(uuid,uuid,bigint) from public,anon,authenticated,service_role;
grant usage on schema private to authenticated;
grant execute on function private.ai_rewrite_consent_status(),private.ai_rewrite_change_consent(bigint,text,boolean),private.ai_rewrite_reserve(uuid,uuid,bigint),public.ai_rewrite_consent_status(),public.ai_rewrite_grant_consent(bigint,text),public.ai_rewrite_revoke_consent(bigint),public.ai_rewrite_reserve(uuid,uuid,bigint) to authenticated;
commit;
