\set ON_ERROR_STOP on
begin;
create function pg_temp.signed(scope text,subject text) returns boolean language sql as $$
 select public.consume_auth_quota(scope,subject,floor(extract(epoch from statement_timestamp()))::bigint,
 encode(extensions.hmac(convert_to('jobmatch-auth-quota-v1'||chr(10)||scope||chr(10)||subject||chr(10)||floor(extract(epoch from statement_timestamp()))::bigint::text,'UTF8'),decode(repeat('a',64),'hex'),'sha256'),'hex'));
$$;
insert into private.auth_quota_config(signing_key) values(decode(repeat('a',64),'hex'));
do $$declare n integer;result jsonb;item jsonb;active_count integer;begin
 for n in 1..11 loop perform pg_temp.signed('credentials',repeat('b',64));end loop;
 update private.auth_quotas set count=120 where scope='credentials' and subject='*';
 perform pg_temp.signed('credentials',repeat('c',64));
 result:=private.auth_quota_status();
 select value into item from jsonb_array_elements(result->'scopes') where value->>'scope'='credentials';
 if item<>jsonb_build_object('scope','credentials','allowed',10,'denied_global',1,'denied_subject',1) then raise exception 'OUTCOMES';end if;
 if result::text like '%'||repeat('a',64)||'%' or result::text like '%'||repeat('b',64)||'%' or not(result->>'config_present')::boolean then raise exception 'PRIVATE_DATA';end if;
 if jsonb_array_length(result->'scopes')<>5 then raise exception 'SCOPE_COMPLETENESS';end if;
 -- Purge touches at most one expired row of each table; boundary/active rows stay.
 insert into private.auth_quotas select 'mail',repeat('e',63)||g.i::text,floor(extract(epoch from statement_timestamp())/60)-1440-g.i,1 from generate_series(1,3) g(i);
 insert into private.auth_quota_outcomes select 'mail',floor(extract(epoch from statement_timestamp())/60)-1440-g.i,1,0,0 from generate_series(1,3) g(i);
 insert into private.auth_quotas values('mail',repeat('d',64),floor(extract(epoch from statement_timestamp())/60)-1440,1);
 active_count:=(select count(*) from private.auth_quotas where bucket>=floor(extract(epoch from statement_timestamp())/60)-1440);
 if private.purge_auth_quotas(1)<>jsonb_build_object('version',1,'deleted_counters',1,'deleted_outcomes',1) then raise exception 'BOUNDED_PURGE';end if;
 result:=private.auth_quota_status();
 if(result->>'expired_counters')::int<>2 or(result->>'expired_outcomes')::int<>2 then raise exception 'STATUS_BACKLOG';end if;
 perform private.purge_auth_quotas(1000);
 if active_count<>(select count(*) from private.auth_quotas where bucket>=floor(extract(epoch from statement_timestamp())/60)-1440) or not exists(select 1 from private.auth_quota_config) then raise exception 'ACTIVE_OR_KEY_DELETED';end if;
 begin perform private.purge_auth_quotas(0);raise exception 'SHOULD_DENY';exception when others then if sqlerrm<>'AUTH_QUOTA_PURGE_INVALID' then raise;end if;end;
end$$;
-- Metric failure must roll back the authorization charge, not become an allow.
create function pg_temp.fail_metric() returns trigger language plpgsql as $$begin raise exception 'FIXTURE_METRIC_FAILURE';end$$;
create trigger fixture_metric_failure before insert or update on private.auth_quota_outcomes for each row execute function pg_temp.fail_metric();
do $$begin
 begin perform pg_temp.signed('mail',repeat('f',64));raise exception 'SHOULD_FAIL';exception when others then if sqlerrm<>'FIXTURE_METRIC_FAILURE' then raise;end if;end;
 if exists(select 1 from private.auth_quotas where scope='mail' and subject='*') then raise exception 'PARTIAL_QUOTA_WRITE';end if;
end$$;
set local role authenticated;
do $$begin
 begin perform private.auth_quota_status();raise exception 'STATUS_PUBLIC';exception when insufficient_privilege then null;end;
 begin perform private.purge_auth_quotas(1);raise exception 'PURGE_PUBLIC';exception when insufficient_privilege then null;end;
 begin perform private.record_auth_quota_outcome('mail',1,'allowed');raise exception 'METRIC_PUBLIC';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
