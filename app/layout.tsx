import {ui} from '../lib/i18n';
import Connectivity from './connectivity';
import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={...ui.metadata,manifest:'/manifest.webmanifest'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru"><body><a className="skip-link" href="#main-content">{ui.common.skip}</a><Connectivity/>{children}</body></html>}