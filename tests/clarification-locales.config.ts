import {defineConfig} from '@playwright/test';
import shared from '../playwright.config';
export default defineConfig({...shared,testDir:'./e2e',testMatch:['clarification-locales.spec.ts'],webServer:undefined});
