"""Cross-check the probe's HTTP methods against actual Next route exports."""
from pathlib import Path
import re
import unittest
from ops_report import ROUTES
from ops_telemetry_smoke import POST_ONLY

ROOT = Path(__file__).resolve().parent.parent


class ProbeMethods(unittest.TestCase):
    def test_every_probed_route_uses_an_actually_exported_method(self):
        self.assertLessEqual(POST_ONLY, ROUTES)
        for route in sorted(ROUTES):
            with self.subTest(route=route):
                source = (ROOT / 'app' / 'api' / route / 'route.ts').read_text(encoding='utf8')
                methods = set(re.findall(r'\bexport\s+(?:async\s+function|const)\s+(GET|POST)\b', source))
                self.assertIn('POST' if route in POST_ONLY else 'GET', methods)
                self.assertEqual(route in POST_ONLY, methods == {'POST'})


if __name__ == '__main__':
    unittest.main()
