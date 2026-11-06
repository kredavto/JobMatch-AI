#!/usr/bin/env python3
"""One owned offline CLI file-generation attempt. No login/link/provider query.

The earlier direct CLI action was refused over possible telemetry. This distinct
path has an empty project and OS-enforced network=none before any CLI execution.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import urllib.parse
import uuid

ROOT=Path(__file__).resolve().parent.parent
VERSION='3.0.0'
ARCHIVE_SHA='eeb61edcd59a4735fcb5e58596574f25d03d420efca779f43ddb307e1cc5c754'
URL='https://github.com/supabase/cli/releases/download/v3.0.0/supabase_3.0.0_linux_amd64.tar.gz'
PREFIX='jobmatch-offline-cli-'
IMAGE='node:24-bookworm'


def allowed_download_url(url):
    value=urllib.parse.urlsplit(url)
    return value.scheme=='https' and value.hostname in ('github.com','release-assets.githubusercontent.com','objects.githubusercontent.com') and not value.username and not value.password and value.port in (None,443)


class DownloadRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections=5
    def redirect_request(self,request,response,code,message,headers,newurl):
        if not allowed_download_url(newurl):raise ValueError('CLI_DOWNLOAD_REDIRECT')
        return super().redirect_request(request,response,code,message,headers,newurl)


def approved(env):
    return env.get('CI')=='true' and env.get('GITHUB_ACTIONS')=='true' and env.get('GITHUB_REPOSITORY')=='kredavto/JobMatch-AI' and env.get('JOBMATCH_REPOSITORY_VISIBILITY')=='public' and env.get('JOBMATCH_OFFLINE_CLI_PACKAGE')=='1'


def unpack_binary(raw):
    if len(raw)>64*1024*1024 or hashlib.sha256(raw).hexdigest()!=ARCHIVE_SHA:raise ValueError('CLI_ARCHIVE_IDENTITY')
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
        candidates=[]
        for item in archive.getmembers():
            if item.name.startswith('/') or '..' in Path(item.name).parts or item.issym() or item.islnk() or item.isdev():raise ValueError('CLI_ARCHIVE_LAYOUT')
            if item.name=='supabase':
                if not item.isfile() or not 1<=item.size<=192*1024*1024:raise ValueError('CLI_BINARY_LAYOUT')
                candidates.append(item)
        if len(candidates)!=1:raise ValueError('CLI_BINARY_COUNT')
        value=archive.extractfile(candidates[0]).read(192*1024*1024+1)
        if len(value)!=candidates[0].size or not value.startswith(b'\x7fELF'):raise ValueError('CLI_BINARY_FORMAT')
        return value


def command(argv,timeout=90):
    result=subprocess.run(argv,capture_output=True,timeout=timeout)
    if result.returncode or len(result.stdout)>256*1024 or len(result.stderr)>256*1024:raise ValueError('OWNED_PROCESS_REFUSED')
    return result.stdout.decode('utf8',errors='strict')


def container_args(name,image,folder):
    if not re.fullmatch('jobmatch_offline_cli_[a-f0-9]{32}',name) or not re.fullmatch('sha256:[a-f0-9]{64}',image):raise ValueError('OWNED_CONTAINER_REQUIRED')
    return ['docker','create','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','1000:1000','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=16m,uid=1000,gid=1000','--tmpfs','/home/node:rw,noexec,nosuid,nodev,size=4m,uid=1000,gid=1000','--workdir','/work','--mount','type=bind,src='+str(folder/'project')+',dst=/work','--mount','type=bind,src='+str(folder/'bin')+',dst=/cli,readonly','--mount','type=bind,src='+str(folder/'recipe')+',dst=/recipe,readonly','--mount','type=bind,src='+str(folder/'reviewed')+',dst=/reviewed,readonly',image,'node','/recipe/offline-cli-package.mjs']


def cleanup(path,env):
    root=Path(env['RUNNER_TEMP']).resolve();folder=Path(path)
    if folder.is_symlink() or folder.resolve().parent!=root or not re.fullmatch(PREFIX+'[a-zA-Z0-9_]{8}',folder.name):raise ValueError('OWNED_DIRECTORY_REQUIRED')
    marker=json.loads((folder/'.owned').read_text())
    if marker!={'format':'jobmatch-offline-cli-owned-v1','runId':env.get('GITHUB_RUN_ID'),'directory':folder.name}:raise ValueError('OWNED_MARKER_REQUIRED')
    shutil.rmtree(folder)


def main(argv=None):
    name=None;created=False;stage='approval'
    try:
        if not approved(os.environ):raise ValueError('CI_APPROVAL_REQUIRED')
        args=sys.argv[1:] if argv is None else argv
        if len(args)==2 and args[0]=='--cleanup':cleanup(args[1],os.environ);return 0
        if args:raise ValueError('PARAMETERS_REFUSED')
        runner=Path(os.environ['RUNNER_TEMP']).resolve()
        folder=Path(tempfile.mkdtemp(prefix=PREFIX,dir=runner))
        (folder/'.owned').write_text(json.dumps(dict(format='jobmatch-offline-cli-owned-v1',runId=os.environ.get('GITHUB_RUN_ID'),directory=folder.name)))
        with open(os.environ['GITHUB_OUTPUT'],'a') as output:output.write('directory='+str(folder)+'\n')
        for item in ('bin','recipe','reviewed','project'):(folder/item).mkdir()
        # Only this brand-new, empty directory is writable by the nonroot child.
        os.chmod(folder,0o755);os.chmod(folder/'project',0o777)
        stage='immutable-public-download'
        with urllib.request.build_opener(DownloadRedirect()).open(URL,timeout=30) as response:
            if response.status!=200 or not allowed_download_url(response.geturl()):raise ValueError('CLI_DOWNLOAD_REFUSED')
            raw=response.read(64*1024*1024+1)
        binary=unpack_binary(raw);binary_path=folder/'bin/supabase';binary_path.write_bytes(binary);binary_path.chmod(0o555)
        source=(ROOT/'supabase/protocols/rewrite_versions.sql').read_bytes()
        exact_head=command(['git','rev-parse','HEAD']).strip()
        if not re.fullmatch('[a-f0-9]{40}',exact_head):raise ValueError('CLI_SOURCE_HEAD_REQUIRED')
        (folder/'reviewed/rewrite_versions.sql').write_bytes(source)
        (folder/'recipe/pin.json').write_text(json.dumps(dict(exactHead=exact_head,version=VERSION,archiveSha256=ARCHIVE_SHA,binarySha256=hashlib.sha256(binary).hexdigest(),sourceSha256=hashlib.sha256(source).hexdigest())))
        shutil.copyfile(ROOT/'tests/fixtures/offline-cli-package.mjs',folder/'recipe/offline-cli-package.mjs')
        stage='owned-image';command(['docker','pull','--quiet',IMAGE],180)
        image=command(['docker','image','inspect',IMAGE,'--format','{{.Id}}']).strip()
        name='jobmatch_offline_cli_'+uuid.uuid4().hex
        command(container_args(name,image,folder));created=True
        config=json.loads(command(['docker','inspect',name]))[0]
        if config['HostConfig']['NetworkMode']!='none' or config['HostConfig']['Privileged'] or not config['HostConfig']['ReadonlyRootfs'] or config['Config']['User']!='1000:1000':raise ValueError('CLI_ISOLATION_REFUSED')
        stage='offline-help-and-single-migration-shell';raw=command(['docker','start','--attach',name],120)
        finished=json.loads(command(['docker','inspect',name]))[0]['State']
        if finished.get('Running') or finished.get('ExitCode')!=0 or finished.get('OOMKilled'):raise ValueError('CLI_RUNTIME_REFUSED')
        lines=[line for line in raw.splitlines() if line.startswith('JOBMATCH_OFFLINE_CLI_ARTIFACT_V1 ')]
        if len(lines)!=1:raise ValueError('CLI_ARTIFACT_REPORT_REQUIRED')
        report=json.loads(lines[0].split(' ',1)[1]);filename=report.get('migrationFilename','')
        if report.get('format')!='jobmatch-offline-cli-package-v1' or report.get('exactHead')!=exact_head or report.get('cliVersion')!=VERSION or report.get('networkInterfaces')!=['lo'] or report.get('egressProbe')!='ENETUNREACH' or not re.fullmatch(r'\d{14}_reviewed_rewrite_versions\.sql',filename):raise ValueError('CLI_ARTIFACT_REPORT_INVALID')
        migration=folder/'project/supabase/migrations'/filename;value=migration.read_bytes()
        if len(value)>128*1024 or hashlib.sha256(value).hexdigest()!=report.get('migrationSha256'):raise ValueError('CLI_ARTIFACT_BYTES')
        report['containerImageId']=image;report['containerNetworkMode']='none';report['providerOperations']='not-performed';report['advisors']='not-performed';report['migrationList']='not-performed'
        (folder/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
        print('JOBMATCH_OFFLINE_CLI_ARTIFACT_V1 '+json.dumps(report,separators=(',',':')))
        print('PASS: one offline CLI-created shell, reviewed SQL bytes; no provider installation/advisors/migration-list acceptance.')
        return 0
    except (OSError,ValueError,TypeError,KeyError,subprocess.SubprocessError,tarfile.TarError):
        print('FAIL: offline CLI packaging stage='+stage+'; no raw command/network diagnostics.',file=sys.stderr);return 2
    finally:
        if created:
            try:command(['docker','rm','--force',name],20)
            except Exception:
                print('FAIL: owned CLI container cleanup incomplete.',file=sys.stderr)
                return 2


if __name__=='__main__':raise SystemExit(main())
