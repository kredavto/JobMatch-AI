-- Fixed synthetic fixture; no writes. Compare old rows and default Russian candidate metadata/text.
select md5(coalesce(jsonb_agg(to_jsonb(v) order by v.user_id,v.id)::text,'')) from public.resume_versions v;
select md5(((private.apply_version_intent('{"original":"SQL\nПример опыта","vacancy":"SQL","facts":[{"id":"f1","text":"SQL","source":"original","verified":true}],"versions":[]}'::jsonb,1,
 '{"action":"version","evidence_ids":["f1"],"score":100,"match_metadata":{"rules_revision":"rules-2026-10-25.1","weights":{"mandatory":35,"experience":25,"skills":20,"context":10,"clarity":10},"contributions":{"matched":1,"partial":0.5,"missing":0,"unknown":0},"requirements":1,"outcomes":{"matched":1,"partial":0,"missing":0,"unknown":0}}}'::jsonb)->'versions'->0)-array['id','created'])::text);
