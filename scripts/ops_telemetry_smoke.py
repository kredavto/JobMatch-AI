#!/usr/bin/env python3
"""Actual Next process smoke on fixed loopback, unauthenticated/invalid synthetic requests only."""
from collections import Counter
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

from ops_report import PREFIX, ROUTES, parse_event

ROOT = Path(__file__).resolve().parent.parent
PRIVATE = ('OPS_PRIVATE_QUERY', 'OPS_PRIVATE_COOKIE', 'OPS_PRIVATE_BODY', 'OPS_PRIVATE_PASSWORD')
POST_ONLY = {'ai-review', 'auth-email', 'import', 'recovery'}
GUARD = r"""
const nativeFetch=globalThis.fetch;
globalThis.fetch=function(input,init){
 let allowed=false;
 try{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  allowed=url.origin==='http://127.0.0.1:'+process.env.JOBMATCH_LOCAL_PROBE_PORT;
 }catch{}
 if(!allowed){console.info('JOBMATCH_PROBE_EXTERNAL_REFUSED');return Promise.reject(new Error('Synthetic fetch boundary'));}
 return nativeFetch(input,init);
};
"""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


# Fixed localhost only; never send fixture canaries through an inherited proxy.
OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())


class Server:
    def __init__(self, mode, task):
        with socket.socket() as selected:
            selected.bind(('127.0.0.1', 0))
            self.port = selected.getsockname()[1]
        self.origin = 'http://127.0.0.1:' + str(self.port)
        guard = Path(task, 'fetch_guard.cjs')
        guard.write_text(GUARD, encoding='utf8')
        env = dict(os.environ)
        env.update({'JOBMATCH_OPS_TELEMETRY': mode, 'SUPABASE_URL': '', 'SUPABASE_PUBLISHABLE_KEY': '',
                    'SUPABASE_SERVICE_ROLE_KEY': '', 'APP_URL': self.origin, 'NEXT_TELEMETRY_DISABLED': '1',
                    'JOBMATCH_LOCAL_PROBE_PORT': str(self.port)})
        env['NODE_OPTIONS'] = (env.get('NODE_OPTIONS', '') + ' --require=' + str(guard)).strip()
        self.lines, self.bad, self.total = [], False, 0
        self.process = subprocess.Popen(['npm', 'run', 'start', '--', '--port', str(self.port)], cwd=ROOT,
                                        env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                        start_new_session=True)
        self.reader = threading.Thread(target=self.collect, daemon=True)
        self.reader.start()
        deadline = time.monotonic() + 45
        try:
            while time.monotonic() < deadline:
                if self.process.poll() is not None:
                    raise ValueError('Next startup failed')
                try:
                    if self.request('/', timeout=1) == 200:
                        return
                except (OSError, ValueError):
                    pass
                time.sleep(0.1)
            raise ValueError('Next startup timed out')
        except BaseException:
            self.close()
            raise

    def collect(self):
        while True:
            raw = self.process.stdout.readline(4097)
            if not raw:
                return
            self.total += len(raw)
            text = raw.decode('utf8', errors='replace')
            if (self.total > 1024 * 1024 or len(raw) > 4096
                    or any(value in text for value in PRIVATE)
                    or 'JOBMATCH_PROBE_EXTERNAL_REFUSED' in text):
                self.bad = True
            if text.startswith(PREFIX):
                if not text.endswith('\n') or len(self.lines) >= 1000:
                    self.bad = True
                else:
                    self.lines.append(text)

    def request(self, path, method='GET', data=None, headers=None, timeout=4):
        if not path.startswith('/') or path.startswith('//'):
            raise ValueError('Fixed loopback path required')
        request = urllib.request.Request(self.origin + path, data=data, method=method,
                                         headers={'Origin': self.origin, 'Content-Type': 'application/json', **(headers or {})})
        try:
            response = OPENER.open(request, timeout=timeout)
        except urllib.error.HTTPError as value:
            response = value
        with response:
            if len(response.read(32769)) > 32768:
                raise ValueError('Unexpected response size')
            return response.status

    def events(self):
        return [parse_event(line.rstrip('\n')) for line in list(self.lines)]

    def wait(self, predicate):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if self.bad:
                raise ValueError('Unsafe or unexpected child output')
            if predicate(self.events()):
                return
            time.sleep(0.02)
        raise ValueError('Telemetry did not arrive')

    def close(self):
        if self.process.poll() is None:
            try:
                os.killpg(self.process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(self.process.pid, signal.SIGKILL)
                self.process.wait(timeout=5)
        self.reader.join(timeout=3)
        if self.reader.is_alive():
            self.bad = True
        self.process.stdout.close()


def check_file(path, expected, max_5xx='0'):
    result = subprocess.run([sys.executable, 'scripts/ops_report.py', 'check', str(path),
                             '--min-responses', '1', '--max-5xx-fraction', max_5xx,
                             '--max-ge2s-fraction', '1', '--max-unhandled', '0', '--max-age-seconds', '120'],
                            cwd=ROOT, capture_output=True, text=True, timeout=10, check=False)
    if result.returncode != expected:
        raise ValueError('Unexpected file-check verdict')
    report = json.loads(result.stdout)
    if report['collectionCompleteness'] != 'not-established' or 'PRIVATE' in result.stdout + result.stderr:
        raise ValueError('Report scope/privacy differs')
    return report


def main():
    if (os.environ.get('CI') != 'true' or os.environ.get('GITHUB_ACTIONS') != 'true'
            or os.environ.get('JOBMATCH_OPS_SMOKE') != '1'):
        raise ValueError('Explicit disposable CI opt-in required')
    with tempfile.TemporaryDirectory(prefix='jobmatch-ops-smoke-') as task:
        off = Server('off', task)
        try:
            if off.request('/api/service?email=OPS_PRIVATE_QUERY') != 401:
                raise ValueError('Unexpected unauthenticated behavior')
        finally:
            off.close()
        if off.bad or off.lines:
            raise ValueError('Disabled telemetry emitted data')

        server = Server('stdout', task)
        try:
            # An explicit sample condition on 401 headers is not application/provider readiness.
            for _ in range(3):
                if server.request('/api/service?email=OPS_PRIVATE_QUERY') != 401:
                    raise ValueError('Unexpected unauthenticated status')
            server.wait(lambda rows: len(rows) >= 3)
            sample = Path(task, 'sample.events')
            sample.write_text(''.join(server.lines[:3]), encoding='utf8')
            if check_file(sample, 0)['verdict'] != 'observed-within-thresholds':
                raise ValueError('Supplied sample check differs')
            for route in sorted(ROUTES):
                method = 'POST' if route in POST_ONLY else 'GET'
                status = server.request('/api/' + route, method, b'{}' if method == 'POST' else None)
                if status not in {400, 401, 403, 503}:
                    raise ValueError('Unexpected guard response')
            # No valid mailbox, credentials, provider configuration or side-effect intent is supplied.
            if server.request('/api/service', 'POST',
                              b'{"action":"login","email":"OPS_PRIVATE_BODY","password":"OPS_PRIVATE_PASSWORD"}') != 400:
                raise ValueError('Invalid-input guard differs')
            if server.request('/api/service', 'POST', b'{}', {'Origin': 'https://synthetic.invalid'}) != 403:
                raise ValueError('Origin guard differs')
            if server.request('/api/service', headers={'Cookie': 'jm_access=OPS_PRIVATE_COOKIE'}) != 503:
                raise ValueError('Blank provider config guard differs')
            server.wait(lambda rows: {row.get('route') for row in rows} >= ROUTES)
            server.wait(lambda rows: any(row.get('status') == 503 for row in rows))
            alert = Path(task, 'alert.events')
            alert.write_text(''.join(server.lines), encoding='utf8')
            if check_file(alert, 1)['verdict'] != 'observed-alert':
                raise ValueError('Known header failure did not alert')
            before = len(server.lines)
            if server.request('/api/auth-email', 'OPTIONS') != 204:
                raise ValueError('Framework OPTIONS behavior differs')
            time.sleep(0.1)
            if len(server.lines) != before:
                raise ValueError('Automatic framework response was misclassified')
            # At most two UTC minute windows in a bounded local burst: at least one must cap.
            started = time.monotonic()
            for _ in range(130):
                if server.request('/api/service') != 401:
                    raise ValueError('Telemetry changed a guard response')
            if time.monotonic() - started > 20:
                raise ValueError('Local burst exceeded its diagnostic bound')
            server.wait(lambda rows: any(row['kind'] == 'coverage-capped' for row in rows))
            grouped = Counter(row['minute'] for row in server.events()
                              if row['kind'] == 'returned' and row['route'] == 'service' and row['handler'] == 'GET')
            if not grouped or max(grouped.values()) > 60:
                raise ValueError('Per-realm observation bound differs')
            limited = Path(task, 'limited.events')
            limited.write_text(''.join(server.lines), encoding='utf8')
            if check_file(limited, 2, max_5xx='1')['verdict'] != 'inconclusive':
                raise ValueError('Capped observations looked complete')
        finally:
            server.close()
        if server.bad:
            raise ValueError('Unexpected child output/provider fetch attempt')
    print('PASS: real Next handlers off/on, eleven static route labels, private-canary refusal, unchanged guard statuses, observed alert and capped/inconclusive file checks; loopback-only fixture, no live-provider acceptance.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, TypeError, KeyError, subprocess.SubprocessError):
        print('FAIL: synthetic operational smoke incomplete; no child output, input contents, paths or credentials emitted.')
        raise SystemExit(1)
