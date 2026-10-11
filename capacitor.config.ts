import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.igo.ethiopia',
  appName: 'igo',
  webDir: 'dist',
  android: {
    // Android 15 draws apps under the status bar; this keeps igo's header below it.
    adjustMarginsForEdgeToEdge: 'auto',
  },
};

export default config;
