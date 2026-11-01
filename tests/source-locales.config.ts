import {defineConfig} from '@playwright/test';
import shared from '../playwright.config';
/** Standalone widget acceptance without starting production Next. Included in full E2E too. */
export default defineConfig({...shared,testDir:'./e2e',testMatch:'source-locales.spec.ts',webServer:undefined});
