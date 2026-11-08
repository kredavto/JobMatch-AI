import type {Metadata} from 'next';
import Connectivity from './connectivity';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobMatch — резюме под вашу вакансию',
  description: 'Загрузите резюме и ссылку на вакансию. Получите адаптированное резюме в Word или PDF и сопроводительное письмо.',
  manifest: '/manifest.webmanifest',
};

export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="ru"><body><a className="skip-link" href="#main-content">Перейти к содержимому</a><Connectivity/>{children}</body></html>;
}
