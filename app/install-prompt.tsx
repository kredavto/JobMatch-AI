'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
};

function subscribe(callback: () => void) {
  const standalone = window.matchMedia('(display-mode: standalone)');
  window.addEventListener('resize', callback);
  standalone.addEventListener('change', callback);
  return () => {
    window.removeEventListener('resize', callback);
    standalone.removeEventListener('change', callback);
  };
}

function platform() {
  if (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?: boolean}).standalone) return 'installed';
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  return window.matchMedia('(max-width: 700px)').matches ? 'mobile' : 'desktop';
}

export default function InstallPrompt() {
  const device = useSyncExternalStore(subscribe, platform, () => 'desktop');
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [details, setDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function available(event: Event) {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    }
    function complete() {setInstalled(true); setInstallEvent(null);}
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', complete);
    return () => {
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);

  async function install() {
    if (!installEvent || device === 'ios') {setDetails(true); return;}
    setPending(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch { /* Browser may withdraw installation eligibility; show manual steps. */ }
    finally {setInstallEvent(null); setPending(false); setDetails(true);}
  }

  if (device === 'desktop' || device === 'installed' || dismissed || installed) return null;
  return <aside className="install-notice" aria-label="Установка JobMatch">
    <div className="install-summary"><div><strong>JobMatch на главном экране</strong><p>Запускайте приложение одним нажатием на значок.</p></div>
      <button className="install-close" aria-label="Скрыть подсказку об установке" onClick={() => setDismissed(true)}>×</button>
    </div>
    <button className="button secondary install-action" disabled={pending} onClick={() => void install()} aria-describedby={details ? 'install-instructions' : undefined}>{pending ? 'Открываем установку…' : 'Скачать приложение на смартфон'}</button>
    {details && <p id="install-instructions" className="install-instructions" role="status">{device === 'ios'
      ? <>Откройте эту страницу в Safari: <strong>Поделиться → На экран Домой → Добавить</strong>. Если есть переключатель «Открывать как веб-приложение», оставьте его включённым.</>
      : <>Если системное окно не появилось, откройте меню браузера <strong>⋮ → Установить приложение</strong> или <strong>Добавить на главный экран</strong>. Во встроенном браузере сначала выберите «Открыть в Chrome». Названия пунктов зависят от браузера.</>} После установки открывайте JobMatch с главного экрана. Для работы нужен интернет; закрытие приложения не сохраняет загруженное резюме.</p>}
  </aside>;
}
