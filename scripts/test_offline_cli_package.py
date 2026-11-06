import contextlib
import io
import hashlib
import json
import os
from pathlib import Path
import tempfile
import tarfile
import unittest
from unittest.mock import patch
import offline_cli_package as package


class OfflineCliPackaging(unittest.TestCase):
    def test_default_refuses_before_network_files_or_processes(self):
        with patch.dict(os.environ,{},clear=True),patch.object(package.urllib.request,'build_opener') as fetch,patch.object(package.subprocess,'run') as process,patch.object(package.tempfile,'mkdtemp') as directory,contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(package.main([]),2);fetch.assert_not_called();process.assert_not_called();directory.assert_not_called()

    def test_exact_public_ci_and_explicit_optin_required(self):
        env=dict(CI='true',GITHUB_ACTIONS='true',GITHUB_REPOSITORY='kredavto/JobMatch-AI',JOBMATCH_REPOSITORY_VISIBILITY='public',JOBMATCH_OFFLINE_CLI_PACKAGE='1')
        self.assertTrue(package.approved(env))
        for key in env:self.assertFalse(package.approved({**env,key:''}))
        self.assertFalse(package.approved({**env,'JOBMATCH_REPOSITORY_VISIBILITY':'private'}))

    def test_network_none_no_credentials_and_only_generated_project_is_writable(self):
        args=package.container_args('jobmatch_offline_cli_'+'a'*32,'sha256:'+'b'*64,Path('/tmp/owned'))
        for flag,value in [('--network','none'),('--user','1000:1000'),('--memory','512m'),('--memory-swap','512m'),('--pids-limit','64'),('--cap-drop','ALL')]:self.assertEqual(args[args.index(flag)+1],value)
        self.assertIn('--read-only',args);self.assertNotIn('--env',args);self.assertNotIn('/var/run/docker.sock',' '.join(args))
        mounts=[args[i+1] for i,x in enumerate(args) if x=='--mount'];self.assertEqual(sum(not x.endswith(',readonly') for x in mounts),1);self.assertIn('src=/tmp/owned/project,dst=/work',mounts[0])
        for name,image in [('postgres','sha256:'+'b'*64),('jobmatch_offline_cli_'+'a'*32,'node:latest')]:
            with self.assertRaises(ValueError):package.container_args(name,image,Path('/tmp/owned'))

    def test_unverified_archive_is_never_extracted(self):
        for value in (b'',b'public synthetic tar bytes'):
            with self.assertRaises(ValueError):package.unpack_binary(value)

    def test_even_checksum_bound_fixture_archives_refuse_unsafe_layout(self):
        def archive(name,link=False):
            output=io.BytesIO()
            with tarfile.open(fileobj=output,mode='w:gz') as target:
                item=tarfile.TarInfo(name);data=b'\x7fELFsynthetic-not-executable';item.size=len(data)
                if link:item.type=tarfile.SYMTYPE;item.linkname='/outside';item.size=0;target.addfile(item)
                else:target.addfile(item,io.BytesIO(data))
            return output.getvalue()
        for name,link in [('../supabase',False),('/supabase',False),('supabase',True)]:
            raw=archive(name,link)
            with patch.object(package,'ARCHIVE_SHA',hashlib.sha256(raw).hexdigest()),self.assertRaises(ValueError):package.unpack_binary(raw)
        raw=archive('supabase')
        with patch.object(package,'ARCHIVE_SHA',hashlib.sha256(raw).hexdigest()):self.assertEqual(package.unpack_binary(raw),b'\x7fELFsynthetic-not-executable')

    def test_download_redirect_is_rejected_before_an_untrusted_connection(self):
        for url in ('http://github.com/file','https://github.com.evil.test/file','https://user:private@github.com/file','https://github.com:444/file','https://example.test/file'):
            self.assertFalse(package.allowed_download_url(url))
            with self.assertRaises(ValueError):package.DownloadRedirect().redirect_request(None,None,302,'',{},url)
        self.assertTrue(package.allowed_download_url(package.URL))

    def test_cleanup_preserves_unknown_paths_and_requires_own_marker(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);outside=root/'keep';outside.mkdir();(outside/'file').write_text('keep');env=dict(RUNNER_TEMP=directory,GITHUB_RUN_ID='123')
            with self.assertRaises(ValueError):package.cleanup(str(outside),env)
            own=root/(package.PREFIX+'abcdefgh');own.mkdir()
            with self.assertRaises(FileNotFoundError):package.cleanup(str(own),env)
            link=root/(package.PREFIX+'abcd1234');link.symlink_to(outside,target_is_directory=True)
            with self.assertRaises(ValueError):package.cleanup(str(link),env)
            (own/'.owned').write_text(json.dumps(dict(format='wrong',runId='123',directory=own.name)))
            with self.assertRaises(ValueError):package.cleanup(str(own),env)
            (own/'.owned').write_text(json.dumps(dict(format='jobmatch-offline-cli-owned-v1',runId='123',directory=own.name)));package.cleanup(str(own),env)
            self.assertFalse(own.exists());self.assertEqual((outside/'file').read_text(),'keep')


if __name__=='__main__':unittest.main()
