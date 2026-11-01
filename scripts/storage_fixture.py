"""Owned native fixture phases only. Never invoke a storage rollback on a provider target."""
import re
from pathlib import Path
from backup_manifest import compare

ROOT = Path(__file__).resolve().parent.parent
PAIRS = [('JOBMATCH_LOCAL_RESTORE', 'drill'), ('JOBMATCH_LOCAL_LETTERS', 'letters'),
         ('JOBMATCH_LOCAL_SOURCE_PROFILE', 'source'), ('JOBMATCH_LOCAL_APPLICATIONS', 'applications'),
         ('JOBMATCH_LOCAL_PROFILE_COMMANDS', 'profile'), ('JOBMATCH_LOCAL_VERSION_COMMANDS', 'versions'),
         ('JOBMATCH_LOCAL_PARITY', 'parity'), ('JOBMATCH_LOCAL_CANONICAL', 'canonical'),
         ('JOBMATCH_LOCAL_EXPLICIT', 'explicit'), ('JOBMATCH_LOCAL_LOGICAL_BACKUPS', 'logical'),
         ('JOBMATCH_LOCAL_COMPACT', 'compact')]


def mirror_permitted(environment):
    host = environment.get('PGHOST')
    return (not any(environment.get(k) for k in ('PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS'))
            and any(environment.get(flag) == '1'
                    and re.fullmatch('jobmatch_' + prefix + '_[a-f0-9]{32}', environment.get('PGDATABASE', ''))
                    and (host in ('127.0.0.1', '::1') or (prefix == 'drill' and host == 'postgres' and environment.get('GITHUB_ACTIONS') == 'true'))
                    for flag, prefix in PAIRS))


def mirror_fixture(environment):
    if not mirror_permitted(environment):
        raise ValueError('Owned mirror-compatibility fixture required')
    # Lazy import avoids a cycle with saved_letter_drill.
    from saved_letter_drill import sql, run
    if not sql(environment, "select to_jsonb(to_regprocedure('private.workspace_projection_report()') is not null);"):
        return
    report = sql(environment, 'select private.workspace_projection_report();')
    if report['format'] == 'jobmatch-projection-parity-v1':
        return
    if report['format'] != 'jobmatch-workspace-storage-v2' or not report['ok']:
        raise ValueError('Unhealthy/unknown storage fixture')
    run(['psql', '-X', '-w', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/rollback/20261028120214_compact_workspace_storage.sql')], environment)
    report = sql(environment, 'select private.workspace_projection_report();')
    if report['format'] != 'jobmatch-projection-parity-v1' or not report['ok']:
        raise ValueError('Owned mirror compatibility rollback failed')


def workspace_scalars(environment):
    from saved_letter_drill import sql
    return sql(environment, "select coalesce(jsonb_agg(to_jsonb(w)||jsonb_build_object('payload',w.payload-array['facts','versions','applications']) order by user_id),'[]') from public.workspaces w;")


def preserved_migration(before, after, scalars_before, environment):
    from saved_letter_drill import sql
    differences = compare(before, after)
    if differences and differences != ['public.workspaces']:
        raise ValueError('Migration changed normalized/history/provenance data')
    if workspace_scalars(environment) != scalars_before:
        raise ValueError('Migration changed workspace identity/revision/time/scalars/unknown fields')
    if differences:
        report = sql(environment, 'select private.workspace_projection_report();')
        if report['format'] != 'jobmatch-workspace-storage-v2' or not report['ok']:
            raise ValueError('Workspace difference is not a healthy compact transition')
