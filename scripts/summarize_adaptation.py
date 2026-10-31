"""Only bounded diagnostic counters, never synthetic model text, enter CI summary."""
import json
import os
import sys
from pathlib import Path

def main():
    raw = Path(sys.argv[1]).read_bytes()
    if len(raw) > 4_000_000:
        raise ValueError('Oversized log')
    lines = [line for line in raw.decode('utf8').splitlines() if line.startswith('JOBMATCH_MAIN_ADAPTATION_CPU_V1 ')]
    summary = '## Adaptation diagnostic — NOT ACCEPTED\n\n'
    if len(lines) != 1:
        summary += 'No complete diagnostic report; runtime refused or interrupted. No model acceptance.\n'
    else:
        report = json.loads(lines[0].split(' ', 1)[1])
        if report['acceptance'] != 'not-accepted' or report['planned'] != 16:
            raise ValueError('Unexpected report')
        for key in ('completed', 'backendResponses', 'goldPasses'):
            value = report[key]
            if type(value) is not int or not 0 <= value <= 16:
                raise ValueError('Invalid counter')
            summary += f'- {key}: {value}/16\n'
        summary += '\nGreen means diagnostic execution only. Synthetic gold comparison is not human semantic or held-out acceptance. See immutable raw synthetic run log and per-case failure stages.\n'
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf8') as output:
        output.write(summary)
    return 2 if len(lines) != 1 else 0

if __name__ == '__main__':
    raise SystemExit(main())
