import {ru,en} from '../lib/i18n';
import Connectivity from './connectivity';
import LocaleProvider from './locale-provider';
import {SkipLink} from './locale-context';
import {requestLocale} from '../lib/i18n/request-locale';
import {localeManifest} from '../lib/i18n/preference';
import type {Metadata} from 'next';import './globals.css';
export async function generateMetadata():Promise<Metadata>{const locale=await requestLocale();return {...(locale==='en'?en:ru).metadata,manifest:localeManifest(locale)};}
export default async function Layout({children}:{children:React.ReactNode}){const locale=await requestLocale();return <html lang={locale}><body><LocaleProvider initialLocale={locale}><SkipLink/><Connectivity/>{children}</LocaleProvider></body></html>;}
