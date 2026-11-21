import {expect,test,type Page} from '@playwright/test';
import {ACCOUNT_FULL_POLICY,resumeFacts} from '../../mvp/full-resume-consent';

const origin='http://127.0.0.1:3123';
const input='Фиктивный соискатель\n• Писал внутреннюю документацию.\n• Команда подготовила 17 отчётов на SQL.';
const replacement='17 отчётов на SQL подготовила команда.';
const vacancy={title:'Тестовый аналитик',company:'Фиктивная компания',url:'https://example.test/job',text:'SQL VACANCY_ONLY_MARKER',skills:['SQL','Docker']};
const subject='11111111-1111-4111-8111-111111111111';
const consent={id:'22222222-2222-4222-8222-222222222222',policy:ACCOUNT_FULL_POLICY,granted:true,revision:1};

async function setup(page:Page){
 const writes:Array<{path:string;body:Record<string,unknown>}>=[],offsite:string[]=[];
 let hold=false,statusReads=0,releases:Array<()=>void>=[];
 await page.context().route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==origin){offsite.push(url.origin);return route.abort();}
  if(req.method()==='POST'){
   writes.push({path:url.pathname,body:req.postDataJSON() as Record<string,unknown>});
   if(url.pathname==='/api/mvp/vacancy')return route.fulfill({json:vacancy});
   if(url.pathname==='/api/rewrite-pilot')return route.fulfill({json:{state:'review',subject,source:resumeFacts(input),output:{suggestions:[{sourceId:'line-3',sourceQuote:'• Команда подготовила 17 отчётов на SQL.',text:replacement}]}}});
   return route.abort();
  }
  if(url.pathname==='/api/rewrite-pilot'){
   statusReads++;
   if(hold)await new Promise<void>(resolve=>releases.push(resolve));
   return route.fulfill({json:{subject,consent}}).catch(()=>{});
  }
  return route.continue();
 });
 await page.goto('/');
 await page.getByLabel('Файл резюме',{exact:true}).setInputFiles({name:'fictional.txt',mimeType:'text/plain',buffer:Buffer.from(input)});
 await page.getByRole('button',{name:'Прочитать файл',exact:true}).click();
 await page.getByRole('button',{name:'Использовать без сохранения',exact:true}).click();
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);
 await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();
 await page.getByRole('button',{name:'Создать ИИ-черновик',exact:true}).click();
 await page.getByRole('checkbox',{name:/Проверил/}).check();
 return {writes,offsite,browserStatusReads:()=>statusReads,hold:()=>{hold=true;},waiting:()=>releases.length,release:()=>{hold=false;releases.splice(0).forEach(release=>release());}};
}
test('actual Home applies selected wording without modifying label, original, evidence or letter',async({page})=>{
 const {writes,offsite,browserStatusReads}=await setup(page);
 const result=page.getByLabel('Текст адаптированного резюме',{exact:true}),letter=page.getByLabel('Текст сопроводительного письма',{exact:true});
 const before=await result.inputValue(),beforeLetter=await letter.inputValue(),beforeStatusReads=browserStatusReads();
 const skillMatch=page.getByRole('region',{name:'Сопоставление навыков'}),beforeSkills=await skillMatch.textContent();
 await expect(result).toHaveValue(/Команда подготовила 17/);
 await page.getByRole('button',{name:'Использовать выбранные формулировки',exact:true}).click();
 await expect(result).toHaveValue(before.replace('Команда подготовила 17 отчётов на SQL.',replacement));
 await expect(letter).toHaveValue(beforeLetter);
 expect(await skillMatch.textContent()).toBe(beforeSkills);
 expect(browserStatusReads()).toBe(beforeStatusReads+1);
 await expect(page.getByText('Локальная адаптация с проверенными вами формулировками')).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Проверил/})).toHaveCount(0);
 expect(writes.map(i=>i.path)).toEqual(['/api/mvp/vacancy','/api/rewrite-pilot']);
 expect(writes[1].body.resume).toBe(input);
 expect(JSON.stringify(writes[1].body)).not.toContain('VACANCY_ONLY_MARKER');
 expect(offsite).toEqual([]);
});
test('actual Home rejects old apply when vacancy link changes while verifying status',async({page})=>{
 const check=await setup(page);check.hold();
 await page.getByRole('button',{name:'Использовать выбранные формулировки',exact:true}).click();
 await expect.poll(check.waiting).toBe(1);
 await page.getByLabel('Ссылка на вакансию').fill('https://example.test/new');
 check.release();
 await expect(page.getByLabel('Текст адаптированного резюме',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('checkbox',{name:/Проверил/})).toHaveCount(0);
 expect(check.writes.map(i=>i.path)).toEqual(['/api/mvp/vacancy','/api/rewrite-pilot']);
 expect(check.offsite).toEqual([]);
});
