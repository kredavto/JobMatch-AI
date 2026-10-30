begin;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","session_id":"44444444-4444-4444-8444-444444444444"}';
set local role authenticated;
do $$declare p jsonb;preview jsonb;ids uuid[];begin
 p:=public.read_structured_profile();ids:=array[(p#>>'{entries,0,id}')::uuid];
 p:=public.command_structured_profile(1,1,jsonb_build_object('action','confirm','id',ids[1],'confirmed',true));
 preview:=public.preview_structured_version(1,2,ids);
 perform public.save_structured_version(1,2,ids,preview->>'preview_hash','SAVE_LITERAL_VERSION');
 preview:=public.preview_structured_english_version(1,2,ids);
 perform public.save_structured_english_version(1,2,ids,preview->>'preview_hash','SAVE_LITERAL_VERSION');
end;$$;
commit;
