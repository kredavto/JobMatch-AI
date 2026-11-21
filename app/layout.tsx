import type {Metadata, Viewport} from 'next';
import Connectivity from './connectivity';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobMatch — резюме под вашу вакансию',
  description: 'Выберите файл резюме и добавьте ссылку на вакансию. Подготовьте адаптированное резюме и сопроводительное письмо для ручного отклика на hh.ru.',
  manifest: '/manifest.webmanifest',
  applicationName: 'JobMatch',
  appleWebApp: {capable: true, title: 'JobMatch', statusBarStyle: 'default'},
  icons: {icon: '/icon.svg', apple: '/icon-192.png'},
  other: {'apple-mobile-web-app-capable': 'yes'},
};

export const viewport: Viewport = {themeColor: '#176553'};

export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="ru"><body><a className="skip-link" href="#main-content">Перейти к содержимому</a><Connectivity/>{children}</body></html>;
}
