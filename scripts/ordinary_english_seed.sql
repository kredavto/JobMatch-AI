-- Synthetic-only extra owner: preserve other restore fixtures' workspace revisions.
begin;
insert into auth.users values('66666666-6666-4666-8666-666666666666');
insert into auth.sessions(id,user_id) values('77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666');
set local request.jwt.claims='{"sub":"66666666-6666-4666-8666-666666666666","session_id":"77777777-7777-4777-8777-777777777777"}';
set local role authenticated;
do $$declare s jsonb;cmd jsonb;begin
 s:=public.apply_workspace_command(0,'{"action":"import","text":"SQL\nRésumé — 42%"}');
 s:=public.apply_workspace_command(1,'{"action":"vacancy","text":"SQL role"}');
 s:=public.apply_workspace_command(2,jsonb_build_object('action','verify','ids',jsonb_build_array(s#>>'{facts,0,id}'),'verified',true));
 cmd:=jsonb_build_object('action','version','evidence_ids',jsonb_build_array(s#>>'{facts,0,id}'),'score',100,'match_metadata','{"rules_revision":"rules-2026-10-25.1","weights":{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10},"contributions":{"matched":1,"partial":0.5,"missing":0,"unknown":0},"requirements":1,"outcomes":{"matched":1,"partial":0,"missing":0,"unknown":0}}'::jsonb);
 s:=public.apply_workspace_command(3,cmd);
 perform public.apply_workspace_command(4,cmd||'{"template_version":"ordinary-literal-en-v1"}');
end;$$;
commit;
