import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Android's back button: runs `goBack` and, when it returns false (already on
 * the first screen), closes the app. Does nothing on the website or iOS.
 */
export function useBackButton(goBack: () => boolean) {
  const latest = useRef(goBack);
  latest.current = goBack;

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    const listener = App.addListener('backButton', () => {
      if (!latest.current()) void App.exitApp();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, []);
}
