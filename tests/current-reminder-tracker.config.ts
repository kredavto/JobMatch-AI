import {defineConfig} from '@playwright/test';
import shared from '../playwright.config';
export default defineConfig({...shared,testDir:'./e2e',testMatch:['current-reminder-tracker.spec.ts','current-settings-locales.spec.ts'],webServer:undefined});
