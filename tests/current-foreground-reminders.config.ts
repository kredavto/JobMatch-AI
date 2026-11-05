import {defineConfig} from '@playwright/test';
import shared from '../playwright.config';
export default defineConfig({...shared,testDir:'./e2e',testMatch:['current-foreground-reminders.spec.ts','current-reminder-tracker.spec.ts'],webServer:undefined});
