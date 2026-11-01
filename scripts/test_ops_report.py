import contextlib
from datetime import datetime, timezone
import io
import os
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import ops_report as ops

NOW = datetime(2026, 10, 30, 13, 0, 30, tzinfo=timezone.utc)


def event(**changes):
    return {'format': ops.FORMAT, 'scope': 'route-handler', 'kind': 'returned',
            'minute': '2026-10-30T13:00:00Z', 'route': 'service', 'handler': 'GET',
            'status': 401, 'duration': 'lt100ms', **changes}


def capped():
    return {'format': ops.FORMAT, 'scope': 'route-handler', 'kind': 'coverage-capped',
            'minute': '2026-10-30T13:00:00Z', 'limit': 60}


def line(value):
    return ops.PREFIX + json.dumps(value, separators=(',', ':')) + '\n'


class OpsReportTests(unittest.TestCase):
    def summary(self, rows, **options):
        return ops.summarize(rows, NOW, **options)

    def check(self, rows, **changes):
        thresholds = dict(min_responses=1, max_5xx=0, max_ge2s=0, max_unhandled=0, max_age=120)
        thresholds.update(changes)
        return ops.check_report(self.summary(rows), **thresholds)

    def test_fifo_and_directory_refuse_without_waiting_or_printing_path(self):
        with tempfile.TemporaryDirectory(prefix='jobmatch-ops-private-') as folder:
            fifo = Path(folder,'PRIVATE_FIFO')
            os.mkfifo(fifo)
            for target in (fifo,Path(folder)):
                result = subprocess.run([sys.executable,str(Path(ops.__file__)),'report',str(target)],capture_output=True,text=True,timeout=2)
                self.assertEqual(result.returncode,2)
                self.assertNotIn('PRIVATE',result.stdout+result.stderr)
                self.assertNotIn(folder,result.stdout+result.stderr)

    def test_exact_known_shapes_and_no_untrusted_fields(self):
        for value in [event(), event(kind='unhandled', status=None), capped()]:
            self.assertEqual(ops.parse_event(line(value).rstrip('\n')), value)
        for value in [event(message='PRIVATE'), event(route='PRIVATE'), event(handler='PATCH'),
                      event(status=True), event(status=600), event(duration='123ms'),
                      event(kind='unhandled', status=500), event(route=[]),
                      event(kind={}), {**capped(), 'limit': 61}, {**capped(), 'email': 'PRIVATE'}]:
            with self.subTest(value=value), self.assertRaises((ValueError, TypeError)):
                ops.parse_event(line(value).rstrip('\n'))

    def test_duplicate_keys_wrong_prefix_and_bad_json_are_refused(self):
        raw = line(event()).rstrip('\n')
        for value in [raw.replace('"status":401', '"status":401,"status":200'),
                      raw.replace(ops.PREFIX, 'OTHER '), ops.PREFIX + '{']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                ops.parse_event(value)

    def test_minute_precision_and_calendar_are_strict(self):
        for value in ['2026-02-30T13:00:00Z', '2026-10-30T13:00:01Z', '2026-10-30T13:00:00+00:00',
                      '2026-10-30', None, '1969-12-31T23:59:00Z']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                ops.parse_event(line(event(minute=value)).rstrip('\n'))

    def test_observed_counts_are_not_declared_global_completeness_or_success(self):
        report = self.summary([event(), event(status=503, duration='lt10s'),
                               event(route='ai-review', handler='POST', status=403)])
        self.assertEqual(report['returned'], 3)
        self.assertAlmostEqual(report['observedResponse5xxFraction'], 1 / 3)
        self.assertAlmostEqual(report['observedResponseGe2sFraction'], 1 / 3)
        self.assertEqual(report['collectionCompleteness'], 'not-established')
        self.assertEqual(report['ageUpperBoundSeconds'], 30)
        self.assertEqual(len(report['groups']), 2)
        self.assertNotIn('availability', report)
        self.assertNotIn('p95', report)

    def test_explicit_thresholds_pass_only_supplied_observations(self):
        report, code = self.check([event(), event(status=200)])
        self.assertEqual(code, 0)
        self.assertEqual(report['verdict'], 'observed-within-thresholds')
        self.assertEqual(report['scope'], 'supplied-file/registered-route-handlers-only')

    def test_observed_errors_slow_responses_and_unhandled_are_alerts(self):
        report, code = self.check([event(status=503, duration='ge10s'),
                                   event(kind='unhandled', status=None)])
        self.assertEqual(code, 1)
        self.assertEqual(report['verdict'], 'observed-alert')
        self.assertEqual(set(report['breaches']), {'unhandled', 'observed-response-5xx', 'observed-response-ge2s'})

    def test_caps_unknown_measurements_future_and_insufficient_data_never_pass(self):
        for rows in [[event(), capped()], [event(status=None)], [event(duration='unknown')],
                     [event(minute='2026-10-30T13:01:00Z')], []]:
            with self.subTest(rows=rows):
                report, code = self.check(rows)
                self.assertEqual(code, 2)
                self.assertEqual(report['verdict'], 'inconclusive')
        self.assertEqual(self.check([event()], min_responses=2)[1], 2)

    def test_stale_and_outside_window_data_do_not_become_fresh_zero_errors(self):
        report, code = self.check([event(minute='2026-10-30T12:55:00Z')], max_age=60)
        self.assertEqual(code, 2)
        self.assertIn('stale-or-empty', report['issues'])
        report = self.summary([event(minute='2026-10-30T12:00:00Z')])
        self.assertEqual(report['returned'], 0)
        self.assertIsNone(report['observedResponse5xxFraction'])
        self.assertEqual(report['outsideWindowRecords'], 1)

    def test_route_filter_does_not_hide_a_global_coverage_marker(self):
        report = self.summary([event(), event(route='ai-review', status=503), capped()], route='service')
        self.assertEqual(report['returned'], 1)
        self.assertEqual(report['otherRouteRecords'], 1)
        self.assertEqual(report['coverageMarkers'], 1)
        self.assertEqual(ops.check_report(report, 1, 0, 0, 0, 120)[1], 2)

    def test_truncation_utf8_line_and_total_byte_budgets_are_enforced(self):
        with tempfile.TemporaryDirectory() as task:
            path = Path(task) / 'events'
            for raw in [line(event()).rstrip('\n').encode(), b'\xff\n', b'x' * (ops.MAX_LINE + 1) + b'\n']:
                path.write_bytes(raw)
                with self.assertRaises((ValueError, UnicodeError)):
                    list(ops.events_from_file(path))
            path.write_text(line(event()) * 2, encoding='utf8')
            with patch.object(ops, 'MAX_BYTES', len(line(event()).encode()) + 1), self.assertRaises(ValueError):
                list(ops.events_from_file(path))

    def test_invalid_thresholds_are_refused(self):
        for changes in [{'min_responses': 0}, {'max_5xx': float('nan')}, {'max_5xx': 1.1},
                        {'max_ge2s': -1}, {'max_unhandled': -1}, {'max_age': 59}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.check([event()], **changes)

    def test_cli_report_and_check_are_read_only_and_do_not_echo_private_paths_or_input(self):
        with tempfile.TemporaryDirectory() as task:
            path = Path(task) / 'PRIVATE_INPUT_PATH'
            path.write_text(line(event()), encoding='utf8')
            before = path.read_bytes()
            command = [sys.executable, str(Path(ops.__file__)), 'check', str(path), '--now', '2026-10-30T13:00:30Z',
                       '--min-responses', '1', '--max-5xx-fraction', '0', '--max-ge2s-fraction', '0',
                       '--max-unhandled', '0', '--max-age-seconds', '120']
            result = subprocess.run(command, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(json.loads(result.stdout)['verdict'], 'observed-within-thresholds')
            self.assertEqual(path.read_bytes(), before)
            self.assertNotIn('PRIVATE', result.stdout + result.stderr)
            path.write_text(line(event(message='PRIVATE_CANARY')), encoding='utf8')
            refused = subprocess.run(command, capture_output=True, text=True, timeout=10)
            self.assertEqual(refused.returncode, 2)
            self.assertNotIn('PRIVATE', refused.stdout + refused.stderr)
            self.assertFalse(refused.stdout)

    def test_cli_missing_or_unrecognized_parameters_are_generic(self):
        result = subprocess.run([sys.executable, str(Path(ops.__file__)), 'check', 'PRIVATE_PATH',
                                 '--PRIVATE_TOKEN'], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn('PRIVATE', result.stdout + result.stderr)

    def test_cli_invalid_early_clock_is_generic(self):
        result = subprocess.run([sys.executable, str(Path(ops.__file__)), 'report', 'PRIVATE_PATH',
                                 '--now', '0001-01-01T00:00:00Z'], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn('PRIVATE', result.stdout + result.stderr)

    def test_report_mode_does_not_assign_threshold_readiness(self):
        with tempfile.TemporaryDirectory() as task:
            path = Path(task) / 'events'
            path.write_text(line(event()), encoding='utf8')
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                self.assertEqual(ops.main(['report', str(path), '--now', '2026-10-30T13:00:30Z']), 0)
            self.assertEqual(json.loads(output.getvalue())['verdict'], 'not-checked')
