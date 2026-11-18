import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {adaptResume} from '../mvp/adapt';
import SkillMatchReview from '../app/skill-match-review';
const vacancy={title:'Engineer',company:'Example',url:'https://example.com/job',text:'Python SQL Docker experience needed.',skills:['Python','SQL','Docker']};
it('deduplicates normalized skill names across vacancy metadata and text',()=>{
 const result=adaptResume('Работал с Python и SQL для отчётности.',{...vacancy,skills:['python','PYTHON',' SQL ','sql','Docker','docker']});
 expect(result.matchedSkills).toEqual(['Python','SQL']);expect(result.missingSkills).toEqual(['Docker']);
});
it('does not classify supported skills above the old thirty-skill display limit as missing',()=>{
 const skills=Array.from({length:45},(_,i)=>`Skill${i}`);
 const result=adaptResume('Навыки:\n'+skills.join(', '),{...vacancy,text:'A role requiring specialist skills.',skills});
 expect(result.matchedSkills).toEqual(skills);expect(result.missingSkills).toEqual([]);
});
it('distinguishes absent evidence from absent ability and never asserts full match',()=>{
 const html=renderToStaticMarkup(React.createElement(SkillMatchReview,{matchedSkills:['SQL'],missingSkills:['Docker']}));
 expect(html).toContain('SQL');expect(html).toContain('Docker');expect(html).toContain('Это не означает');expect(html).toContain('не проверка фактов');expect(html).toContain('не добавлены');
 const empty=renderToStaticMarkup(React.createElement(SkillMatchReview,{matchedSkills:[],missingSkills:[]}));
 expect(empty).toContain('Явных совпадений не найдено');expect(empty).toContain('не гарантирует полного соответствия');
});
it('renders hostile external skill strings as text, not markup',()=>{
 const html=renderToStaticMarkup(React.createElement(SkillMatchReview,{matchedSkills:['<script>alert(1)</script>'],missingSkills:[]}));
 expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
});
