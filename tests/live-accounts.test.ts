import {it,expect} from 'vitest';
import {assertDisposableAccounts} from './live-accounts';
const a='jobmatch-qa-11111111-1111-4111-8111-111111111111@example.test';
it('permits only distinct explicitly named disposable accounts',()=>{expect(()=>assertDisposableAccounts([a])).not.toThrow();for(const values of [[],[a,a],['user@example.com'],['jobmatch-qa-x@example.test'],[a.replace('@example.test','@gmail.com')]])expect(()=>assertDisposableAccounts(values)).toThrow();});
