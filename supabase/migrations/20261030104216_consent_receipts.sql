-- Explicit reported acceptance. CLI-created filename; no notice or acceptance is seeded.
create table private.processing_notices (
 version text not null check(version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'),
 locale text not null check(locale in ('ru','en')),
 body text not null check(length(body) between 1 and 16000 and octet_length(body)<=64000 and length(btrim(body,E' \t\n\r'))>0),
 sha256 text not null check(sha256=encode(extensions.digest(convert_to(body,'UTF8'),'sha256'),'hex')),
 operator_reference text not null check(length(operator_reference) between 1 and 500),
 active boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 primary key(version,locale)
);
create unique index processing_notice_active_locale on private.processing_notices(locale) where active;
alter table private.processing_notices enable row level security;
revoke all on private.processing_notices from public,anon,authenticated;
create function private.freeze_processing_notice() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if row(new.version,new.locale,new.body,new.sha256,new.operator_reference,new.created_at) is distinct from row(old.version,old.locale,old.body,old.sha256,old.operator_reference,old.created_at) then raise exception 'IMMUTABLE_NOTICE';end if;
 return new;
end;$$;
revoke all on function private.freeze_processing_notice() from public,anon,authenticated;
create trigger processing_notice_frozen before update on private.processing_notices for each row execute function private.freeze_processing_notice();

create table public.processing_consent_receipts (
 id uuid not null default gen_random_uuid() unique,
 user_id uuid not null references auth.users(id) on delete cascade,
 sequence integer not null check(sequence between 1 and 200),
 command_id uuid not null,
 notice_version text not null,
 notice_locale text not null,
 notice_text text not null check(length(notice_text) between 1 and 16000 and octet_length(notice_text)<=64000),
 notice_sha256 text not null check(notice_sha256=encode(extensions.digest(convert_to(notice_text,'UTF8'),'sha256'),'hex')),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(user_id,sequence),
 unique(user_id,command_id),
 unique(user_id,notice_version,notice_locale),
 foreign key(notice_version,notice_locale) references private.processing_notices(version,locale)
);
create index consent_receipt_notice on public.processing_consent_receipts(notice_version,notice_locale);
alter table public.processing_consent_receipts enable row level security;
revoke all on public.processing_consent_receipts from public,anon,authenticated;
grant select on public.processing_consent_receipts to authenticated;
create policy processing_consent_receipts_select on public.processing_consent_receipts for select to authenticated
 using ((select auth.uid())=user_id and (select public.session_is_active()));
create function private.freeze_consent_receipt() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception 'IMMUTABLE_CONSENT_RECEIPT';end;$$;
revoke all on function private.freeze_consent_receipt() from public,anon,authenticated;
create trigger consent_receipt_frozen before update on public.processing_consent_receipts for each row execute function private.freeze_consent_receipt();
-- Clients have no INSERT/UPDATE/DELETE/TRUNCATE; deleting the Auth owner cascades the journal.

create function private.processing_notice_json(p_version text,p_locale text,p_body text,p_sha256 text) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('version',p_version,'locale',p_locale,'text',p_body,'sha256',p_sha256,'digestFormat','utf8-sha256-v1');
$$;
revoke all on function private.processing_notice_json(text,text,text,text) from public,anon,authenticated;
create function private.consent_receipt_json(r public.processing_consent_receipts) returns jsonb
language sql stable security invoker set search_path='' set timezone='UTC' as $$
 select jsonb_build_object('format','jobmatch-consent-receipt-v1','id',r.id,'ownerId',r.user_id,'sequence',r.sequence,'commandId',r.command_id,
  'notice',private.processing_notice_json(r.notice_version,r.notice_locale,r.notice_text,r.notice_sha256),
  'recordedAt',r.recorded_at,'provenance','authenticated-user-report','assurance','not-a-signature-or-legal-approval');
$$;
revoke all on function private.consent_receipt_json(public.processing_consent_receipts) from public,anon,authenticated;

-- Narrow private definer: read only this active account's journal and published notice.
create function private.read_consent_receipts(p_locale text,p_after integer,p_through integer) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();head integer;total integer;boundary integer;items jsonb;last_at integer;notice jsonb;legacy jsonb;latest jsonb;
begin
 if uid is null or not private.session_is_active() then raise exception 'AUTH';end if;
 if p_locale is null or p_locale not in ('ru','en') or p_after is null or p_after not between 0 and 200 or (p_through is not null and p_through not between 0 and 200) then raise exception 'INVALID_WRITE';end if;
 select coalesce(max(sequence),0),count(*) into head,total from public.processing_consent_receipts where user_id=uid;
 if head<>total then raise exception 'CONSENT_LEDGER_INTEGRITY';end if;
 boundary:=coalesce(p_through,head);
 if boundary>head or p_after>boundary then raise exception 'CONFLICT';end if;
 select private.processing_notice_json(version,locale,body,sha256) into notice from private.processing_notices where locale=p_locale and active;
 select jsonb_build_object('kind','legacy-workspace-observation','version',version,'observedAt',created) into legacy from public.consent_records where user_id=uid;
 select private.consent_receipt_json(r) into latest from public.processing_consent_receipts r where user_id=uid and sequence=boundary;
 select coalesce(jsonb_agg(private.consent_receipt_json(r::public.processing_consent_receipts) order by sequence),'[]'::jsonb),max(sequence) into items,last_at
 from (select * from public.processing_consent_receipts where user_id=uid and sequence>p_after and sequence<=boundary order by sequence limit 20) r;
 return jsonb_build_object('format','jobmatch-consent-page-v1','ownerId',uid,'through',boundary,'notice',notice,'legacyObservation',legacy,'latestReceipt',latest,
  'rows',items,'nextAfter',case when last_at<boundary then last_at else null end);
end;$$;
revoke all on function private.read_consent_receipts(text,integer,integer) from public,anon;
grant execute on function private.read_consent_receipts(text,integer,integer) to authenticated;
create function public.read_consent_receipts(p_locale text,p_after integer default 0,p_through integer default null) returns jsonb
language sql security invoker set search_path='' as $$select private.read_consent_receipts(p_locale,p_after,p_through);$$;
revoke all on function public.read_consent_receipts(text,integer,integer) from public,anon;
grant execute on function public.read_consent_receipts(text,integer,integer) to authenticated;

-- No owner, text or timestamp parameter. A signed-in caller explicitly reports acceptance.
create function private.accept_processing_notice(p_expected_sequence integer,p_command_id uuid,p_notice_version text,p_notice_locale text,p_notice_sha256 text,p_acknowledged boolean) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();head integer;total integer;previous public.processing_consent_receipts;published private.processing_notices;receipt public.processing_consent_receipts;
begin
 if uid is null then raise exception 'AUTH';end if;
 -- Prevent a concurrent session revocation from committing before this write.
 perform 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=uid for share;
 if not found then raise exception 'AUTH';end if;
 if p_expected_sequence is null or p_expected_sequence not between 0 and 200 or p_command_id is null or p_notice_version is null or p_notice_version !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'
  or p_notice_locale is null or p_notice_locale not in ('ru','en') or p_notice_sha256 is null or p_notice_sha256 !~ '^[a-f0-9]{64}$' or p_acknowledged is distinct from true then raise exception 'INVALID_WRITE';end if;
 perform pg_advisory_xact_lock(hashtextextended('consent-receipts:'||uid::text,0));
 select coalesce(max(sequence),0),count(*) into head,total from public.processing_consent_receipts where user_id=uid;
 if head<>total then raise exception 'CONSENT_LEDGER_INTEGRITY';end if;
 select * into previous from public.processing_consent_receipts where user_id=uid and command_id=p_command_id;
 if found then
  if previous.sequence<>p_expected_sequence+1 or previous.notice_version<>p_notice_version or previous.notice_locale<>p_notice_locale or previous.notice_sha256<>p_notice_sha256 then raise exception 'CONFLICT';end if;
  return private.consent_receipt_json(previous);
 end if;
 if head<>p_expected_sequence or exists(select 1 from public.processing_consent_receipts where user_id=uid and notice_version=p_notice_version and notice_locale=p_notice_locale) then raise exception 'CONFLICT';end if;
 if head>=200 then raise exception 'CONSENT_HISTORY_LIMIT';end if;
 select * into published from private.processing_notices where version=p_notice_version and locale=p_notice_locale and active for share;
 if not found or published.sha256<>p_notice_sha256 then raise exception 'CONFLICT';end if;
 insert into public.processing_consent_receipts(user_id,sequence,command_id,notice_version,notice_locale,notice_text,notice_sha256)
 values(uid,head+1,p_command_id,published.version,published.locale,published.body,published.sha256) returning * into receipt;
 return private.consent_receipt_json(receipt);
end;$$;
revoke all on function private.accept_processing_notice(integer,uuid,text,text,text,boolean) from public,anon;
grant execute on function private.accept_processing_notice(integer,uuid,text,text,text,boolean) to authenticated;
create function public.accept_processing_notice(p_expected_sequence integer,p_command_id uuid,p_notice_version text,p_notice_locale text,p_notice_sha256 text,p_acknowledged boolean) returns jsonb
language sql security invoker set search_path='' as $$select private.accept_processing_notice(p_expected_sequence,p_command_id,p_notice_version,p_notice_locale,p_notice_sha256,p_acknowledged);$$;
revoke all on function public.accept_processing_notice(integer,uuid,text,text,text,boolean) from public,anon;
grant execute on function public.accept_processing_notice(integer,uuid,text,text,text,boolean) to authenticated;

-- Sensitive account deletion also requires a currently active, locked session.
create or replace function private.delete_own_auth_user() returns void
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'AUTH';end if;
 perform 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=uid for update;
 if not found then raise exception 'AUTH';end if;
 delete from auth.sessions where user_id=uid;
 delete from auth.users where id=uid;
end;$$;
revoke all on function private.delete_own_auth_user() from public,anon;
grant execute on function private.delete_own_auth_user() to authenticated;
