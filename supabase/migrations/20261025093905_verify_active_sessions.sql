create function private.session_is_active() returns boolean language sql security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid()); $$;
revoke all on function private.session_is_active() from public,anon;
grant execute on function private.session_is_active() to authenticated;
create function public.session_is_active() returns boolean language sql security invoker set search_path='' as $$ select private.session_is_active(); $$;
revoke all on function public.session_is_active() from public,anon;
grant execute on function public.session_is_active() to authenticated;