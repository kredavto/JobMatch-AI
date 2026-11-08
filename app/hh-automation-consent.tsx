'use client';

import {useId, useRef, useState} from 'react';
import {HH_CONSENT_VERSION,type HhConsent} from '../browser/consent';

type HhAutomationConsentProps = {
  /** The parent must independently verify hh.ru permission before enabling automation. */
  onEnable: (consent:HhConsent) => void | Promise<void>;
  disabled?: boolean;
};

/** Unmounted preparation for a future permitted automation flow, not an hh.ru integration. */
export default function HhAutomationConsent({onEnable, disabled = false}: HhAutomationConsentProps) {
  const id = useId();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const submitting = useRef(false);

  async function enable() {
    if (!accepted || disabled || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(false);
    try {
      await onEnable({version:HH_CONSENT_VERSION,accepted:true,acceptedAt:new Date().toISOString()});
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return <section className="hh-consent" aria-labelledby={`${id}-title`} aria-busy={pending}>
    <h2 id={`${id}-title`}>Перед включением автоматизации hh.ru</h2>
    <div id={`${id}-risk`} className="hh-consent-warning">
      <strong>Автоматизация может привести к ограничению доступа или блокировке вашего аккаунта hh.ru.</strong>
      <p>HeadHunter самостоятельно определяет допустимые способы использования сервиса. JobMatch не гарантирует, что ваш аккаунт не будет заблокирован.</p>
    </div>
    <p id={`${id}-limits`}>Ваше согласие подтверждает, что вы понимаете и принимаете этот риск. Оно не освобождает JobMatch от применимых обязательств и ответственности, не заменяет разрешение hh.ru и не разрешает обход технических ограничений.</p>
    <p><a href="https://hh.ru/account/agreement" target="_blank" rel="noopener noreferrer">Пользовательское соглашение hh.ru (откроется в новой вкладке)</a></p>
    <label className="hh-consent-choice" htmlFor={`${id}-accept`}>
      <input id={`${id}-accept`} type="checkbox" checked={accepted} disabled={pending || disabled} onChange={event => {setAccepted(event.target.checked); setError(false);}} aria-describedby={`${id}-risk ${id}-limits`}/>
      <span>Я прочитал(а) предупреждение, понимаю и принимаю риск ограничения доступа или блокировки моего аккаунта hh.ru при использовании автоматизации.</span>
    </label>
    <button type="button" disabled={!accepted || pending || disabled} onClick={() => void enable()}>{pending ? 'Включаем…' : 'Включить автоматизацию hh.ru'}</button>
    {error && <p className="hh-consent-error" role="alert">Не удалось завершить включение автоматизации. Проверьте её статус, прежде чем повторять попытку.</p>}
    <style jsx>{`
      .hh-consent { padding: 24px; border: 1px solid #d8dfd7; border-radius: 14px; background: #fff; color: #182b2a; font-size: 15px; line-height: 1.65; }
      .hh-consent h2 { margin: 0 0 18px; font-size: 20px; }
      .hh-consent p { margin: 12px 0; color: inherit; }
      .hh-consent-warning { padding: 16px; border: 1px solid #e8cc90; border-radius: 10px; background: #fff8e9; color: #573d12; }
      .hh-consent-warning p { margin-bottom: 0; }
      .hh-consent a { color: #176553; text-decoration: underline; }
      .hh-consent-choice { display: flex; align-items: flex-start; gap: 12px; margin: 22px 0; cursor: pointer; }
      .hh-consent-choice input { flex: 0 0 20px; width: 20px; height: 20px; margin: 3px 0 0; accent-color: #176553; }
      .hh-consent button { padding: 12px 18px; min-height: 44px; max-width: 100%; border: 1px solid #176553; border-radius: 9px; background: #176553; color: white; font: inherit; font-weight: 600; cursor: pointer; }
      .hh-consent button:disabled { opacity: .45; cursor: not-allowed; }
      .hh-consent :is(input, button, a):focus-visible { outline: 3px solid #378777; outline-offset: 4px; }
      .hh-consent-error { color: #8e3528; }
    `}</style>
  </section>;
}
