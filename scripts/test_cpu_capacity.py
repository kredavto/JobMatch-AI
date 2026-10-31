import contextlib
import io
import os
from types import SimpleNamespace
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
            with patch.dict(os.environ, {'RUNNER_TEMP':'/tmp'}), \
                    patch.object(capacity, 'approved', return_value=True), \
                    patch.object(capacity.Path, 'read_text', return_value=text), \
                    contextlib.redirect_stderr(io.StringIO()) as err:
                self.assertEqual(capacity.main(), 2)
                self.assertNotIn('PRIVATE', err.getvalue())

    def test_checks_download_filesystem_not_checkout_and_exact_bounds(self):
        for available, expected in [(12*capacity.GIB, 0), (12*capacity.GIB-1, 2)]:
            with patch.dict(os.environ, {'RUNNER_TEMP':'/owned/download-volume'}), \
                    patch.object(capacity, 'approved', return_value=True), \
                    patch.object(capacity.os, 'statvfs', return_value=SimpleNamespace(f_bavail=available, f_frsize=1)) as disk, \
                    patch.object(capacity.Path, 'read_text', return_value='MemTotal: 12582912 kB'), \
                    contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(capacity.main(), expected)
                disk.assert_called_once_with('/owned/download-volume')

    def test_missing_download_root_refuses_before_any_filesystem_read(self):
        with patch.dict(os.environ, {}, clear=True), \
                patch.object(capacity, 'approved', return_value=True), \
                patch.object(capacity.os, 'statvfs') as disk, \
                contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(capacity.main(), 2)
            disk.assert_not_called()
