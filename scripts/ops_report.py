#!/usr/bin/env python3
"""Read-only bounded operational-event reporting. No network, IDs, payloads or alert delivery."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import json
import math
import os
import stat
import re
import sys

PREFIX = 'JOBMATCH_OPS_V1 '
FORMAT = 'jobmatch-ops-event-v1'
STREAM_FORMAT = 'jobmatch-ops-stream-v1'
STREAM_ROUTES = {'fact-history','letter-versions'}
OUTCOMES = {'completion-enqueued', 'incomplete-enqueued', 'cancelled'}
ROUTES = {'letter-versions', 'fact-history', 'import', 'source-profile', 'service', 'hh-vacancy', 'resume-export', 'auth-email', 'ai-resume-adaptation', 'recovery', 'ai-review'}
BUCKETS = {'lt100ms', 'lt500ms', 'lt2s', 'lt10s', 'ge10s', 'unknown'}
MAX_BYTES = 16 * 1024 * 1024
MAX_LINE = 1024
UTC = timezone.utc


class InputError(ValueError):
    pass


def unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise InputError('Invalid telemetry input')
        value[key] = item
    return value


def parse_minute(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z', value):
        raise InputError('Invalid telemetry input')
    stamp = datetime.strptime(value, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=UTC)
    if stamp.year < 1970:
        raise InputError('Invalid telemetry input')
    return stamp


def parse_event(line):
    if not isinstance(line, str) or not line.startswith(PREFIX):
        raise InputError('Invalid telemetry input')
    event = json.loads(line[len(PREFIX):], object_pairs_hook=unique_object)
    if not isinstance(event, dict):
        raise InputError('Invalid telemetry input')
    base = {'format', 'scope', 'kind', 'minute'}
    if event.get('format') == STREAM_FORMAT:
        if event.get('scope') != 'server-stream':
            raise InputError('Invalid telemetry input')
        parse_minute(event.get('minute'))
        if event.get('kind') == 'coverage-capped':
            if set(event) != base | {'limit'} or type(event['limit']) is not int or event['limit'] != 60:
                raise InputError('Invalid telemetry input')
        elif event.get('kind') == 'terminal':
            if (set(event) != base | {'route', 'handler', 'duration', 'outcome'}
                    or type(event['route']) is not str or event['route'] not in STREAM_ROUTES
                    or event['handler'] != 'GET'
                    or type(event['duration']) is not str or event['duration'] not in BUCKETS
                    or type(event['outcome']) is not str or event['outcome'] not in OUTCOMES):
                raise InputError('Invalid telemetry input')
        else:
            raise InputError('Invalid telemetry input')
        return event
    if event.get('format') != FORMAT or event.get('scope') != 'route-handler':
        raise InputError('Invalid telemetry input')
    parse_minute(event.get('minute'))
    kind = event.get('kind')
    if type(kind) is not str:
        raise InputError('Invalid telemetry input')
    if kind == 'coverage-capped':
        if set(event) != base | {'limit'} or type(event['limit']) is not int or event['limit'] != 60:
            raise InputError('Invalid telemetry input')
    elif kind in {'returned', 'unhandled'}:
        if (set(event) != base | {'route', 'handler', 'status', 'duration'}
                or type(event['route']) is not str or event['route'] not in ROUTES
                or type(event['handler']) is not str or event['handler'] not in {'GET', 'POST'}
                or type(event['duration']) is not str or event['duration'] not in BUCKETS):
            raise InputError('Invalid telemetry input')
        status = event['status']
        if status is not None and (type(status) is not int or not 100 <= status <= 599):
            raise InputError('Invalid telemetry input')
        if kind == 'unhandled' and status is not None:
            raise InputError('Invalid telemetry input')
    else:
        raise InputError('Invalid telemetry input')
    return event


def events_from_file(path):
    total = 0
    descriptor = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
    with os.fdopen(descriptor,'rb') as source:
        metadata = os.fstat(source.fileno())
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_size > MAX_BYTES:
            raise InputError('Regular bounded telemetry file required')
        while True:
            raw = source.readline(MAX_LINE + 1)
            if not raw:
                break
            total += len(raw)
            if total > MAX_BYTES or len(raw) > MAX_LINE or not raw.endswith(b'\n'):
                raise InputError('Incomplete or oversized telemetry input')
            yield parse_event(raw[:-1].removesuffix(b'\r').decode('utf-8', errors='strict'))


def utc_text(value):
    return value.strftime('%Y-%m-%dT%H:%M:%SZ')


def summarize(events, now, window_minutes=15, route=None):
    if not 1 <= window_minutes <= 1440 or (route is not None and route not in ROUTES):
        raise InputError('Invalid parameters')
    end = now.astimezone(UTC).replace(second=0, microsecond=0)
    start = end - timedelta(minutes=window_minutes - 1)
    counts, statuses, latency = Counter(), Counter(), Counter()
    groups = defaultdict(lambda: {'returned': 0, 'unhandled': 0, 'statuses': Counter(), 'duration': Counter()})
    latest = None
    for event in events:
        counts['input'] += 1
        stamp = parse_minute(event['minute'])
        if stamp > end:
            counts['future'] += 1
            continue
        if stamp < start:
            counts['outsideWindow'] += 1
            continue
        if event['kind'] == 'coverage-capped':
            counts['coverageMarkers'] += 1
            continue
        if route is not None and event['route'] != route:
            counts['otherRoute'] += 1
            continue
        if event['format'] == STREAM_FORMAT:
            counts['streamRecords'] += 1
            continue
        latest = stamp if latest is None else max(latest, stamp)
        kind = event['kind']
        counts[kind] += 1
        group = groups[(event['route'], event['handler'])]
        group[kind] += 1
        group['duration'][event['duration']] += 1
        if event['duration'] == 'unknown':
            counts['unknown'] += 1
        if kind == 'returned':
            latency[event['duration']] += 1
            if event['status'] is None:
                counts['unknown'] += 1
                group['statuses']['unknown'] += 1
            else:
                statuses[str(event['status'])] += 1
                group['statuses'][str(event['status'])] += 1
                if event['status'] >= 500:
                    counts['response5xx'] += 1
            if event['duration'] in {'lt10s', 'ge10s'}:
                counts['responseGe2s'] += 1
    returned = counts['returned']
    return {
        'format': 'jobmatch-ops-report-v1',
        'scope': 'supplied-file/registered-route-handlers-only',
        'collectionCompleteness': 'not-established',
        'windowStartMinute': utc_text(start), 'windowEndMinute': utc_text(end),
        'routeFilter': route,
        'inputRecords': counts['input'], 'outsideWindowRecords': counts['outsideWindow'],
        'otherRouteRecords': counts['otherRoute'], 'futureRecords': counts['future'],
        'returned': returned, 'unhandled': counts['unhandled'], 'unevaluatedStreamRecords': counts['streamRecords'],
        'coverageMarkers': counts['coverageMarkers'], 'unknownMeasurements': counts['unknown'],
        'lastObservationMinute': utc_text(latest) if latest is not None else None,
        # Minute quantization gives an upper bound, not the exact age of the last request.
        'ageUpperBoundSeconds': max(0, int((now.astimezone(UTC) - latest).total_seconds())) if latest is not None else None,
        'observedResponse5xxFraction': counts['response5xx'] / returned if returned else None,
        'observedResponseGe2sFraction': counts['responseGe2s'] / returned if returned else None,
        'responseStatusCounts': dict(sorted(statuses.items())), 'responseDurationCounts': dict(sorted(latency.items())),
        'groups': [{'route': key[0], 'handler': key[1], 'returned': value['returned'],
                    'unhandled': value['unhandled'], 'statuses': dict(sorted(value['statuses'].items())),
                    'duration': dict(sorted(value['duration'].items()))} for key, value in sorted(groups.items())],
    }


def check_report(report, min_responses, max_5xx, max_ge2s, max_unhandled, max_age):
    if (type(min_responses) is not int or not 1 <= min_responses <= 1_000_000
            or type(max_unhandled) is not int or not 0 <= max_unhandled <= 1_000_000
            or type(max_age) is not int or not 60 <= max_age <= 86400
            or not all(type(value) in (int, float) and math.isfinite(value) and 0 <= value <= 1 for value in (max_5xx, max_ge2s))):
        raise InputError('Invalid thresholds')
    issues, breaches = [], []
    if report.get('unevaluatedStreamRecords', 0):
        issues.append('stream-outcomes-not-checked')
    if report['returned'] < min_responses:
        issues.append('insufficient-responses')
    if report['coverageMarkers']:
        issues.append('coverage-capped')
    if report['unknownMeasurements']:
        issues.append('unknown-measurement')
    if report['futureRecords']:
        issues.append('future-event')
    if report['ageUpperBoundSeconds'] is None or report['ageUpperBoundSeconds'] > max_age:
        issues.append('stale-or-empty')
    if report['unhandled'] > max_unhandled:
        breaches.append('unhandled')
    if report['observedResponse5xxFraction'] is not None and report['observedResponse5xxFraction'] > max_5xx:
        breaches.append('observed-response-5xx')
    if report['observedResponseGe2sFraction'] is not None and report['observedResponseGe2sFraction'] > max_ge2s:
        breaches.append('observed-response-ge2s')
    verdict = 'inconclusive' if issues else 'observed-alert' if breaches else 'observed-within-thresholds'
    return {**report, 'verdict': verdict, 'issues': issues, 'breaches': breaches,
            'thresholds': {'minResponses': min_responses, 'max5xxFraction': max_5xx, 'maxGe2sFraction': max_ge2s,
                           'maxUnhandled': max_unhandled, 'maxAgeUpperBoundSeconds': max_age}}, (2 if issues else 1 if breaches else 0)


def summarize_streams(events, now, window_minutes=15, route=None):
    if not 1 <= window_minutes <= 1440 or (route is not None and route not in STREAM_ROUTES):
        raise InputError('Invalid parameters')
    end = now.astimezone(UTC).replace(second=0, microsecond=0)
    start = end - timedelta(minutes=window_minutes - 1)
    counts, outcomes, duration = Counter(), Counter(), Counter()
    groups = defaultdict(Counter)
    latest = None
    for event in events:
        counts['input'] += 1
        stamp = parse_minute(event['minute'])
        if stamp > end:
            counts['future'] += 1
            continue
        if stamp < start:
            counts['outside'] += 1
            continue
        # Both event families share one realm budget; either marker makes coverage uncertain.
        if event['kind'] == 'coverage-capped':
            counts['capped'] += 1
            continue
        if event['format'] != STREAM_FORMAT:
            counts['headers'] += 1
            continue
        if route is not None and event['route'] != route:
            counts['other'] += 1
            continue
        latest = stamp if latest is None else max(latest, stamp)
        counts['terminals'] += 1
        outcomes[event['outcome']] += 1
        duration[event['duration']] += 1
        groups[event['route']][event['outcome']] += 1
    total = counts['terminals']
    return {
        'format': 'jobmatch-ops-stream-report-v1',
        'scope': 'supplied-file/server-stream-terminals-only',
        'collectionCompleteness': 'not-established',
        'clientDelivery': 'not-established',
        'windowStartMinute': utc_text(start), 'windowEndMinute': utc_text(end), 'routeFilter': route,
        'inputRecords': counts['input'], 'outsideWindowRecords': counts['outside'],
        'otherRouteRecords': counts['other'], 'headerRecordsNotEvaluated': counts['headers'],
        'futureRecords': counts['future'], 'coverageMarkers': counts['capped'],
        'terminals': total, 'outcomeCounts': dict(sorted(outcomes.items())),
        'durationCounts': dict(sorted(duration.items())), 'unknownMeasurements': duration['unknown'],
        'observedIncompleteFraction': outcomes['incomplete-enqueued'] / total if total else None,
        'observedCancelledFraction': outcomes['cancelled'] / total if total else None,
        'lastObservationMinute': utc_text(latest) if latest is not None else None,
        'ageUpperBoundSeconds': max(0, int((now.astimezone(UTC) - latest).total_seconds())) if latest is not None else None,
        'groups': [{'route': key, 'outcomes': dict(sorted(value.items()))} for key, value in sorted(groups.items())],
    }


def check_stream_report(report, min_streams, max_incomplete, max_cancelled, max_age):
    if (type(min_streams) is not int or not 1 <= min_streams <= 1_000_000
            or type(max_age) is not int or not 60 <= max_age <= 86400
            or not all(type(value) in (int, float) and math.isfinite(value) and 0 <= value <= 1
                       for value in (max_incomplete, max_cancelled))):
        raise InputError('Invalid thresholds')
    issues, breaches = [], []
    if report['terminals'] < min_streams:
        issues.append('insufficient-terminals')
    if report['coverageMarkers']:
        issues.append('coverage-capped')
    if report['unknownMeasurements']:
        issues.append('unknown-measurement')
    if report['futureRecords']:
        issues.append('future-event')
    if report['ageUpperBoundSeconds'] is None or report['ageUpperBoundSeconds'] > max_age:
        issues.append('stale-or-empty')
    if report['observedIncompleteFraction'] is not None and report['observedIncompleteFraction'] > max_incomplete:
        breaches.append('observed-incomplete')
    if report['observedCancelledFraction'] is not None and report['observedCancelledFraction'] > max_cancelled:
        breaches.append('observed-cancelled')
    verdict = 'inconclusive' if issues else 'observed-alert' if breaches else 'observed-within-thresholds'
    return {**report, 'verdict': verdict, 'issues': issues, 'breaches': breaches,
            'thresholds': {'minStreams': min_streams, 'maxIncompleteFraction': max_incomplete,
                           'maxCancelledFraction': max_cancelled, 'maxAgeUpperBoundSeconds': max_age}}, (2 if issues else 1 if breaches else 0)


class SafeParser(argparse.ArgumentParser):
    def error(self, message):
        self.exit(2, 'Invalid operational-report parameters.\n')


def main(argv=None):
    parser = SafeParser(prog='jobmatch-ops', description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True, parser_class=SafeParser)
    for name in ('report', 'check', 'stream-report', 'stream-check'):
        command = sub.add_parser(name)
        command.add_argument('input')
        command.add_argument('--window-minutes', default='15')
        command.add_argument('--route', choices=sorted(STREAM_ROUTES if name.startswith('stream-') else ROUTES))
        command.add_argument('--now', help='Explicit UTC second clock for reproducible file-only replay')
        if name == 'check':
            for flag in ('min-responses', 'max-5xx-fraction', 'max-ge2s-fraction', 'max-unhandled', 'max-age-seconds'):
                command.add_argument('--' + flag, required=True)
        if name == 'stream-check':
            for flag in ('min-streams', 'max-incomplete-fraction', 'max-cancelled-fraction', 'max-age-seconds'):
                command.add_argument('--' + flag, required=True)
    args = parser.parse_args(argv)
    try:
        if args.now is not None:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', args.now):
                raise InputError('Invalid clock')
            now = datetime.strptime(args.now, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=UTC)
        else:
            now = datetime.now(UTC)
        if now.year < 1970:
            raise InputError('Invalid clock')
        summarizer = summarize_streams if args.command.startswith('stream-') else summarize
        report = summarizer(events_from_file(args.input), now, int(args.window_minutes), args.route)
        report['evaluationClock'] = 'explicit' if args.now is not None else 'local-wall-clock'
        code = 0
        if args.command == 'check':
            report, code = check_report(report, int(args.min_responses), float(args.max_5xx_fraction),
                                        float(args.max_ge2s_fraction), int(args.max_unhandled), int(args.max_age_seconds))
        elif args.command == 'stream-check':
            report, code = check_stream_report(report, int(args.min_streams), float(args.max_incomplete_fraction),
                                               float(args.max_cancelled_fraction), int(args.max_age_seconds))
        else:
            report['verdict'] = 'not-checked'
        print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
        return code
    except (OSError, ValueError, TypeError, KeyError, UnicodeError, OverflowError):
        print('Operational telemetry input/parameters refused; no input contents or paths emitted.', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
