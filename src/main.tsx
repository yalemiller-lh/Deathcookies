// Composition root: picks the backend and starts the app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Backend } from './app/backend';
import { localBackend } from './app/localBackend';
import { browserPush } from './services/push';
import { App } from './ui/App';
import './ui/styles.css';

async function chooseBackend(): Promise<Backend> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return localBackend(localStorage, timeZone);
}

void chooseBackend().then(backend => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App backend={backend} makePush={browserPush} />
    </StrictMode>,
  );
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });
}
