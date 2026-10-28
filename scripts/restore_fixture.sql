-- ONLY for a disposable stock PostgreSQL instance. Not Supabase Auth.
create schema auth;
create table auth.users(id uuid primary key);
create table auth.identities(id uuid primary key,user_id uuid references auth.users on delete cascade);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade);
create table auth.refresh_tokens(id bigint primary key,user_id uuid references auth.users on delete cascade);
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
$$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid; $$;
grant usage on schema auth to anon,authenticated;
