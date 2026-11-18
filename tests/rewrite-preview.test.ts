import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {prepareRewritePreview} from '../mvp/rewrite-preview';
import RewritePreviewPanel from '../app/rewrite-preview-panel';
const source=[{id:'a',text:'Команда создала 12 отчётов в 2024 году.'},{id:'b',text:'Разрабатывал Python для учебного проекта.'}];
const response=(text:string)=>({suggestions:[{sourceId:'a',sourceQuote:source[0].text,text}]});
it.each([null,undefined,{refusal:'cannot comply'},{suggestions:'wrong'},'not json',{suggestions:[{sourceId:'other',sourceQuote:source[0].text,text:'test'}]}])('rejects refused/malformed output without fallback text',output=>{const p=prepareRewritePreview(source,output);expect(p.state).toBe('rejected');expect(p).not.toHaveProperty('draft');});
it('distinguishes an explicit empty selection from failure',()=>{expect(prepareRewritePreview(source,{suggestions:[]}).state).toBe('no-suggestions');});
it('shows source, suggested text, omissions and explicit semantic limits without apply controls',()=>{
 const html=renderToStaticMarkup(React.createElement(RewritePreviewPanel,{source,output:response('В 2024 году команда создала 12 отчётов.')}));
 for(const text of ['Исходный факт','Предложение модели','Непроверенный черновик','Разрабатывал Python','Семантическая проверка не выполнена','Отклонить все предложения'])expect(html).toContain(text);
 expect(html).not.toContain('>Применить<');expect(html).not.toContain('>Принять<');
});
it('never renders untrusted proposed HTML as executable markup',()=>{
 const html=renderToStaticMarkup(React.createElement(RewritePreviewPanel,{source,output:response('<script>alert("unsafe")</script> Команда создала 12 отчётов в 2024 году.')}));
 expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
});
it('demo has only a fixed fixture, no request, profile read or API key',()=>{
 for(const path of ['app/rewrite-demo/page.tsx','app/rewrite-preview-panel.tsx','mvp/rewrite-preview.ts']){const code=readFileSync(path,'utf8');for(const forbidden of ['fetch(','localStorage','GROQ_API_KEY','adaptWithOwnModel'])expect(code).not.toContain(forbidden);}
});
it('demo navigation does not discard the main tab unsaved profile or result',()=>{
 const page=readFileSync('app/page.tsx','utf8');expect(page).toContain('<Link href="/rewrite-demo" target="_blank" rel="noopener noreferrer">');
});
