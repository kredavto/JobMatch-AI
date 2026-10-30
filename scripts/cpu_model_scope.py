#!/usr/bin/env python3
"""Fail-closed CI scope gate; no optional shell search dependency."""
import os
import subprocess
import sys


def requires_run(event, paths):
    if event not in ('pull_request', 'workflow_dispatch'):
        raise ValueError('Unknown event')
    if event == 'workflow_dispatch' or not paths:
        return True
    if any(not isinstance(path, str) or not path or len(path) > 4096 for path in paths):
        raise ValueError('Invalid diff')
    return any(not path.endswith('.md') for path in paths)


def main():
    try:
        if os.environ.get('CI') != 'true' or os.environ.get('GITHUB_ACTIONS') != 'true':
            raise ValueError('CI required')
        result = subprocess.run(['git', 'diff', '--name-only', '-z', 'HEAD^', 'HEAD'],
                                check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
        if len(result.stdout) > 1024 * 1024 or (result.stdout and not result.stdout.endswith(b'\0')):
            raise ValueError('Diff refused')
        paths = result.stdout.decode('utf-8', errors='strict').split('\0')[:-1] if result.stdout else []
        run = requires_run(os.environ.get('JOBMATCH_CPU_EVENT_NAME'), paths)
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
            output.write('run=' + ('true' if run else 'false') + '\n')
        print('CPU_SCOPE_RUN' if run else 'CPU_SCOPE_DOCS_ONLY: no fresh inference; retain immutable runtime proof, not model acceptance.')
        return 0
    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
        print('CPU scope refused: git/event/output could not be verified; no skip decision written.', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
