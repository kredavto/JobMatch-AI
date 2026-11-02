import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import OrdinaryVersionsPanel from '../app/ordinary-versions-panel';
import {matchMetadata} from '../lib/match-config';
import {it,expect} from 'vitest';
import {formatVersionCreated} from '../lib/i18n/version-dates';
import {docxStatusError,versionsCopy} from '../lib/i18n/versions';
it('renders explicit instants in UTC without changing the stored timestamp',()=>{
 const source='2026-10-29T00:15:30+05:45';
 const displayed=formatVersionCreated(source,'en');expect(displayed.kind).toBe('instant');expect(displayed.text).toContain('October');expect(displayed.text).toMatch(/\b28\b/);expect(displayed.text).toContain('2026');expect(displayed.text).toContain('18:30:30 UTC');
 expect(formatVersionCreated(source,'ru').text).toContain('18:30:30 UTC');
 expect(source).toBe('2026-10-29T00:15:30+05:45');
});
it('preserves date-only precision and marks missing time/zone instead of inventing midnight',()=>{
 const value=formatVersionCreated('2026-10-29','en');
 expect(value.kind).toBe('date');expect(value.text).toContain('October');expect(value.text).toMatch(/\b29\b/);expect(value.text).toContain('2026');expect(value.text).toContain(versionsCopy.en.dates.only);expect(value.text).not.toContain('00:00');
 expect(formatVersionCreated('2026-10-29','ru').text).toContain('октября');
});
it('leaves offset-less and unknown legacy values verbatim with explicit uncertainty',()=>{
 for(const source of ['2026-10-29T10:30:00','2026-02-30','unknown']){
  expect(formatVersionCreated(source,'en')).toEqual({kind:'unspecified',text:source+' ('+versionsCopy.en.dates.unspecified+')'});
 }
});
it('date rendering is independent of device time zone for all legacy precisions',()=>{
 const original=process.env.TZ;
 try{
  const values=['2026-10-29T00:15:30+05:45','2026-10-29','2026-10-29T10:30:00'];
  process.env.TZ='Pacific/Honolulu';const first=values.map(value=>formatVersionCreated(value,'en'));
  process.env.TZ='Asia/Kathmandu';expect(values.map(value=>formatVersionCreated(value,'en'))).toEqual(first);
 }finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
it('DOCX status feedback remains semantic and never consumes provider response text',()=>{
 const expected={401:'session',409:'changed',404:'missing',429:'rate',413:'large',503:'prepare'} as const;
 for(const [status,key] of Object.entries(expected)){const semantic=docxStatusError(Number(status));expect(semantic).toBe(key);expect(versionsCopy.en.docx.errors[semantic]).not.toBe(versionsCopy.ru.docx.errors[semantic]);}
 expect(docxStatusError(500)).toBe('prepare');
});

it('keeps the closed version catalog and metadata/DOCX keys bilingual',()=>{expect(Object.keys(versionsCopy.ru).sort()).toEqual(Object.keys(versionsCopy.en).sort());expect(Object.keys(versionsCopy.ru.docx.errors).sort()).toEqual(Object.keys(versionsCopy.en.docx.errors).sort());expect(Object.keys(versionsCopy.ru.metadata.categories).sort()).toEqual(Object.keys(versionsCopy.en.metadata.categories).sort());expect(versionsCopy.en.metadata.help).toContain('not a new analysis');expect(versionsCopy.en.deltaCaveat).toContain('not an ATS');});
it('displays mixed historical snapshots honestly without changing JSON, metadata or source text',()=>{const metadata={...matchMetadata([{status:'matched'}]),rules_revision:'historical-rules-2020',contributions:{matched:1,partial:0.25,missing:0,unknown:0}},version={id:'old',created:'2026-10-25T10:30:00',text:'SQL 🚀\r\nLiteral',vacancy:'SQL',score:40,evidence_ids:['one'],evidence_snapshot:[{id:'one',text:'SQL',source:'RAW',verified:true},{id:'two',text:'Learning Excel',source:'RAW legacy',verified:false}],match_metadata:metadata,opaque:'literal 🚀'},before=JSON.stringify(version);
const html=renderToStaticMarkup(createElement(OrdinaryVersionsPanel,{versions:[version],ownerId:'11111111-1111-4111-8111-111111111111',locale:'en',busy:false,onRestore:async()=>{},onCopy:async()=>{},onDownload:()=>{}}));expect(html).toContain(versionsCopy.en.snapshot);expect(html).toContain(versionsCopy.en.unconfirmed);expect(html).toContain('historical-rules-2020');expect(html).toContain('partial = 0.25');expect(html).toContain('2026-10-25T10:30:00');expect(html).toContain(versionsCopy.en.dates.unspecified);expect(JSON.stringify(version)).toBe(before);});
