// Composition root: picks the backend and starts the app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Backend } from './app/backend';
import { firebaseConfig, vapidPublicKey } from './app/firebaseConfig';
import { localBackend } from './app/localBackend';
import { browserPush } from './services/push';
import { watchForUpdates } from './services/updates';
import { App } from './ui/App';
import './ui/styles.css';

async function chooseBackend(): Promise<Backend> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (firebaseConfig) {
    // Loaded on demand so on-device mode never downloads Firebase.
    const { firebaseBackend } = await import('./app/firebaseBackend');
    return firebaseBackend(firebaseConfig, vapidPublicKey, timeZone);
  }
  return localBackend(localStorage, timeZone);
}

void chooseBackend().then(backend => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App backend={backend} makePush={browserPush} watchUpdates={import.meta.env.PROD ? watchForUpdates(__BUILD__) : undefined} />
    </StrictMode>,
  );
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });
}
