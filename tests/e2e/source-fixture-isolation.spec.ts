import {test,expect} from '@playwright/test';
test('locale interaction fixtures are not served by production Next',async({request})=>{
 for(const file of ['source-locale.html','source-locale-entry.tsx','source-locale-server.mjs','auth-locale.html','auth-locale-entry.tsx']){
  const response=await request.get('/tests/fixtures/'+file);
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('Fixture other owner');
 }
});
