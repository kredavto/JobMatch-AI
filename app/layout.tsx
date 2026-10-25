import Connectivity from './connectivity';
import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'JobMatch AI — резюме с опорой на факты',description:'Честное сопоставление опыта и вакансии',manifest:'/manifest.webmanifest'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru"><body><a className="skip-link" href="#main-content">Перейти к содержимому</a><Connectivity/>{children}</body></html>}