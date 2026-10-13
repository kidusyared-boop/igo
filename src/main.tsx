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
import { ErrorBoundary } from './components/ErrorBoundary';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      {/* Last resort if the app itself breaks; each screen has its own, friendlier one. */}
      <ErrorBoundary
        fallback={(error) => (
          <section className="panel crash" role="alert">
            <h2>Something went wrong</h2>
            <p>Your trips are safe. Restart igo. If it keeps happening, send a screenshot of this message.</p>
            <pre className="crash-detail">{error.message}</pre>
            <button type="button" className="btn primary" onClick={() => window.location.reload()}>Restart igo</button>
          </section>
        )}
      >
      <LanguageProvider>
        <PlaceChecksProvider>
          <App />
        </PlaceChecksProvider>
      </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

// The phone apps already ship every file, so they skip the service worker.
if ('serviceWorker' in navigator && import.meta.env.PROD && window.location.protocol !== 'blob:' && !Capacitor.isNativePlatform()) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Offline support is optional; the app works without it.
  });
}
