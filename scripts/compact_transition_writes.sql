-- ONLY synthetic restore_seed.sql fixtures in a generated disposable database.
begin;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}',true);
set local role authenticated;
do $$declare s jsonb;vid text;begin
 if public.read_workspace()->>'revision'<>'1' then raise exception 'Unexpected transition fixture';end if;
 s:=public.apply_workspace_command(1,'{"action":"goal","text":"After compact"}');
 s:=public.apply_workspace_command(2,'{"action":"vacancy","text":"SQL analyst"}');
 s:=public.apply_workspace_command(3,'{"action":"version","evidence_ids":["f1"],"score":100,"match_metadata":{"rules_revision":"rules-2026-10-25.1","weights":{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10},"contributions":{"matched":1,"partial":0.5,"missing":0,"unknown":0},"requirements":1,"outcomes":{"matched":1,"partial":0,"missing":0,"unknown":0}}}');
 vid:=s#>>'{versions,1,id}';
 s:=public.apply_workspace_command(4,jsonb_build_object('action','application','title','After compact','status','Планируется','note','','resumeVersionId',vid));
 s:=public.apply_workspace_command(5,'{"action":"fact","text":"Additional fact"}');
 s:=public.apply_workspace_command(6,jsonb_build_object('action','verify','ids',jsonb_build_array(s#>>'{facts,-1,id}'),'verified',true));
 s:=public.apply_workspace_command(7,jsonb_build_object('action','restore','id',vid));
 s:=public.apply_workspace_command(8,'{"action":"import","text":"New SQL"}');
 s:=public.apply_workspace_command(9,'{"action":"demo","text":"Demo SQL","vacancy":"Demo vacancy"}');
 perform public.save_workspace(10,jsonb_set(s,'{goal}','"Legacy after compact"'),'goal');
 if public.read_workspace()->>'revision'<>'11' or public.read_workspace()->>'goal'<>'Legacy after compact'
  or jsonb_array_length(public.read_workspace()->'versions')<>3 or jsonb_array_length(public.read_workspace()->'applications')<>2 then raise exception 'Transition writes failed';end if;
end;$$;
commit;
