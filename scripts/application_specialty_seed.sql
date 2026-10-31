-- Explicit real RPC in a disposable database, after the no-rewrite upgrade comparison.
begin;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}',true);
set local role authenticated;
do $$declare s jsonb;a jsonb;r jsonb;begin
 s:=public.read_workspace();select item into a from jsonb_array_elements(s->'applications') item where item->>'id'='a1';
 if a is null then raise exception 'synthetic specialty seed row missing';end if;
 r:=public.apply_workspace_command((s->>'revision')::integer,jsonb_build_object('action','application','id','a1','status',a->>'status','note',a->>'note','specialty','SYNTHETIC analyst'));
 if r#>>'{applications,0,specialty}'<>'SYNTHETIC analyst' or (r->'applications'->0)-'specialty' is distinct from a-'specialty' then raise exception 'synthetic specialty seed write changed unrelated data';end if;
end;$$;
commit;
