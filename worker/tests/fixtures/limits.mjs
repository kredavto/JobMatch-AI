import {readFileSync} from 'node:fs';
process.stdout.write(JSON.stringify({ok:true,text:readFileSync('/proc/self/limits','utf8')}));
