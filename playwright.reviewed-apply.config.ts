import {defineConfig} from '@playwright/test';
const baseURL='http://127.0.0.1:3123';
export default defineConfig({testDir:'./tests/e2e',testMatch:['reviewed-apply-home.spec.ts'],timeout:30000,workers:1,
 webServer:{command:'npm run start -- --port 3123',url:baseURL,reuseExistingServer:false,timeout:60000},
 use:{baseURL,headless:true,serviceWorkers:'block',launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}:{}},reporter:'list'});
