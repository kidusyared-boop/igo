import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.igo.ethiopia',
  appName: 'igo',
  webDir: 'dist',
  backgroundColor: '#14213d',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#14213d',
      showSpinner: false,
    },
  },
};

export default config;
