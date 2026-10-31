#!/usr/bin/env python3
"""Read-only preflight for the fixed 8 GiB CPU experiment; never frees disk."""
import os
from pathlib import Path
import sys
from fetch_cpu_model import approved

GIB = 1024 ** 3


def enough_capacity(disk_bytes, memory_bytes):
    # One 3.81 GB model, Docker build/layers and 8 GiB container plus host reserve.
    return (type(disk_bytes) is int and type(memory_bytes) is int
            and disk_bytes >= 12 * GIB and memory_bytes >= 12 * GIB)


def main():
    try:
        if not approved():
            raise ValueError()
        # The download directory is below RUNNER_TEMP, which need not share checkout's filesystem.
        disk = os.statvfs(os.environ['RUNNER_TEMP'])
        memory = Path('/proc/meminfo').read_text()
        rows = [row for row in memory.splitlines() if row.startswith('MemTotal:')]
        if len(rows) != 1:
            raise ValueError()
        label, value, unit = rows[0].split()
        if label != 'MemTotal:' or unit != 'kB' or not value.isdecimal():
            raise ValueError()
        if not enough_capacity(disk.f_bavail * disk.f_frsize, int(value) * 1024):
            raise ValueError()
        print('CPU_CAPACITY_PASS: >=12 GiB available disk and total RAM; fixed 8 GiB container, no cleanup or paid runner.')
        return 0
    except (OSError, ValueError, TypeError, KeyError):
        print('CPU capacity refused; no files removed or runner substitution attempted.', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
