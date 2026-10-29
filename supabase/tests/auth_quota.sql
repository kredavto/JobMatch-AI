\set ON_ERROR_STOP on
begin;
-- All identifiers and the key below are synthetic, disposable test data.
create function pg_temp.signed(scope text,subject text,stamp bigint default floor(extract(epoch from clock_timestamp()))) returns boolean language sql as $$
 select public.consume_auth_quota(scope,subject,stamp,encode(extensions.hmac(convert_to('jobmatch-auth-quota-v1'||chr(10)||scope||chr(10)||subject||chr(10)||stamp::text,'UTF8'),decode(repeat('a',64),'hex'),'sha256'),'hex'));
$$;
do $$begin
 if has_table_privilege('anon','private.auth_quotas','SELECT') or has_table_privilege('authenticated','private.auth_quota_config','SELECT') then raise exception 'TABLE_GRANTS';end if;
 if not (select relrowsecurity from pg_class where oid='private.auth_quotas'::regclass) or not (select relrowsecurity from pg_class where oid='private.auth_quota_config'::regclass) then raise exception 'RLS';end if;
 begin perform pg_temp.signed('mail',repeat('b',64));raise exception 'SHOULD_DENY';exception when others then if sqlerrm<>'AUTH_QUOTA_DENIED' then raise;end if;end;
end$$;
insert into private.auth_quota_config(signing_key) values(decode(repeat('a',64),'hex'));
do $$declare n integer;stamp bigint:=floor(extract(epoch from clock_timestamp()));v_scope text;begin
 -- Invalid callers cannot mutate/allocate counters.
 for n in 1..5 loop
  begin
   perform public.consume_auth_quota(case when n=1 then 'unknown' else 'mail' end,repeat('b',64),case when n=2 then stamp-31 when n=3 then stamp+6 else stamp end,case when n=4 then null else repeat('0',64) end);
   raise exception 'SHOULD_DENY';
  exception when others then if sqlerrm<>'AUTH_QUOTA_DENIED' then raise;end if;end;
 end loop;
 if exists(select 1 from private.auth_quotas) then raise exception 'UNSIGNED_MUTATION';end if;
 foreach v_scope in array array['credentials','mail','refresh','exchange','update'] loop
  for n in 1..(case v_scope when 'credentials' then 10 when 'refresh' then 10 when 'mail' then 3 else 5 end) loop
   if not pg_temp.signed(v_scope,repeat('b',64)) then raise exception 'EARLY_LIMIT';end if;
  end loop;
  if pg_temp.signed(v_scope,repeat('b',64)) then raise exception 'SUBJECT_LIMIT';end if;
 end loop;
 -- Previous minute is irrelevant even if its subject count is exhausted.
 update private.auth_quotas set bucket=bucket-2 where subject=repeat('b',64);
 if not pg_temp.signed('mail',repeat('b',64)) then raise exception 'WINDOW_RESET';end if;
 -- Force global ceiling: changing subjects does not evade it.
 update private.auth_quotas set count=30 where scope='mail' and subject='*';
 if pg_temp.signed('mail',repeat('c',64)) then raise exception 'GLOBAL_LIMIT';end if;
 if exists(select 1 from private.auth_quotas where subject=repeat('c',64)) then raise exception 'GLOBAL_ALLOCATION';end if;
 -- Invalid signed timestamp is rejected too.
 begin perform pg_temp.signed('mail',repeat('d',64),stamp-31);raise exception 'SHOULD_DENY';exception when others then if sqlerrm<>'AUTH_QUOTA_DENIED' then raise;end if;end;
 -- Bounded lazy expiry removes expired counters without storing identity data.
 insert into private.auth_quotas values('mail',repeat('e',64),floor(extract(epoch from clock_timestamp())/60)-1441,1);
 perform pg_temp.signed('mail',repeat('d',64));
 if exists(select 1 from private.auth_quotas where subject=repeat('e',64)) then raise exception 'EXPIRY';end if;
end$$;
select set_config('jobmatch.fixture_stamp',floor(extract(epoch from clock_timestamp()))::bigint::text,true);
select set_config('jobmatch.fixture_signature',encode(extensions.hmac(convert_to('jobmatch-auth-quota-v1'||chr(10)||'exchange'||chr(10)||repeat('f',64)||chr(10)||current_setting('jobmatch.fixture_stamp'),'UTF8'),decode(repeat('a',64),'hex'),'sha256'),'hex'),true);
-- Public/anon callers cannot forge a signed request or read the private key.
set local role anon;
do $$begin
 if not public.consume_auth_quota('exchange',repeat('f',64),current_setting('jobmatch.fixture_stamp')::bigint,current_setting('jobmatch.fixture_signature')) then raise exception 'SIGNED_ANON_DENIED';end if;
 begin perform * from private.auth_quota_config;raise exception 'KEY_VISIBLE';exception when insufficient_privilege then null;end;
 begin perform public.consume_auth_quota('mail',repeat('b',64),floor(extract(epoch from clock_timestamp()))::bigint,repeat('0',64));raise exception 'SHOULD_DENY';exception when others then if sqlerrm<>'AUTH_QUOTA_DENIED' then raise;end if;end;
end$$;
reset role;
-- Unexpected downstream insert failure rolls back the global charge too.
create function pg_temp.reject_subject() returns trigger language plpgsql as $$begin if new.subject<>'*' then raise exception 'FIXTURE_FAILURE';end if;return new;end$$;
create trigger fixture_failure before insert on private.auth_quotas for each row execute function pg_temp.reject_subject();
do $$declare before_count integer;begin
 select count into before_count from private.auth_quotas where scope='refresh' and subject='*';
 begin perform pg_temp.signed('refresh',repeat('f',64));raise exception 'NO_FAULT';exception when others then if sqlerrm<>'FIXTURE_FAILURE' then raise;end if;end;
 if before_count is distinct from (select count from private.auth_quotas where scope='refresh' and subject='*') then raise exception 'PARTIAL_CHARGE';end if;
end$$;
rollback;
