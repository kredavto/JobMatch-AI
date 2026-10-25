create function private.validate_application_write(old_state jsonb,new_state jsonb) returns void language plpgsql security invoker set search_path='' as $$
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
    if (item-array['status','note','events','resumeVersionId']) is distinct from (prior-array['status','note','events','resumeVersionId']) then raise exception 'INVALID_WRITE';end if;
    if item->>'status'=prior->>'status' then
     if item->'events' is distinct from prior->'events' then raise exception 'INVALID_WRITE';end if;
    else
     if jsonb_array_length(item->'events')<>jsonb_array_length(prior->'events')+1 or ((item->'events')-jsonb_array_length(prior->'events'))<>prior->'events' then raise exception 'INVALID_WRITE';end if;
    end if;
   end if;
   if item is distinct from prior and item->'events'->-1->>'status' is distinct from item->>'status' then raise exception 'INVALID_WRITE';end if;
  end loop;
  if changes>1 then raise exception 'INVALID_WRITE';end if;
end;$$;
revoke all on function private.validate_application_write(jsonb,jsonb) from public,anon,authenticated;
