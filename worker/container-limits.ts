import {readFileSync} from 'node:fs';
import type {RuntimeRole} from './runtime-environment.js';
/** Refuse to serve uploads when cgroup v2 hard limits are absent or looser than the deployment contract. */
export function assertContainerLimits(read:(path:string)=>string=path=>readFileSync(path,'utf8'),role:RuntimeRole='parser'){
 const budget=role==='parser'?{memory:512*1024*1024,pids:64,cpu:1}:role==='gateway'?{memory:128*1024*1024,pids:32,cpu:0.25}:null;
 if(!budget)throw Error('Required container limits unavailable');
 const positive=(value:string)=>/^\d+$/.test(value)&&Number(value)>0&&Number.isSafeInteger(Number(value));
 const memory=read('/sys/fs/cgroup/memory.max').trim(),swap=read('/sys/fs/cgroup/memory.swap.max').trim();
 const pids=read('/sys/fs/cgroup/pids.max').trim(),cpu=read('/sys/fs/cgroup/cpu.max').trim().split(/\s+/);
 if(!positive(memory)||Number(memory)>budget.memory||swap!=='0'||!positive(pids)||Number(pids)>budget.pids
  ||cpu.length!==2||!cpu.every(positive)||Number(cpu[0])>Number(cpu[1])*budget.cpu)throw new Error('Required container limits unavailable');
}
