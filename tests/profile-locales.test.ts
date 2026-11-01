import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ProfilePanel from '../app/profile-panel';
import SkillConfirmationList from '../app/skill-confirmation-list';
import {profileCopy,formatProfileInstant} from '../lib/i18n/profile';
import type {FactHistory} from '../lib/history-schema';
const fact={id:'f1',text:'Сохранено 🧑‍💻 <PRIVATE>',source:'Цитата источника',verified:false};
const history:FactHistory[]=[{id:2,workspace_revision:7,kind:'change',captured_at:'2026-11-01T01:30:00+03:00',facts:[fact]}];
const props={ownerId:'11111111-1111-4111-8111-111111111111',busy:false,paused:false,goal:'A&B',resume:'SQL 🧑‍💻\r\n2024',fact:'New fact 🧑‍💻',facts:[fact],history,historyLoaded:true,historyCursor:2,onGoal:()=>{},onResume:()=>{},onFact:()=>{},onSaveGoal:async()=>{},onSaveResume:async()=>{},onAddFact:async()=>{},onUpload:async()=>{},onConfirm:async()=>true,onHistory:async()=>{},onSnapshot:()=>{}};
describe('current profile presentation',()=>{
 it('keeps bilingual copy shape and explicit confirmation/import qualifications',()=>{expect(Object.keys(profileCopy.en).sort()).toEqual(Object.keys(profileCopy.ru).sort());expect(profileCopy.ru.confirmationHelp).toContain('не независимая проверка');expect(profileCopy.en.confirmationHelp).toContain('not independent verification');expect(profileCopy.ru.importHelp).toContain('очищает сохранённую вакансию');expect(profileCopy.en.importHelp).toContain('clears the saved vacancy');});
 it('formats known history instants in explicit UTC for either language',()=>{for(const locale of ['ru','en'] as const)expect(formatProfileInstant(history[0].captured_at,locale)).toContain('22:30:00 UTC');});
 it('uses a fixed invalid-time fallback without rendering arbitrary date input',()=>{expect(formatProfileInstant('PRIVATE_INVALID_TIME','en')).toBe('Unknown time');expect(formatProfileInstant('PRIVATE_INVALID_TIME')).toBe('Время неизвестно');});
 it('renders translated fields while retaining raw values and ISO metadata',()=>{const en=renderToStaticMarkup(createElement(ProfilePanel,{...props,locale:'en'})),ru=renderToStaticMarkup(createElement(ProfilePanel,props));expect(en).toContain('Clarification or additional fact');expect(ru).toContain('Уточнение или дополнительный факт');for(const html of [en,ru]){expect(html.toLowerCase()).toContain('datetime="'+history[0].captured_at.toLowerCase()+'"');expect(html).toContain('22:30:00 UTC');expect(html).toContain('Сохранено 🧑‍💻 &lt;PRIVATE&gt;');expect(html).toContain('A&amp;B');expect(html).toContain(props.fact);expect(html).toContain('id="profile-resume"');}});
 it('localizes bulk controls while retaining raw fact/source/status metadata',()=>{const html=renderToStaticMarkup(createElement(SkillConfirmationList,{locale:'en',facts:[fact],disabled:false,onConfirm:async()=>true}));expect(html).toContain('Select all');expect(html).toContain('unconfirmed lines');expect(html).toContain('Сохранено 🧑‍💻 &lt;PRIVATE&gt;');expect(html).toContain('Цитата источника');expect(html).toContain('unverified');});
});
