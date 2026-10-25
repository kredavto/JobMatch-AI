import {describe,it,expect} from 'vitest';
import {WorkspaceSchema} from '../lib/workspace-schema';
import {validatedWorkspace} from '../lib/client-api';
const empty={revision:1,original:'SQL',vacancy:'',goal:'',facts:[],versions:[],applications:[]};
const fact={id:'ev-1',text:'SQL',source:'Импорт',verified:true};
const version={id:'v1',text:'SQL',vacancy:'SQL',created:'2026-10-25T00:00:00Z',score:50,evidence_ids:['ev-1']};
describe('workspace read boundary',()=>{
 it('keeps unknown compatibility fields and historical evidence independently of current facts',()=>{
  const value={...empty,future:{data:'retain'},versions:[{...version,futureVersion:1,evidence_snapshot:[fact]}]};
  expect(WorkspaceSchema.parse(value)).toEqual(value);
 });
 it.each([
  {...empty,original:null},
  {...empty,facts:[{...fact,verified:'true'}]},
  {...empty,facts:[{...fact,text:{secret:'do not display'}}]},
  {...empty,facts:[fact,fact]},
  {...empty,revision:-1},
  {...empty,versions:[{...version,score:101}]},
  {...empty,versions:[{...version,evidence_ids:null}]},
  {...empty,versions:[{...version,created:'2026-02-30'}]},
  {...empty,applications:[{id:'a',title:'Test',status:'Интервью',created:'2026-10-25',note:'',events:null}]}
 ])('rejects malformed nested data without exposing it in the UI error',value=>{
  expect(()=>validatedWorkspace(value)).toThrow('некорректный ответ');
  try{validatedWorkspace(value);}catch(e){expect(e).toMatchObject({status:0});expect(String(e)).not.toContain('secret');}
 });
 it('does not invent required fields or coerce a missing profile into an empty one',()=>{
  expect(WorkspaceSchema.safeParse(null).success).toBe(false);
  expect(WorkspaceSchema.safeParse({revision:1,facts:[],versions:[],applications:[]}).success).toBe(false);
 });
});
