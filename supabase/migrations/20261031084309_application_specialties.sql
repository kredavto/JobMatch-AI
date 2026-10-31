-- Explicit per-application labels. No existing rows or lifecycle events are rewritten.
begin;
create function private.valid_application_specialty(p_label jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_typeof(p_label)='string' and length(p_label#>>'{}')<=120
  and (p_label#>>'{}')=btrim(p_label#>>'{}',U&'\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff')
  and (p_label#>>'{}') !~ U&'[\0001-\001f\007f-\009f]',false);
$$;
revoke all on function private.valid_application_specialty(jsonb) from public,anon,authenticated;

create or replace function private.validate_application_write(old_state jsonb,new_state jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare n integer;item jsonb;prior jsonb;changes integer:=0;statuses text[]:=array['Планируется','Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер'];
begin
  n:=jsonb_array_length(old_state->'applications');
  if jsonb_array_length(new_state->'applications') not between n and n+1 then raise exception 'INVALID_WRITE';end if;
  for item in select value from jsonb_array_elements(new_state->'applications') loop
   if jsonb_typeof(item->'status') is distinct from 'string' or not (item->>'status'=any(statuses)) or jsonb_typeof(item->'note') is distinct from 'string' or length(item->>'note')>3000 or jsonb_typeof(item->'events') is distinct from 'array' then raise exception 'INVALID_WRITE';end if;
   if jsonb_array_length(item->'events')>200 then raise exception 'INVALID_WRITE';end if;
  end loop;
  for i in 0..jsonb_array_length(new_state->'applications')-1 loop
   item:=new_state->'applications'->i;prior:=old_state->'applications'->i;
   if prior is null then
    changes:=changes+1;
    if jsonb_typeof(item->'title') is distinct from 'string' or length(item->>'title') not between 1 and 300 or jsonb_array_length(item->'events')<>1 then raise exception 'INVALID_WRITE';end if;
   elsif item is distinct from prior then
    changes:=changes+1;
    if (item-array['status','note','events','resumeVersionId','specialty']) is distinct from (prior-array['status','note','events','resumeVersionId','specialty']) then raise exception 'INVALID_WRITE';end if;
    if item->>'status'=prior->>'status' then
     if item->'events' is distinct from prior->'events' then raise exception 'INVALID_WRITE';end if;
    else
     if jsonb_array_length(item->'events')<>jsonb_array_length(prior->'events')+1 or ((item->'events')-jsonb_array_length(prior->'events'))<>prior->'events' then raise exception 'INVALID_WRITE';end if;
    end if;
   end if;
   -- Preserve unknown legacy values verbatim, but every new/changed label must be valid.
   -- Dropping a previously present label is refused; explicit empty string clears it.
   if (item->'specialty') is distinct from (prior->'specialty') then
    if not (item ? 'specialty') or not private.valid_application_specialty(item->'specialty') then raise exception 'INVALID_WRITE';end if;
   end if;
   if item is distinct from prior and item->'events'->-1->>'status' is distinct from item->>'status' then raise exception 'INVALID_WRITE';end if;
  end loop;
  if changes>1 then raise exception 'INVALID_WRITE';end if;
end;$$;
revoke all on function private.validate_application_write(jsonb,jsonb) from public,anon,authenticated;

create or replace function private.apply_application_intent(p_state jsonb,p_command jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item jsonb; position integer; stamp text;
 statuses text[]:=array['Планируется','Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер'];
begin
 if jsonb_typeof(p_command) is distinct from 'object' or p_command->>'action' is distinct from 'application'
  or p_command-array['action','id','title','status','note','resumeVersionId','specialty']<>'{}'::jsonb
  or jsonb_typeof(p_command->'status') is distinct from 'string' or not (p_command->>'status'=any(statuses))
  or jsonb_typeof(p_command->'note') is distinct from 'string' or length(p_command->>'note')>3000 then raise exception 'INVALID_WRITE';end if;
 if p_command ? 'specialty' and not private.valid_application_specialty(p_command->'specialty') then raise exception 'INVALID_WRITE';end if;
 if p_command ? 'resumeVersionId' then
  if p_command->'resumeVersionId'<>'null'::jsonb then
   if jsonb_typeof(p_command->'resumeVersionId') is distinct from 'string' or length(p_command->>'resumeVersionId') not between 1 and 100 then raise exception 'INVALID_WRITE';end if;
   if not exists(select 1 from jsonb_array_elements(p_state->'versions') v where v->>'id'=p_command->>'resumeVersionId') then raise exception 'INVALID_WRITE';end if;
  end if;
 end if;
 stamp:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 if p_command ? 'id' then
  if jsonb_typeof(p_command->'id') is distinct from 'string' or length(p_command->>'id') not between 1 and 100 or p_command ? 'title' then raise exception 'INVALID_WRITE';end if;
  select a,n::integer-1 into item,position from jsonb_array_elements(p_state->'applications') with ordinality app(a,n) where a->>'id'=p_command->>'id';
  if item is null then raise exception 'INVALID_WRITE';end if;
  if item->>'status'<>p_command->>'status' then
   if jsonb_array_length(item->'events')>=200 then raise exception 'INVALID_WRITE';end if;
   item:=jsonb_set(item,'{events}',(item->'events')||jsonb_build_array(jsonb_build_object('status',p_command->>'status','date',stamp)));
  end if;
  item:=item||jsonb_build_object('status',p_command->>'status','note',p_command->>'note');
  -- Omitted version preserves both the old value and absence on a legacy row. Null unlinks.
  if p_command ? 'resumeVersionId' then item:=jsonb_set(item,'{resumeVersionId}',p_command->'resumeVersionId');end if;
  if p_command ? 'specialty' then item:=jsonb_set(item,'{specialty}',p_command->'specialty');end if;
  return jsonb_set(p_state,array['applications',position::text],item);
 else
  if jsonb_typeof(p_command->'title') is distinct from 'string' or length(p_command->>'title') not between 1 and 300 or jsonb_array_length(p_state->'applications')>=500 then raise exception 'INVALID_WRITE';end if;
  item:=jsonb_build_object('id',gen_random_uuid()::text,'title',p_command->>'title','status',p_command->>'status',
   'note',p_command->>'note','created',stamp,'resumeVersionId',coalesce(p_command->'resumeVersionId','null'::jsonb),
   'events',jsonb_build_array(jsonb_build_object('status',p_command->>'status','date',stamp)));
  if p_command ? 'specialty' then item:=jsonb_set(item,'{specialty}',p_command->'specialty');end if;
  return jsonb_set(p_state,'{applications}',(p_state->'applications')||jsonb_build_array(item));
 end if;
end;$$;
revoke all on function private.apply_application_intent(jsonb,jsonb) from public,anon,authenticated;


commit;
