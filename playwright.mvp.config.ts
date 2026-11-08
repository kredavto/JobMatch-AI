import {defineConfig} from '@playwright/test';
const baseURL=process.env.BASE_URL||'http://127.0.0.1:3108';
export default defineConfig({testDir:'./tests/e2e',testMatch:['mvp.spec.ts','hh-fixture.spec.ts'],timeout:60000,expect:{timeout:15000},workers:1,
 webServer:process.env.BASE_URL?undefined:{command:'npm run start -- --port 3108',url:baseURL,reuseExistingServer:false,timeout:60000},
 use:{baseURL,headless:true,launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu']}:{}},reporter:'list'});
