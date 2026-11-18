import Link from 'next/link';
import RewritePreviewPanel from '../rewrite-preview-panel';
import fixture from '../../tests/fixtures/rewrite-live-synthetic-20261118.json';
export const metadata={title:'JobMatch — демонстрация проверки черновика',robots:{index:false,follow:false}};
export default function RewriteDemo(){
 const source=fixture.output.suggestions.map(row=>({id:row.sourceId,text:row.sourceQuote}));
 return <main className="mvp-shell rewrite-demo">
  <p><Link href="/">← Вернуться к JobMatch</Link></p>
  <h1>Демонстрация проверки черновика</h1>
  <p>Только вымышленные данные. Ниже сохранён ответ одного теста Groq от 18 ноября 2026 года, а не новый запрос. Открытие страницы не вызывает ИИ и не использует ваши профили.</p>
  <p>Это прототип предварительного просмотра, не готовая функция переписывания личного резюме. Реальные резюме в Groq не отправляются. Автоматическое применение отключено.</p>
  <RewritePreviewPanel source={source} output={fixture.output}/>
 </main>;
}
