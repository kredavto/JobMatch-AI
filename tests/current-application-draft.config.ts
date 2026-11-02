import {defineConfig} from '@playwright/test';
import shared from '../playwright.config';
export default defineConfig({...shared,testDir:'./e2e',testMatch:['current-application-draft.spec.ts'],webServer:undefined});
