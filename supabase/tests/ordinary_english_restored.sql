begin;
set local request.jwt.claims='{"sub":"66666666-6666-4666-8666-666666666666","session_id":"77777777-7777-4777-8777-777777777777"}';
set local role authenticated;
do $$declare s jsonb:=public.read_workspace();begin
 if s->>'revision'<>'5' or jsonb_array_length(s->'versions')<>2
    or s#>>'{versions,1,template_version}'<>'ordinary-literal-en-v1'
    or s#>>'{versions,1,text}'<>E'RELEVANT EXPERIENCE\nSQL\n\nPROFILE\nRésumé — 42%'
    or (s->'versions'->0) ? 'template_version' then raise exception 'RESTORED_ORDINARY_VERSION';end if;
end;$$;
rollback;
