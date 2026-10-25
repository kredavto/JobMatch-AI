begin;
-- Pure transition tests complement the owner/session and rollback integration suites.
do $$declare
 s jsonb:='{"original":" SQL \r\nOther","goal":"","vacancy":"SQL","facts":[{"id":"f","text":"SQL","source":"input","verified":true}],"versions":[],"applications":[]}';
 v jsonb:='{"id":"v","created":"2026-10-25","text":"РЕЛЕВАНТНЫЙ ОПЫТ\nSQL\n\nПРОФИЛЬ\nOther","vacancy":"SQL","score":100,"evidence_ids":["f"],"evidence_snapshot":[{"id":"f","text":"SQL","source":"input","verified":true}],"profile_revision":1,"engine_version":"rules-v1"}';
 n jsonb; bad jsonb; testcase jsonb;
begin
 n:=jsonb_set(s,'{versions}',jsonb_build_array(v));perform private.validate_fact_write(s,n,'version',1);
 perform private.validate_fact_write(s,jsonb_set(s,'{goal}','"Analyst"'),'goal',1);
 perform private.validate_fact_write(s,jsonb_set(s,'{facts,0,verified}','false'),'verify',1);
 for testcase in select value from jsonb_array_elements(jsonb_build_array(
 jsonb_build_object('action','goal','data',jsonb_set(s,'{original}','"rewrite"')),
 jsonb_build_object('action','verify','data',jsonb_set(s,'{facts,0,text}','"invented"')),
 jsonb_build_object('action','import','data',s),
 jsonb_build_object('action','version','data',jsonb_set(n,'{versions,0,text}','"invented"')),
 jsonb_build_object('action','version','data',jsonb_set(n,'{versions,0,evidence_ids}','["missing"]')),
 jsonb_build_object('action','version','data',jsonb_set(n,'{versions,0,evidence_snapshot,0,text}','"invented"')),
 jsonb_build_object('action','version','data',jsonb_set(n,'{versions,0,profile_revision}','0')),
 jsonb_build_object('action','unknown','data',s)
 )) loop
  begin perform private.validate_fact_write(s,testcase->'data',testcase->>'action',1);raise exception 'invalid transition accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 end loop;
 bad:=jsonb_set(s,'{facts,0,verified}','false');
 begin perform private.validate_fact_write(bad,jsonb_set(bad,'{versions}',jsonb_build_array(v)),'version',1);raise exception 'unverified evidence accepted';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 -- Saved versions are append-only; restore must preserve source content and provenance.
 s:=n;n:=jsonb_set(s,'{versions}',(s->'versions')||jsonb_build_array(v||'{"id":"restored","restored_from":"v"}'));
 perform private.validate_fact_write(s,n,'restore',2);
 begin perform private.validate_fact_write(s,jsonb_set(n,'{versions,0,text}','"rewrite original"'),'restore',2);raise exception 'saved version changed';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
 n:=jsonb_set(s,'{applications}','[{"id":"a","title":"Job","note":"","created":"2026-10-25","status":"Планируется","events":[{"status":"Планируется","date":"2026-10-25"}]}]');
 perform private.validate_fact_write(s,n,'application',2);s:=n;
 n:=jsonb_set(jsonb_set(s,'{applications,0,status}','"Приглашение"'),'{applications,0,events}',(s#>'{applications,0,events}')||'[{"status":"Приглашение","date":"2026-10-26"}]');
 perform private.validate_fact_write(s,n,'application',3);
 begin perform private.validate_fact_write(s,jsonb_set(n,'{applications,0,events,0,date}','"changed past"'),'application',3);raise exception 'past event changed';exception when raise_exception then if sqlerrm<>'INVALID_WRITE' then raise;end if;end;
end;$$;
rollback;
select 'PASS: scoped actions, false import, evidence gate, CRLF trim, immutable versions, restore provenance, append-only events' as result;
