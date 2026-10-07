// Composition root: picks the backend and starts the app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Backend } from './app/backend';
import { firebaseConfig, vapidPublicKey } from './app/firebaseConfig';
import { localBackend } from './app/localBackend';
import { browserPush } from './services/push';
import { captureIncomingQuote, incomingQuote } from './services/incomingQuote';
import { watchForUpdates } from './services/updates';
import { App } from './ui/App';
import './ui/styles.css';

// Before anything else (sign-in may redirect): keep a quote sent in the link.
captureIncomingQuote();

async function chooseBackend(): Promise<Backend> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // VITE_LOCAL_ONLY=1 previews the app on on-device storage, without signing in.
  if (firebaseConfig && !import.meta.env.VITE_LOCAL_ONLY) {
    // Loaded on demand so on-device mode never downloads Firebase.
    const { firebaseBackend } = await import('./app/firebaseBackend');
    return firebaseBackend(firebaseConfig, vapidPublicKey, timeZone);
  }
  return localBackend(localStorage, timeZone);
}

void chooseBackend().then(backend => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App backend={backend} makePush={browserPush} watchUpdates={import.meta.env.PROD ? watchForUpdates(__BUILD__) : undefined} incomingQuote={incomingQuote()} />
    </StrictMode>,
  );
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });
}
