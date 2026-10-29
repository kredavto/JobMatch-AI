-- Opt-in server-signed pre-auth quota. No production secret is seeded here.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$begin
 if not exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto' and n.nspname='extensions') then
  raise exception 'AUTH_QUOTA_REQUIRES_PGCRYPTO_IN_EXTENSIONS';
 end if;
end$$;
create table private.auth_quota_config (
 singleton boolean primary key default true check(singleton),
 signing_key bytea not null check(octet_length(signing_key)=32)
);
create table private.auth_quotas (
 scope text not null check(scope in ('credentials','mail','refresh','exchange','update')),
 subject text not null check(subject='*' or subject ~ '^[a-f0-9]{64}$'),
 bucket bigint not null,
 count integer not null check(count between 1 and 120),
 primary key(scope,subject,bucket)
);
create index auth_quotas_expiry on private.auth_quotas(bucket);
alter table private.auth_quota_config enable row level security;
alter table private.auth_quotas enable row level security;
revoke all on private.auth_quota_config,private.auth_quotas from public,anon,authenticated;

-- uid is intentionally not required: login/mail occur before there is a session.
-- HMAC authorizes only charging fixed budgets, never Auth/PII reads or writes.
create function public.consume_auth_quota(p_scope text,p_subject text,p_timestamp bigint,p_signature text) returns boolean
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare key bytea; expected bytea; current_seconds bigint; current_bucket bigint; global_max integer; subject_max integer; charged integer;
begin
 current_seconds:=floor(extract(epoch from clock_timestamp()));
 if p_scope is null or p_scope not in ('credentials','mail','refresh','exchange','update')
  or p_subject is null or p_subject !~ '^[a-f0-9]{64}$'
  or p_signature is null or p_signature !~ '^[a-f0-9]{64}$'
  or p_timestamp is null or p_timestamp<current_seconds-30 or p_timestamp>current_seconds+5 then raise exception 'AUTH_QUOTA_DENIED';end if;
 select signing_key into key from private.auth_quota_config where singleton;
 if key is null then raise exception 'AUTH_QUOTA_DENIED';end if;
 expected:=extensions.hmac(convert_to('jobmatch-auth-quota-v1'||chr(10)||p_scope||chr(10)||p_subject||chr(10)||p_timestamp::text,'UTF8'),key,'sha256');
 -- Compare keyed digests so bytea equality cannot reveal a prefix of expected MAC.
 if extensions.hmac(decode(p_signature,'hex'),key,'sha256')<>extensions.hmac(expected,key,'sha256') then raise exception 'AUTH_QUOTA_DENIED';end if;
 global_max:=case p_scope when 'credentials' then 120 when 'refresh' then 120 when 'exchange' then 60 else 30 end;
 subject_max:=case p_scope when 'credentials' then 10 when 'refresh' then 10 when 'mail' then 3 else 5 end;
 current_bucket:=floor(extract(epoch from clock_timestamp())/60);
 -- Bounded lazy expiry only after authentication. No raw identifiers are stored.
 delete from private.auth_quotas q using (select scope,subject,bucket from private.auth_quotas where bucket<current_bucket-1440 order by bucket limit 200) old
 where q.scope=old.scope and q.subject=old.subject and q.bucket=old.bucket;
 -- All instances acquire the global row first. Denied subjects still charge this budget.
 insert into private.auth_quotas values(p_scope,'*',current_bucket,1)
 on conflict(scope,subject,bucket) do update set count=private.auth_quotas.count+1 where private.auth_quotas.count<global_max returning count into charged;
 if charged is null then return false;end if;
 charged:=null;
 insert into private.auth_quotas values(p_scope,p_subject,current_bucket,1)
 on conflict(scope,subject,bucket) do update set count=private.auth_quotas.count+1 where private.auth_quotas.count<subject_max returning count into charged;
 return charged is not null;
end;$$;
revoke all on function public.consume_auth_quota(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.consume_auth_quota(text,text,bigint,text) to anon,authenticated;
