import unittest
from parser_core_drill import allowed


class ParserCoreGuard(unittest.TestCase):
    def test_owned_loopback_opt_in_only(self):
        base = {'JOBMATCH_LOCAL_PARSER_CORE':'1','PGHOST':'127.0.0.1'}
        self.assertTrue(allowed(base))
        self.assertTrue(allowed({**base,'PGHOST':'::1'}))
        for changes in ({'JOBMATCH_LOCAL_PARSER_CORE':''},{'PGHOST':'production'},{'PGHOST':'postgres'},
                        {'PGSERVICE':'prod'},{'PGSERVICEFILE':'file'},{'PGHOSTADDR':'1.2.3.4'},{'PGOPTIONS':'-c role=other'}):
            self.assertFalse(allowed({**base,**changes}))
