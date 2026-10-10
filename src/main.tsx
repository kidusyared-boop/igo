import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './i18n';
import { PlaceChecksProvider } from './hooks/usePlaceChecks';
import './styles.css';
import { Capacitor } from '@capacitor/core';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <LanguageProvider>
        <PlaceChecksProvider>
          <App />
        </PlaceChecksProvider>
      </LanguageProvider>
    </StrictMode>,
  );
}

// The phone apps already ship every file, so they skip the service worker.
if ('serviceWorker' in navigator && import.meta.env.PROD && window.location.protocol !== 'blob:' && !Capacitor.isNativePlatform()) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Offline support is optional; the app works without it.
  });
}
