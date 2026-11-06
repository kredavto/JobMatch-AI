"""Exclusive pinned safetensors/tokenizer download; CI only, no model execution."""
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.request
from fetch_adaptation_model import approved, SafeRedirect, valid_url, copy_verified

ROOT = Path(__file__).resolve().parent.parent
PIN_SHA = '4bd194517aa2b9b88092e9f9374ea14ba2b504c6398e10d4babb45a2f4d2f459'

def manifest():
    raw = (ROOT / 'evaluation/typed-support/model.json').read_bytes()
    if hashlib.sha256(raw).hexdigest() != PIN_SHA:
        raise ValueError('Unreviewed manifest')
    return json.loads(raw)

def main():
    if not approved() or len(sys.argv) != 2:
        raise ValueError('Approved CI and exclusive directory required')
    pin = manifest()
    directory = Path(sys.argv[1])
    directory.mkdir(mode=0o755, exist_ok=False)
    opener = urllib.request.build_opener(SafeRedirect())
    deadline = time.monotonic() + 300
    for name, spec in pin['files'].items():
        url = 'https://huggingface.co/' + pin['repository'] + '/resolve/' + pin['revision'] + '/' + name
        with opener.open(url, timeout=30) as response, (directory / name).open('xb') as target:
            if response.status != 200 or not valid_url(response.geturl()):
                raise ValueError('Download refused')
            copy_verified(response, target, spec['bytes'], spec['sha256'], deadline)
        os.chmod(directory / name, 0o444)
    print('NLI_DOWNLOAD_VERIFIED: exact immutable files and MIT license; no inference')

if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError):
        print('NLI download refused or failed', file=sys.stderr)
        raise SystemExit(2)
