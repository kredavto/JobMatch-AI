#!/usr/bin/env python3
"""Real multi-connection checks, ONLY inside generated disposable restore-drill databases."""
import json
import os
import re
import selectors
import subprocess
import sys
import time
import uuid

PSQL = ['psql', '-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1']
LIMITS = "SET statement_timeout='10s'; SET lock_timeout='8s'; SET idle_in_transaction_session_timeout='12s';\n"


def permitted(environment):
    host = environment.get('PGHOST')
    return (environment.get('JOBMATCH_LOCAL_RESTORE') == '1'
            and (host in ('127.0.0.1', '::1') or (host == 'postgres' and environment.get('GITHUB_ACTIONS') == 'true'))
            and re.fullmatch(r'jobmatch_drill_[0-9a-f]{32}', environment.get('PGDATABASE', '')) is not None
            and not any(environment.get(key) for key in ('PGSERVICE', 'PGHOSTADDR', 'PGSERVICEFILE')))


class CheckFailure(Exception):
    pass


def outcome(output):
    if output not in ('OK\n', 'CONFLICT\n', 'AUTH\n'):
        raise CheckFailure('Unexpected worker protocol')
    return output.strip()


class Probe:
    def __init__(self, environment):
        self.environment = dict(environment, PGCONNECT_TIMEOUT='5')
        self.children = []
        self.a, self.b, self.sa, self.sb = (str(uuid.uuid4()) for _ in range(4))
        self.stage = 'setup'

    def query(self, sql):
        result = subprocess.run(PSQL, input=LIMITS + sql, env=self.environment, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=12, check=True)
        return result.stdout

    def child(self, sql, name):
        process = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.DEVNULL, text=True,
                                   env=dict(self.environment, PGAPPNAME=name))
        self.children.append(process)
        process.stdin.write(LIMITS + sql + '\n')
        process.stdin.flush()
        return process

    def holder(self, sql):
        process = self.child('BEGIN;\n' + sql + "\nSELECT 'READY';", 'jobmatch_qa_holder')
        # A bounded readiness handshake; no timing assumption about server startup.
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            if not selector.select(timeout=8) or process.stdout.readline() != 'READY\n':
                raise CheckFailure('Holder did not acquire lock')
        return process

    def owner_lock(self):
        return self.holder("DO $$BEGIN PERFORM pg_advisory_xact_lock(hashtextextended('" + self.a + "',0)); END;$$;")

    def finish(self, process, sql=None):
        # communicate closes stdin, ending psql after any final transaction command.
        output, _ = process.communicate(input=sql, timeout=12)
        if process.returncode != 0:
            raise CheckFailure('Worker failed')
        return output

    def worker(self, uid, session, revision, kind, name):
        claims = json.dumps({'sub': uid, 'session_id': session})
        payload = json.dumps({'original': '', 'goal': 'Legacy race', 'vacancy': '',
                              'facts': [], 'versions': [], 'applications': []})
        expression = ("public.apply_workspace_command(" + str(revision) + ",'{\"action\":\"goal\",\"text\":\"Command race\"}')"
                      if kind == 'command' else "public.save_workspace(" + str(revision) + ",'" + payload + "','goal')")
        # The session-local temporary function runs as authenticated, never SECURITY DEFINER.
        sql = """BEGIN;
CREATE FUNCTION pg_temp.attempt_write() RETURNS text LANGUAGE plpgsql AS $probe$
BEGIN PERFORM %s; RETURN 'OK';
EXCEPTION WHEN raise_exception THEN
 IF SQLERRM IN ('CONFLICT','AUTH') THEN RETURN SQLERRM; END IF; RAISE;
END;$probe$;
DO $claims$BEGIN PERFORM set_config('request.jwt.claims','%s',true);END;$claims$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.attempt_write();
COMMIT;
""" % (expression, claims)
        return self.child(sql, name)

    def wait_for(self, names, locktype):
        # Observe actual ungranted locks, not merely a live/sleeping process.
        quoted = ','.join("'" + name + "'" for name in names)
        relation = " AND l.relation='public.workspaces'::regclass" if locktype == 'relation' else ''
        sql = ("SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid "
               "WHERE NOT l.granted AND l.locktype='" + locktype + "'" + relation
               + " AND a.application_name IN (" + quoted + ") AND a.datname=current_database();")
        deadline = time.monotonic() + 6
        while time.monotonic() < deadline:
            if self.query(sql) == str(len(names)) + '\n':
                return
            time.sleep(0.05)
        raise CheckFailure('Expected lock wait was not observed')

    def assert_state(self, uid, revision, audits):
        self.query("""DO $$DECLARE s jsonb;BEGIN
 SELECT payload INTO s FROM public.workspaces WHERE user_id='%s';
 IF (SELECT revision FROM public.workspaces WHERE user_id='%s') IS DISTINCT FROM %d
  OR (SELECT count(*) FROM public.audit_log WHERE user_id='%s')<>%d
  OR (SELECT count(*) FROM public.fact_history WHERE user_id='%s')<>1
  OR (SELECT count(*) FROM public.consent_records WHERE user_id='%s')<>1
  OR (SELECT count(*) FROM public.profile_facts WHERE user_id='%s')<>0
  OR (SELECT count(*) FROM public.resume_versions WHERE user_id='%s')<>0
  OR (SELECT count(*) FROM public.applications WHERE user_id='%s')<>0 THEN RAISE EXCEPTION 'QA_STATE'; END IF;
 IF (private.workspace_projection_report()->'ok') IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'QA_PARITY';END IF;
END;$$;""" % (uid, uid, revision, uid, audits, uid, uid, uid, uid, uid))

    def race(self, revision):
        self.stage = 'new workspace race' if revision == 0 else 'existing workspace race'
        holder = self.owner_lock()
        names = ['jobmatch_qa_command', 'jobmatch_qa_legacy']
        workers = [self.worker(self.a, self.sa, revision, kind, name)
                   for kind, name in zip(('command', 'legacy'), names)]
        self.wait_for(names, 'advisory')
        self.finish(holder, 'COMMIT;\n')
        results = sorted(outcome(self.finish(worker)) for worker in workers)
        if results != ['CONFLICT', 'OK']:
            raise CheckFailure('Race did not have exactly one winner')
        self.assert_state(self.a, revision + 1, revision + 1)

    def run(self):
        self.query("INSERT INTO auth.users(id) VALUES ('%s'),('%s'); "
                   "INSERT INTO auth.sessions(id,user_id) VALUES ('%s','%s'),('%s','%s');"
                   % (self.a, self.b, self.sa, self.a, self.sb, self.b))
        self.race(0)
        self.race(1)
        self.stage = 'independent owner progress'
        holder = self.owner_lock()
        waiting = self.worker(self.a, self.sa, 2, 'command', 'jobmatch_qa_owner_a')
        self.wait_for(['jobmatch_qa_owner_a'], 'advisory')
        independent = self.worker(self.b, self.sb, 0, 'command', 'jobmatch_qa_owner_b')
        if outcome(self.finish(independent)) != 'OK':
            raise CheckFailure('Independent owner blocked')
        self.assert_state(self.b, 1, 1)
        self.finish(holder, 'COMMIT;\n')
        if outcome(self.finish(waiting)) != 'OK':
            raise CheckFailure('Owner did not resume')
        self.assert_state(self.a, 3, 3)
        self.stage = 'session revoked while waiting'
        holder = self.owner_lock()
        names = ['jobmatch_qa_revoke_command', 'jobmatch_qa_revoke_legacy']
        workers = [self.worker(self.a, self.sa, 3, kind, name)
                   for kind, name in zip(('command', 'legacy'), names)]
        self.wait_for(names, 'advisory')
        self.query("DELETE FROM auth.sessions WHERE id='" + self.sa + "';")
        self.finish(holder, 'COMMIT;\n')
        if [outcome(self.finish(worker)) for worker in workers] != ['AUTH', 'AUTH']:
            raise CheckFailure('Revoked waiters accepted')
        self.assert_state(self.a, 3, 3)
        self.stage = 'exclusive table gate'
        holder = self.holder("LOCK TABLE public.workspaces IN ACCESS EXCLUSIVE MODE; "
                             "DO $$BEGIN IF (private.workspace_projection_report()->'ok') IS DISTINCT FROM 'true'::jsonb "
                             "THEN RAISE EXCEPTION 'QA_PREFLIGHT';END IF;END;$$;")
        waiting = self.worker(self.b, self.sb, 1, 'command', 'jobmatch_qa_table_gate')
        self.wait_for(['jobmatch_qa_table_gate'], 'relation')
        self.finish(holder, 'COMMIT;\n')
        if outcome(self.finish(waiting)) != 'OK':
            raise CheckFailure('Table-gated writer did not resume')
        self.assert_state(self.b, 2, 2)

    def cleanup(self):
        for process in self.children:
            if process.poll() is None:
                process.kill()
            process.communicate(timeout=5)
        # Auth cascades remove every synthetic row even after an unsuccessful probe.
        self.query("DELETE FROM auth.users WHERE id IN ('" + self.a + "','" + self.b + "');")


def main():
    if not permitted(os.environ):
        print('FAIL: concurrency probe requires an enabled generated disposable local database.', file=sys.stderr)
        return 2
    probe = Probe(os.environ)
    failed = False
    try:
        probe.run()
    except (OSError, ValueError, CheckFailure, subprocess.SubprocessError):
        print('FAIL: concurrency probe at ' + probe.stage + '; no credentials or row data printed.', file=sys.stderr)
        failed = True
    finally:
        try:
            probe.cleanup()
        except (OSError, ValueError, CheckFailure, subprocess.SubprocessError):
            print('FAIL: synthetic concurrency fixture cleanup.', file=sys.stderr)
            failed = True
    if not failed:
        print('PASS: real concurrent command/legacy creation and updates, owner isolation, revoked waiters and exclusive table gate.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
