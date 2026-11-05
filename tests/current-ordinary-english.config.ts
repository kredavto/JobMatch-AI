import {defineConfig} from '@playwright/test';
import shared from '../playwright.config';
export default defineConfig({...shared,testDir:'./e2e',testMatch:['current-ordinary-english.spec.ts','current-editor-locales.spec.ts','workspace-write-context.spec.ts'],webServer:undefined});
