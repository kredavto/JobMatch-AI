import {it,expect} from 'vitest';
import {parseProviderAuth,validateAuthAck} from '../lib/auth-contract';
const session={access_token:'fake.access.token',refresh_token:'fake-refresh',expires_in:3600,token_type:'bearer'};
const user={id:'11111111-1111-4111-8111-111111111111',email:'demo@example.test'};
it('distinguishes session and registration confirmation',()=>{
 expect(parseProviderAuth(session,'login').kind).toBe('session');
 expect(parseProviderAuth(user,'register')).toEqual({kind:'confirmation'});
 expect(()=>parseProviderAuth(user,'login')).toThrow();
 expect(()=>parseProviderAuth(user,'refresh')).toThrow();
});
it.each([null,{}, {...session,refresh_token:undefined},{...session,expires_in:'3600'},{...session,expires_in:-1},{...session,access_token:'token\r\nInjected'},{...session,token_type:'invalid'},{...user,access_token:''}])('rejects malformed provider data',value=>{
 expect(()=>parseProviderAuth(value,'register')).toThrow('INVALID_AUTH_RESPONSE');
});
it('only accepts confirmation acknowledgments for registration',()=>{
 expect(validateAuthAck({confirmationRequired:true},true)).toEqual({confirmationRequired:true});
 expect(()=>validateAuthAck({confirmationRequired:true})).toThrow();
 expect(()=>validateAuthAck({ok:false})).toThrow();
 expect(()=>validateAuthAck({ok:true,confirmationRequired:true},true)).toThrow();
});
