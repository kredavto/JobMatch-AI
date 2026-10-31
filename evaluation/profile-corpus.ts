import {PROFILE_FIELDS} from '../lib/structured-profile';
import type {AiProfilePreview} from '../lib/ai-profile';
export const PROFILE_CORPUS_VERSION='synthetic-profile-ru-en-v1';
type Gold={blockId:number;kind:'employment'|'education'|'certification'|'achievement';fields:Record<typeof PROFILE_FIELDS[number],string|null>};
type ProfileCase={id:string;language:'ru'|'en';category:string;source:string;expected:Gold[]};
const record=(kind:Gold['kind'],values:Partial<Gold['fields']>,blockId=0):Gold=>({blockId,kind,fields:Object.fromEntries(PROFILE_FIELDS.map(key=>[key,values[key]??null])) as Gold['fields']});
/** Small known synthetic smoke set. Not independent, representative or model acceptance. */
export const profileCorpus:ProfileCase[]=[
 {id:'ru-profile-employment',language:'ru',category:'employment',source:'Работал инженером в Орбита с 2020 по 2024.',expected:[record('employment',{title:'инженером',organization:'Орбита',start:'2020',end:'2024'})]},
 {id:'ru-profile-education',language:'ru',category:'education',source:'Изучал информатику в Университете Север, 2018–2022.',expected:[record('education',{title:'информатику',organization:'Университете Север',start:'2018',end:'2022'})]},
 {id:'ru-profile-certification',language:'ru',category:'certification',source:'Получен сертификат «Аналитик данных» от Экзамен-Центр, 2023. Номер: CERT-17.',expected:[record('certification',{title:'Аналитик данных',organization:'Экзамен-Центр',start:'2023',credential:'CERT-17'})]},
 {id:'ru-profile-achievement',language:'ru',category:'achievement',source:'Сократил время отчёта на 20%.',expected:[record('achievement',{description:'Сократил время отчёта на 20%.'})]},
 {id:'ru-profile-filtered-context',language:'ru',category:'pipeline-filtering',source:'Я не работал директором.\n\nРаботал аналитиком в Вектор.',expected:[record('employment',{title:'аналитиком',organization:'Вектор'},1)]},
 {id:'ru-profile-neutral',language:'ru',category:'neutral',source:'Сведения предоставляются по запросу.',expected:[]},
 {id:'en-profile-employment',language:'en',category:'employment',source:'Worked as Engineer at Orbit from 2020 to 2024.',expected:[record('employment',{title:'Engineer',organization:'Orbit',start:'2020',end:'2024'})]},
 {id:'en-profile-education',language:'en',category:'education',source:'Studied Computer Science at North University, 2018–2022.',expected:[record('education',{title:'Computer Science',organization:'North University',start:'2018',end:'2022'})]},
 {id:'en-profile-certification',language:'en',category:'certification',source:'Received Data Analyst certification from Exam Center, 2023. Credential: CERT-17.',expected:[record('certification',{title:'Data Analyst',organization:'Exam Center',start:'2023',credential:'CERT-17'})]},
 {id:'en-profile-achievement',language:'en',category:'achievement',source:'Reduced report time by 20%.',expected:[record('achievement',{description:'Reduced report time by 20%.'})]},
 {id:'en-profile-filtered-context',language:'en',category:'pipeline-filtering',source:'I have never worked as Director.\n\nWorked as Analyst at Vector.',expected:[record('employment',{title:'Analyst',organization:'Vector'},1)]},
 {id:'en-profile-neutral',language:'en',category:'neutral',source:'Additional information is available on request.',expected:[]},
];
const key=(row:Gold)=>JSON.stringify([row.blockId,row.kind,PROFILE_FIELDS.map(field=>row.fields[field])]);
export function gradeProfile(test:ProfileCase,preview:AiProfilePreview){
 const expected=new Set(test.expected.map(key)),actual=new Set(preview.candidates.map(candidate=>key(record(candidate.kind,Object.fromEntries(PROFILE_FIELDS.map(name=>[name,candidate.fields[name]?.quote??null])),candidate.blockId))));
 const missingRecords=[...expected].filter(value=>!actual.has(value)).length,unexpectedRecords=[...actual].filter(value=>!expected.has(value)).length;
 return {passed:missingRecords===0&&unexpectedRecords===0,missingRecords,unexpectedRecords};
}
