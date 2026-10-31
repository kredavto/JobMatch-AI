#!/usr/bin/env python3
"""CI-only pinned public weights download. No inference API, tokens, caller URLs or overwrite."""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import urllib.parse
import urllib.request

PIN = Path(__file__).resolve().parent.parent / 'evaluation' / 'cpu-model.json'
CANDIDATE_PIN = Path(__file__).resolve().parent.parent / 'evaluation' / 'cpu-model-candidate.json'
LICENSE_SHA = '832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e'
MAX_SECONDS = 300


def validate_pin(value, slot='baseline'):
    common = dict(format='jobmatch-cpu-model-pin-v1', license='Apache-2.0',
                  llamaRepository='ggml-org/llama.cpp', llamaRevision='8642541b255bfb5dc39cd351a178be09013a55d6',
                  context=4096, threads=4, maxTokens=2048, seed=42)
    if slot == 'baseline':
        identity = dict(repository='Qwen/Qwen2.5-0.5B-Instruct-GGUF', revision='df5bf01389a39c743ab467d734bf501681e041c5',
                        file='qwen2.5-0.5b-instruct-q8_0.gguf', bytes=675710816,
                        sha256='ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e',
                        modelAlias='jobmatch-qwen2.5-0.5b-q8-diagnostic')
    elif slot == 'candidate':
        identity = dict(repository='Qwen/Qwen2.5-1.5B-Instruct-GGUF', revision='91cad51170dc346986eccefdc2dd33a9da36ead9',
                        file='qwen2.5-1.5b-instruct-q8_0.gguf', bytes=1894532128,
                        sha256='d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8',
                        modelAlias='jobmatch-qwen2.5-1.5b-q8-diagnostic')
    else:
        raise ValueError('Unreviewed model slot')
    if not isinstance(value, dict) or value != {**common, **identity}:
        raise ValueError('Pin refused')
    return value


def approved():
    return (os.environ.get('CI') == 'true' and os.environ.get('GITHUB_ACTIONS') == 'true'
            and os.environ.get('JOBMATCH_AI_CPU_DIAGNOSTIC') == 'true'
            and os.environ.get('GITHUB_REPOSITORY') == 'kredavto/JobMatch-AI'
            and os.environ.get('JOBMATCH_REPOSITORY_VISIBILITY') == 'public')


def valid_url(url):
    parsed = urllib.parse.urlsplit(url)
    host = parsed.hostname or ''
    return (parsed.scheme == 'https' and not parsed.username and not parsed.password
            and parsed.port in (None, 443)
            and (host == 'huggingface.co' or host.endswith('.huggingface.co')
                 or host.endswith('.hf.co')))


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections = 5

    def redirect_request(self, request, response, code, message, headers, newurl):
        if not valid_url(newurl):
            raise ValueError('Redirect refused')
        return super().redirect_request(request, response, code, message, headers, newurl)


def copy_verified(source, output, expected_size, expected_sha, deadline):
    digest, total = hashlib.sha256(), 0
    while True:
        if time.monotonic() > deadline:
            raise ValueError('Download deadline')
        chunk = source.read(min(512 * 1024, expected_size - total + 1))
        if not chunk:
            break
        total += len(chunk)
        if total > expected_size:
            raise ValueError('Download oversized')
        digest.update(chunk)
        output.write(chunk)
    if total != expected_size or digest.hexdigest() != expected_sha:
        raise ValueError('Weights identity mismatch')


def small(opener, url, limit, deadline):
    if not valid_url(url) or time.monotonic() > deadline:
        raise ValueError('Download refused')
    with opener.open(url, timeout=30) as response:
        if response.status != 200 or not valid_url(response.geturl()):
            raise ValueError('Download refused')
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError('Metadata oversized')
        return data


def main(argv=None):
    temporary = None
    try:
        if not approved():
            raise ValueError('CI approval required')
        args = sys.argv[1:] if argv is None else argv
        if len(args) == 1 and not args[0].startswith('-'):
            slot, manifest, target_directory = 'baseline', PIN, args[0]
        elif len(args) == 2 and args[0] == '--candidate' and not args[1].startswith('-'):
            slot, manifest, target_directory = 'candidate', CANDIDATE_PIN, args[1]
        else:
            raise ValueError('Parameters refused')
        # Exactly two reviewed sources, never a caller URL, resource override or arbitrary manifest.
        pin = validate_pin(json.loads(manifest.read_text()), slot)
        directory = Path(target_directory)
        directory.mkdir(mode=0o755, parents=False, exist_ok=False)
        target = directory / 'model.gguf'
        base = 'https://huggingface.co/' + pin['repository']
        opener = urllib.request.build_opener(SafeRedirect())
        deadline = time.monotonic() + MAX_SECONDS
        pointer = small(opener, base + '/raw/' + pin['revision'] + '/' + pin['file'], 1024, deadline)
        expected = ('version https://git-lfs.github.com/spec/v1\noid sha256:' + pin['sha256']
                    + '\nsize ' + str(pin['bytes']) + '\n').encode()
        if pointer != expected:
            raise ValueError('Revision pointer mismatch')
        license_text = small(opener, base + '/raw/' + pin['revision'] + '/LICENSE', 32768, deadline)
        if hashlib.sha256(license_text).hexdigest() != LICENSE_SHA:
            raise ValueError('License missing')
        fd, temporary = tempfile.mkstemp(prefix='.weights-', dir=directory)
        with os.fdopen(fd, 'wb') as output:
            url = base + '/resolve/' + pin['revision'] + '/' + pin['file']
            with opener.open(url, timeout=30) as source:
                if source.status != 200 or not valid_url(source.geturl()):
                    raise ValueError('Download refused')
                copy_verified(source, output, pin['bytes'], pin['sha256'], deadline)
        os.chmod(temporary, 0o444)
        os.link(temporary, target)  # Exclusive final name, no overwrite.
        os.unlink(temporary)
        temporary = None
        (directory / 'LICENSE').write_bytes(license_text)
        os.chmod(directory / 'LICENSE', 0o444)
        print('CPU_MODEL_DOWNLOAD_PASS: pinned revision pointer, exact size/SHA256 and license; no inference executed.')
        return 0
    except (OSError, ValueError, TypeError, KeyError, UnicodeError):
        print('CPU model download refused or failed; no input paths, URLs or diagnostics emitted.', file=sys.stderr)
        return 2
    finally:
        if temporary is not None:
            try:
                os.unlink(temporary)
            except OSError:
                pass


if __name__ == '__main__':
    raise SystemExit(main())
