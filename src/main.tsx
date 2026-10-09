import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './i18n';
import './styles.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </StrictMode>,
  );
}

if ('serviceWorker' in navigator && import.meta.env.PROD && window.location.protocol !== 'blob:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Offline support is optional; the app works without it.
  });
}
