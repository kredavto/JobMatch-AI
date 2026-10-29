import {defineConfig} from '@playwright/test';
const baseURL=process.env.BASE_URL||'http://127.0.0.1:3000';
export default defineConfig({testDir:'./tests/e2e',timeout:240000,expect:{timeout:30000},workers:1,
 webServer:process.env.CI&&!process.env.BASE_URL?{command:'npm run start -- --port 3000',url:baseURL,reuseExistingServer:false,timeout:60000}:undefined,
 use:{baseURL,headless:true,launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu']}:{}},reporter:'list'});
