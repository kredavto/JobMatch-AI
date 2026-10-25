import {it,expect} from 'vitest';import {NextRequest} from 'next/server';import {sameOrigin,rateLimit} from '../lib/http';
it('blocks missing origin',()=>expect(()=>sameOrigin(new NextRequest('https://app.example/api'))).toThrow('ORIGIN'));
it('blocks cross origin',()=>expect(()=>sameOrigin(new NextRequest('https://app.example/api',{headers:{origin:'https://evil.example'}}))).toThrow('ORIGIN'));
it('accepts same origin',()=>expect(()=>sameOrigin(new NextRequest('https://app.example/api',{headers:{origin:'https://app.example'}}))).not.toThrow());
it('limits repeated requests',()=>{const key='test-'+Math.random();rateLimit(key,1);expect(()=>rateLimit(key,1)).toThrow('RATE');});
