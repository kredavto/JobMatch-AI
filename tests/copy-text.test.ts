import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {copyResultText} from '../mvp/copy-text';
import ResultText from '../app/result-text';
it('copies exact plain text only on explicit invocation',async()=>{const write=vi.fn(async()=>{});const text='Опыт SQL\n\nКоманда: 12 отчётов. <b>не HTML</b>';expect(await copyResultText(text,write)).toBe('copied');expect(write).toHaveBeenCalledExactlyOnceWith(text);});
it('offers manual selection on unavailable or denied clipboard without success claim',async()=>{expect(await copyResultText('Текст')).toBe('manual');const write=vi.fn(async()=>{throw new Error('denied');});expect(await copyResultText('Текст',write)).toBe('manual');expect(write).toHaveBeenCalledTimes(1);});
it('does not send blank or oversized data to clipboard',async()=>{const write=vi.fn(async()=>{});expect(await copyResultText('',write)).toBe('unavailable');expect(await copyResultText('x'.repeat(120001),write)).toBe('unavailable');expect(write).not.toHaveBeenCalled();});
it('renders accessible readonly field and selectable fallback, not HTML',()=>{const html=renderToStaticMarkup(React.createElement(ResultText,{id:'result',label:'Текст резюме',text:'<script>test</script>'}));expect(html).toContain('readOnly');expect(html).toContain('for="result"');expect(html).toContain('Выделить весь текст');expect(html).toContain('системный буфер');expect(html).not.toContain('<script>');expect(html).not.toContain('Текст скопирован');});
