-- Aggregate outcomes only. No identity, pseudonym, signature or key column.
create table private.auth_quota_outcomes (
 scope text not null check(scope in ('credentials','mail','refresh','exchange','update')),
 bucket bigint not null,
 allowed bigint not null default 0 check(allowed between 0 and 9007199254740991),
 denied_global bigint not null default 0 check(denied_global between 0 and 9007199254740991),
 denied_subject bigint not null default 0 check(denied_subject between 0 and 9007199254740991),
 primary key(scope,bucket)
);
create index auth_quota_outcomes_expiry on private.auth_quota_outcomes(bucket);
alter table private.auth_quota_outcomes enable row level security;
revoke all on private.auth_quota_outcomes from public,anon,authenticated;
create function private.record_auth_quota_outcome(p_scope text,p_bucket bigint,p_result text) returns void
language plpgsql security invoker set search_path='' as $$begin
 if p_result is null or p_result not in ('allowed','global','subject') then raise exception 'AUTH_QUOTA_OUTCOME_INVALID';end if;
 insert into private.auth_quota_outcomes(scope,bucket,allowed,denied_global,denied_subject)
 values(p_scope,p_bucket,(p_result='allowed')::int,(p_result='global')::int,(p_result='subject')::int)
 on conflict(scope,bucket) do update set
 allowed=least(9007199254740991,private.auth_quota_outcomes.allowed+excluded.allowed),
 denied_global=least(9007199254740991,private.auth_quota_outcomes.denied_global+excluded.denied_global),
 denied_subject=least(9007199254740991,private.auth_quota_outcomes.denied_subject+excluded.denied_subject);
end$$;
revoke all on function private.record_auth_quota_outcome(text,bigint,text) from public,anon,authenticated;

create or replace function public.consume_auth_quota(p_scope text,p_subject text,p_timestamp bigint,p_signature text) returns boolean
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
 if charged is null then perform private.record_auth_quota_outcome(p_scope,current_bucket,'global');return false;end if;
 charged:=null;
 insert into private.auth_quotas values(p_scope,p_subject,current_bucket,1)
 on conflict(scope,subject,bucket) do update set count=private.auth_quotas.count+1 where private.auth_quotas.count<subject_max returning count into charged;
 perform private.record_auth_quota_outcome(p_scope,current_bucket,case when charged is null then 'subject' else 'allowed' end);
 return charged is not null;
end;$$;
revoke all on function public.consume_auth_quota(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.consume_auth_quota(text,text,bigint,text) to anon,authenticated;

-- Administrative DB functions only: not exposed through a public RPC or app route.
create function private.auth_quota_status() returns jsonb
language sql stable security invoker set search_path='' as $$
 with time as(select floor(extract(epoch from statement_timestamp())/60)::bigint as bucket),
 scopes(scope) as(values('credentials'),('mail'),('refresh'),('exchange'),('update'))
 select jsonb_build_object('version',1,'bucket',time.bucket,
  'config_present',exists(select 1 from private.auth_quota_config),
  'expired_counters',(select count(*) from private.auth_quotas where bucket<time.bucket-1440),
  'expired_outcomes',(select count(*) from private.auth_quota_outcomes where bucket<time.bucket-1440),
  'scopes',(select jsonb_agg(jsonb_build_object('scope',s.scope,
    'allowed',coalesce(o.allowed,0),'denied_global',coalesce(o.denied_global,0),'denied_subject',coalesce(o.denied_subject,0)) order by s.scope)
   from scopes s left join lateral(select sum(allowed)::bigint as allowed,sum(denied_global)::bigint as denied_global,sum(denied_subject)::bigint as denied_subject
     from private.auth_quota_outcomes where scope=s.scope and bucket between time.bucket-59 and time.bucket) o on true))
 from time;
$$;
revoke all on function private.auth_quota_status() from public,anon,authenticated;
create function private.purge_auth_quotas(p_limit integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare cutoff bigint:=floor(extract(epoch from statement_timestamp())/60)-1440; counters integer; outcomes integer;
begin
 if p_limit is null or p_limit not between 1 and 1000 then raise exception 'AUTH_QUOTA_PURGE_INVALID';end if;
 with expired as(select scope,subject,bucket from private.auth_quotas where bucket<cutoff order by bucket,scope,subject limit p_limit for update skip locked),
 deleted as(delete from private.auth_quotas q using expired e where(q.scope,q.subject,q.bucket)=(e.scope,e.subject,e.bucket) returning 1)
 select count(*) into counters from deleted;
 with expired as(select scope,bucket from private.auth_quota_outcomes where bucket<cutoff order by bucket,scope limit p_limit for update skip locked),
 deleted as(delete from private.auth_quota_outcomes q using expired e where(q.scope,q.bucket)=(e.scope,e.bucket) returning 1)
 select count(*) into outcomes from deleted;
 return jsonb_build_object('version',1,'deleted_counters',counters,'deleted_outcomes',outcomes);
end$$;
revoke all on function private.purge_auth_quotas(integer) from public,anon,authenticated;
