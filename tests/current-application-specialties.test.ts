import {it,expect} from 'vitest';
import {WorkspaceCommandSchema} from '../lib/workspace-command';
import {selectApplications} from '../lib/analytics';
it('accepts an explicit specialty label on the current application command',()=>{expect(WorkspaceCommandSchema.safeParse({action:'application',id:'a',status:'Планируется',note:'',specialty:'Data 🧑‍💻'}).success).toBe(true);});
it('accepts explicit empty specialty as clearing while omission remains distinct',()=>{const parsed=WorkspaceCommandSchema.safeParse({action:'application',id:'a',status:'Планируется',note:'',specialty:''});expect(parsed.success).toBe(true);if(parsed.success)expect(Object.hasOwn(parsed.data,'specialty')).toBe(true);});
it('applies literal explicit specialty alongside existing analytics filters',()=>{const base={title:'SQL',status:'Планируется',note:'',created:'2026-11-02',events:[]};const rows=[{...base,id:'a',specialty:'Data'},{...base,id:'b',specialty:'Sales'}];expect(selectApplications(rows,Object.assign({from:'',to:'',versionId:''},{specialty:'label:Data'})).map(a=>a.id)).toEqual(['a']);});
