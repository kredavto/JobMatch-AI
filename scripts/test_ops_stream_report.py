import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime
import ops_report as ops

NOW = datetime(2026, 10, 30, 14, 0, 30, tzinfo=ops.UTC)


def event(outcome='completion-enqueued', **changes):
    return dict(format=ops.STREAM_FORMAT, scope='server-stream', minute='2026-10-30T14:00:00Z',
                kind='terminal', route='fact-history', handler='GET', duration='lt100ms', outcome=outcome, **changes)


def header():
    return dict(format=ops.FORMAT, scope='route-handler', minute='2026-10-30T14:00:00Z',
                kind='returned', route='fact-history', handler='GET', duration='lt100ms', status=200)


class StreamReports(unittest.TestCase):
    def check(self, rows, **changes):
        limits = dict(min_streams=1, max_incomplete=0, max_cancelled=0, max_age=120)
        limits.update(changes)
        return ops.check_stream_report(ops.summarize_streams(rows, NOW), **limits)

    def test_strict_shapes(self):
        for outcome in sorted(ops.OUTCOMES):
            value = event(outcome)
            self.assertEqual(ops.parse_event(ops.PREFIX + json.dumps(value)), value)
        for changes in ({'status': 200}, {'ownerId': 'private'}, {'route': 'service'}, {'handler': 'POST'},
                        {'outcome': 'delivered'}, {'duration': []}, {'minute': '2026-02-30T14:00:00Z'},
                        {'scope': 'route-handler'}, {'kind': 'returned'}, {'format': 'future'}):
            value = {**event(), **changes}
            with self.subTest(changes=changes), self.assertRaises((ValueError, TypeError)):
                ops.parse_event(ops.PREFIX + json.dumps(value))

    def test_duplicate_key(self):
        text = ops.PREFIX + json.dumps(event())[:-1] + ',"outcome":"cancelled"}'
        with self.assertRaises(ValueError):
            ops.parse_event(text)

    def test_sample_is_not_delivery_or_global_acceptance(self):
        report, code = self.check([header(), event()])
        self.assertEqual(code, 0)
        self.assertEqual(report['clientDelivery'], 'not-established')
        self.assertEqual(report['collectionCompleteness'], 'not-established')
        self.assertEqual(report['headerRecordsNotEvaluated'], 1)
        self.assertEqual(report['terminals'], 1)

    def test_200_does_not_hide_incomplete_and_cancelled(self):
        report, code = self.check([header(), event('incomplete-enqueued'), event('cancelled')])
        self.assertEqual(code, 1)
        self.assertEqual(set(report['breaches']), {'observed-incomplete', 'observed-cancelled'})
        self.assertEqual(report['observedIncompleteFraction'], 0.5)

    def test_header_check_refuses_unassessed_streams(self):
        report = ops.summarize([header(), event('incomplete-enqueued')], NOW)
        checked, code = ops.check_report(report, 1, 0, 0, 0, 120)
        self.assertEqual(code, 2)
        self.assertIn('stream-outcomes-not-checked', checked['issues'])

    def test_both_family_caps_preserve_known_breaches(self):
        for fmt, scope in [(ops.FORMAT, 'route-handler'), (ops.STREAM_FORMAT, 'server-stream')]:
            marker = dict(format=fmt, scope=scope, minute=event()['minute'], kind='coverage-capped', limit=60)
            parsed = ops.parse_event(ops.PREFIX + json.dumps(marker))
            report, code = self.check([event('incomplete-enqueued'), parsed])
            self.assertEqual(code, 2)
            self.assertIn('coverage-capped', report['issues'])
            self.assertIn('observed-incomplete', report['breaches'])

    def test_insufficient_stale_future_unknown(self):
        for rows in ([], [header()], [{**event(), 'minute': '2026-10-30T13:00:00Z'}],
                     [{**event(), 'minute': '2026-10-30T14:01:00Z'}], [{**event(), 'duration': 'unknown'}]):
            self.assertEqual(self.check(rows)[1], 2)

    def test_route_filter_does_not_hide_cap(self):
        rows = [event(), {**event('cancelled'), 'route': 'reminders'},
                dict(format=ops.FORMAT, scope='route-handler', minute=event()['minute'], kind='coverage-capped', limit=60)]
        report = ops.summarize_streams(rows, NOW, route='fact-history')
        self.assertEqual(report['terminals'], 1)
        self.assertEqual(report['otherRouteRecords'], 1)
        self.assertEqual(ops.check_stream_report(report, 1, 0, 0, 120)[1], 2)

    def test_threshold_bounds(self):
        for changes in ({'min_streams': 0}, {'min_streams': True}, {'max_incomplete': float('nan')},
                        {'max_cancelled': 1.1}, {'max_age': 59}, {'max_age': True}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.check([event()], **changes)

    def test_cli_read_only_safe_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'private-input.jsonl'
            original = (ops.PREFIX + json.dumps(event('incomplete-enqueued')) + '\n').encode()
            path.write_bytes(original)
            args = ['stream-check', str(path), '--now', '2026-10-30T14:00:30Z', '--min-streams', '1',
                    '--max-incomplete-fraction', '0', '--max-cancelled-fraction', '0', '--max-age-seconds', '120']
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                self.assertEqual(ops.main(args), 1)
            self.assertEqual(json.loads(out.getvalue())['verdict'], 'observed-alert')
            self.assertEqual(path.read_bytes(), original)
            path.write_text(ops.PREFIX + '{"ownerId":"private"}\n')
            err = io.StringIO()
            with contextlib.redirect_stderr(err):
                self.assertEqual(ops.main(args), 2)
            self.assertNotIn('private', err.getvalue())
            self.assertNotIn(str(path), err.getvalue())


if __name__ == '__main__':
    unittest.main()
