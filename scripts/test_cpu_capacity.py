import contextlib
import io
import unittest
from unittest.mock import patch
import cpu_capacity as capacity


class Capacity(unittest.TestCase):
    def test_bounds_refuse_one_byte_short_and_invalid_types(self):
        bound = 12 * capacity.GIB
        self.assertTrue(capacity.enough_capacity(bound, bound))
        for disk, memory in [(bound-1, bound), (bound, bound-1), (-1, bound),
                             (True, bound), (bound, float(bound)), (None, bound)]:
            self.assertFalse(capacity.enough_capacity(disk, memory))

    def test_approval_refuses_before_system_reads_without_cleanup(self):
        with patch.object(capacity, 'approved', return_value=False), \
                patch.object(capacity.os, 'statvfs') as disk, \
                patch.object(capacity.Path, 'read_text') as memory, \
                contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(capacity.main(), 2)
            disk.assert_not_called()
            memory.assert_not_called()

    def test_bad_missing_duplicate_and_unreadable_memory_refuse(self):
        for text in ['', 'MemTotal: PRIVATE kB', 'MemTotal: 999999999 MB',
                     'MemTotal: 999999999 kB\nMemTotal: 999999999 kB']:
            with patch.object(capacity, 'approved', return_value=True), \
                    patch.object(capacity.Path, 'read_text', return_value=text), \
                    contextlib.redirect_stderr(io.StringIO()) as err:
                self.assertEqual(capacity.main(), 2)
                self.assertNotIn('PRIVATE', err.getvalue())
