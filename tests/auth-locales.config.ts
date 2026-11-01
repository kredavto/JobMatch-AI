import {defineConfig} from '@playwright/test';
import shared from '../playwright.config';
export default defineConfig({...shared,testDir:'./e2e',testMatch:['auth-locales.spec.ts','source-locales.spec.ts'],webServer:undefined});
