import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './i18n';
import { PlaceChecksProvider } from './hooks/usePlaceChecks';
// Fonts ship inside the app so it looks the same with no internet.
import '@fontsource/big-shoulders-display/600';
import '@fontsource/big-shoulders-display/700';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/ibm-plex-sans/400';
import '@fontsource/ibm-plex-sans/500';
import '@fontsource/ibm-plex-sans/600';
import '@fontsource/ibm-plex-mono/500';
import '@fontsource/ibm-plex-mono/600';
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
