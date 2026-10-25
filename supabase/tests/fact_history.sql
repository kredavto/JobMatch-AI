-- Transactional integration test: only synthetic users, all changes rolled back.
begin;
create temporary table qa_history_ids(a uuid,b uuid,sa uuid,sb uuid);
insert into qa_history_ids values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on qa_history_ids to authenticated;
insert into auth.users(id) select a from qa_history_ids union all select b from qa_history_ids;
insert into auth.sessions(id,user_id) select sa,a from qa_history_ids union all select sb,b from qa_history_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_history_ids;
set local role authenticated;
select public.save_workspace(0,'{"facts":[{"id":"f1","text":"SQL","source":"test","verified":false}]}','import');
select public.save_workspace(1,'{"facts":[{"id":"f1","text":"SQL","source":"test","verified":true}]}','verify');
select public.save_workspace(2,'{"facts":[{"id":"f1","text":"SQL","source":"test","verified":true}],"goal":"analyst"}','goal');
do $$begin
 if (select count(*) from public.fact_history)<>2 then raise exception 'history count'; end if;
 if (select facts->0->>'verified' from public.fact_history order by id limit 1)<>'false' then raise exception 'old snapshot changed'; end if;
 begin update public.fact_history set kind='baseline';raise exception 'update allowed';exception when insufficient_privilege then null;end;
 begin delete from public.fact_history;raise exception 'delete allowed';exception when insufficient_privilege then null;end;
 begin insert into public.fact_history(user_id,workspace_revision,kind,facts) values(auth.uid(),99,'change','[]');raise exception 'insert allowed';exception when insufficient_privilege then null;end;
 begin perform public.save_workspace(1,'{"facts":[]}','import');raise exception 'stale revision allowed';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 if (select count(*) from public.fact_history)<>2 then raise exception 'failed write recorded';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb)::text,true) from qa_history_ids;
do $$begin if exists(select 1 from public.fact_history) then raise exception 'cross owner history leak';end if;end;$$;
reset role;
delete from auth.sessions where id=(select sa from qa_history_ids);
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa)::text,true) from qa_history_ids;
set local role authenticated;
do $$begin if exists(select 1 from public.fact_history) then raise exception 'revoked session leak';end if;end;$$;
reset role;
delete from auth.users where id=(select a from qa_history_ids);
do $$begin if exists(select 1 from public.fact_history where user_id=(select a from qa_history_ids)) then raise exception 'cascade failed';end if;end;$$;
set local role anon;
do $$begin
 begin perform 1 from public.fact_history;raise exception 'anon select allowed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: snapshots, unchanged facts, write denial, conflict atomicity, RLS, session revocation, cascade, anon denial' as result;
