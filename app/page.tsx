'use client';

import {useEffect, useRef, useState} from 'react';
import InstallPrompt from './install-prompt';
import AiStatus from './ai-status';
import {responseJson,VacancySchema,AdaptedResumeSchema} from '../mvp/responses';

type Vacancy = {title: string; company: string; url: string; text: string; skills: string[]};
type Result = {adaptationNote?: string; title: string; text: string; coverLetter: string; mode: 'automatic' | 'ai'; matchedSkills: string[]; missingSkills: string[]};
type Stage = 'vacancy' | 'adapt';

function Icon({name}: {name: 'file' | 'link' | 'spark' | 'list' | 'check'}) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'file' && <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>}
    {name === 'link' && <><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(0 1) scale(.95)"/></>}
    {name === 'spark' && <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4M18 4h4"/></>}
    {name === 'list' && <><path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/></>}
    {name === 'check' && <path d="m5 12 4 4L19 6"/>}
  </svg>;
}

export default function Home() {
  const [resume] = useState<{text: string; filename: string} | null>(null);
  const [url, setUrl] = useState('');
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<Partial<Record<Stage, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<Stage, string>>>({});
  const controllers = useRef<Partial<Record<Stage, AbortController>>>({});

  useEffect(() => {
    const active = controllers.current;
    return () => {
      Object.values(active).forEach(controller => controller?.abort());
    };
  }, []);

  function cancel(stage: Stage) {
    controllers.current[stage]?.abort();
    delete controllers.current[stage];
    setBusy(previous => ({...previous, [stage]: false}));
    setErrors(previous => ({...previous, [stage]: undefined}));
  }

  function invalidateResult() {
    cancel('adapt');
    setResult(null);
  }

  async function run(stage: Stage, work: (signal: AbortSignal) => Promise<void>) {
    if (controllers.current[stage]) return;
    const controller = new AbortController();
    controllers.current[stage] = controller;
    setBusy(previous => ({...previous, [stage]: true}));
    setErrors(previous => ({...previous, [stage]: undefined}));
    const timer = window.setTimeout(() => {
      if (controllers.current[stage] === controller && !controller.signal.aborted) {
        setErrors(previous => ({...previous, [stage]: 'Сервер не ответил вовремя. Повторите действие.'}));
        controller.abort();
      }
    }, 40_000);
    try {
      await work(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) setErrors(previous => ({...previous, [stage]: error instanceof Error ? error.message : 'Нет связи с сервером. Попробуйте ещё раз.'}));
    } finally {
      window.clearTimeout(timer);
      if (controllers.current[stage] === controller) {
        delete controllers.current[stage];
        setBusy(previous => ({...previous, [stage]: false}));
      }
    }
  }

  async function loadVacancy() {
    if (controllers.current.vacancy) return;
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:') throw new Error();
    } catch {
      setErrors(previous => ({...previous, vacancy: 'Введите полную ссылку на вакансию, начиная с https://.'}));
      return;
    }
    invalidateResult();
    setVacancy(null);
    await run('vacancy', async signal => {
      const data = await responseJson(await fetch('/api/mvp/vacancy', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({url: parsed.href}), signal}),VacancySchema);
      if (!signal.aborted) setVacancy(data);
    });
  }

  async function adapt() {
    if (!resume || !vacancy || controllers.current.adapt) return;
    setResult(null);
    await run('adapt', async signal => {
      const data = await responseJson(await fetch('/api/mvp/adapt', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({resume: resume.text, vacancy}), signal}),AdaptedResumeSchema);
      if (!signal.aborted) setResult(data);
    });
  }

  const error = (stage: Stage) => errors[stage] ? <p className="error" role="alert">{errors[stage]}</p> : null;

  return <div className="mvp-shell">
    <header className="topbar">
      <div className="brand" aria-label="JobMatch"><span className="brand-mark"><Icon name="spark"/></span>Job<span>Match</span></div>
      <span className="header-note"><span className="status-dot"/>Без аккаунта JobMatch</span>
    </header>
    <main id="main-content">
      <InstallPrompt/>
      <section className="intro" aria-labelledby="page-title">
        <div className="eyebrow">ВАШ СЛЕДУЮЩИЙ КАРЬЕРНЫЙ ШАГ</div>
        <h1 id="page-title">Ваш опыт.<br/><span>Нужные акценты.</span></h1>
        <p>Резюме под конкретную вакансию.<br className="mobile-break"/> Войдите в hh.ru, выберите резюме из списка и добавьте ссылку на вакансию.</p>
      </section>
      <AiStatus/>
      <div className="workflow">
        <div className="source-grid">
          <section className="source-card" aria-labelledby="resume-heading">
            <div className="section-heading"><span className="step">01</span><h2 id="resume-heading">Ваше резюме из hh.ru</h2><Icon name="list"/></div>
            <div className="upload-area">
              <strong>Сначала авторизация в hh.ru</strong>
              <p>Источником опыта будет выбранное резюме из вашего аккаунта.</p>
              <a className="button secondary" href="https://hh.ru/account/login" target="_blank" rel="noopener noreferrer"><Icon name="link"/>Войти в hh.ru<span className="sr-only"> (новая вкладка)</span></a>
              <button type="button" className="button resume-picker" disabled aria-describedby="hh-resume-unavailable"><Icon name="list"/>Выбрать резюме из списка</button>
            </div>
            <p id="hh-resume-unavailable" className="hh-picker-notice" role="status"><strong>Подключение hh.ru ещё не готово.</strong> Сейчас ссылка открывает настоящий сайт hh.ru, но не авторизует JobMatch. Выбор резюме и адаптация станут доступны после подключения безопасной авторизации и получения списка резюме. Пароль hh.ru в JobMatch вводить не нужно.</p>
          </section>
          <section className="source-card" aria-labelledby="vacancy-heading" aria-busy={!!busy.vacancy}>
            <div className="section-heading"><span className="step">02</span><h2 id="vacancy-heading">Ваша вакансия</h2><Icon name="link"/></div>
            <div className="vacancy-form">
              <label htmlFor="vacancy-url">Ссылка на вакансию</label>
              <input id="vacancy-url" type="url" inputMode="url" autoComplete="off" placeholder="https://company.ru/careers/vacancy" value={url} onChange={event => {cancel('vacancy'); setUrl(event.target.value); setVacancy(null); invalidateResult();}} onKeyDown={event => {if (event.key === 'Enter' && url.trim()) {event.preventDefault(); void loadVacancy();}}} aria-describedby="vacancy-hint"/>
              <p id="vacancy-hint">Загрузим название и требования с публичной страницы. Интеграция с hh.ru пока не подключена.</p>
              <button className="button secondary" disabled={!url.trim() || !!busy.vacancy} onClick={() => void loadVacancy()}><Icon name="link"/>{busy.vacancy ? 'Загружаем…' : 'Загрузить вакансию'}</button>
              {vacancy && <div className="vacancy-loaded" role="status"><Icon name="check"/><div><strong>{vacancy.title}</strong>{vacancy.company && <span>{vacancy.company}</span>}</div></div>}
            </div>
            {error('vacancy')}
          </section>
        </div>
        <section className="adapt-row" aria-labelledby="adapt-heading" aria-busy={!!busy.adapt}>
          <div className="adapt-description"><span className="step">03</span><div><h2 id="adapt-heading">Теперь соединим главное</h2><p>Название, навыки и сопроводительное письмо под вакансию.</p></div></div>
          <button className="button primary" disabled={!resume || !vacancy || !!busy.vacancy || !!busy.adapt} onClick={() => void adapt()}><Icon name="spark"/>{busy.adapt ? 'Адаптируем резюме…' : 'Адаптировать резюме'}<span aria-hidden="true">↗</span></button>
        </section>
        {error('adapt')}
      </div>
      <section className={`result-section ${result ? 'has-result' : ''}`} aria-labelledby="result-heading">
        <div className="result-header">
          <div className="result-title"><span className="step">04</span><div><h2 id="result-heading">Резюме для отклика</h2><p>{result ? (result.mode === 'ai' ? 'ИИ-адаптация завершена' : 'Автоматическая адаптация') : 'Появится здесь после адаптации'}</p></div></div>
        </div>
        {result ? <div className="result-grid">
          <article className="resume-preview"><div className="document-label">АДАПТИРОВАННОЕ РЕЗЮМЕ</div><h3>{result.title}</h3><pre>{result.text}</pre>{result.adaptationNote && <p>{result.adaptationNote}</p>}</article>
          <div className="cover-letter"><div className="document-label">ФИНАЛЬНЫЙ ШТРИХ</div><h3>Сопроводительное письмо</h3><p>Выделите и скопируйте текст письма для отклика.</p><label className="sr-only" htmlFor="cover-letter">Текст сопроводительного письма</label><textarea id="cover-letter" readOnly value={result.coverLetter} rows={14}/><div className="manual-note"><strong>Дальше на hh.ru</strong><p>Пока hh.ru не подключён, перенос текста резюме и отправка отклика с этим письмом выполняются вручную в вашем аккаунте.</p></div></div>
        </div> : <div className="result-placeholder"><span className="preview-sheet" aria-hidden="true"><i/><i/><i/><i/></span><p>Одно резюме. Одна вакансия.<br/><strong>Всё нужное для вашего отклика.</strong></p></div>}
      </section>
    </main>
    <footer><span>JobMatch <span className="footer-dot">·</span> Меньше рутины. Больше возможностей.</span><span>Резюме из hh.ru станет доступно после подключения авторизации. Результат хранится только во вкладке.</span></footer>
  </div>;
}
