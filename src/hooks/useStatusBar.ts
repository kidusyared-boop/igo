import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Keeps the phone's clock and battery icons readable: light icons over the dark photo on
 * the opening screen, and icons that match the light or dark theme everywhere else.
 */
export function useStatusBar(overDarkHero: boolean) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const dark = overDarkHero || window.matchMedia('(prefers-color-scheme: dark)').matches;
    const color = overDarkHero ? '#1d2a4d' : dark ? '#0c1322' : '#eef1f5';
    void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
    // Phones that draw the app under the status bar (Android 15 and later) ignore the color.
    if (Capacitor.getPlatform() === 'android') void StatusBar.setBackgroundColor({ color }).catch(() => {});
  }, [overDarkHero]);
}
