import {readFileSync} from 'node:fs';
/** Refuse to serve uploads when cgroup v2 hard limits are absent or looser than the deployment contract. */
export function assertContainerLimits(read:(path:string)=>string=path=>readFileSync(path,'utf8')){
 const positive=(value:string)=>/^\d+$/.test(value)&&Number(value)>0&&Number.isSafeInteger(Number(value));
 const memory=read('/sys/fs/cgroup/memory.max').trim(),swap=read('/sys/fs/cgroup/memory.swap.max').trim();
 const pids=read('/sys/fs/cgroup/pids.max').trim(),cpu=read('/sys/fs/cgroup/cpu.max').trim().split(/\s+/);
 if(!positive(memory)||Number(memory)>512*1024*1024||swap!=='0'||!positive(pids)||Number(pids)>64
  ||cpu.length!==2||!cpu.every(positive)||Number(cpu[0])>Number(cpu[1]))throw new Error('Required container limits unavailable');
}
