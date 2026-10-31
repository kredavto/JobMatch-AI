"""Fail closed on actual target filesystem capacity; never deletes data or changes runner."""
import os
import shutil
from pathlib import Path

def main():
    root = Path(os.environ['RUNNER_TEMP'])
    if shutil.disk_usage(root).free < 6 * 1024**3:
        raise RuntimeError('Insufficient free target space')
    fields = dict(line.split(':', 1) for line in Path('/proc/meminfo').read_text().splitlines())
    if int(fields['MemAvailable'].strip().split()[0]) * 1024 < 5 * 1024**3:
        raise RuntimeError('Insufficient available RAM')
    print('ADAPTATION_CAPACITY_PASS')

if __name__ == '__main__':
    main()
