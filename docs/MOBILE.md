# igo on Android and iOS

igo's phone apps are the same web app wrapped with [Capacitor](https://capacitorjs.com). The `android/` and `ios/` folders are the native projects; everything igo does still lives in `src/`.

## Android without a computer

Every pull request and every merge to `main` builds an Android app on GitHub (`.github/workflows/android.yml`). To install it on an Android phone:

1. Open the repo on GitHub, tap **Actions**, then the latest green **Android build** run.
2. Under **Artifacts**, download `igo-debug-apk` (a zip) and unzip it.
3. Open `app-debug.apk` and allow installing from this source when asked.

This is a test build, not a store build. iPhones can't install it; iOS needs a Mac.

## Build on your computer

You need Node 22 and:
- **Android:** [Android Studio](https://developer.android.com/studio) (any OS).
- **iOS:** a Mac with Xcode.

```sh
npm install
npm run cap:android   # builds igo, copies it into android/, opens Android Studio
npm run cap:ios       # same for iOS, opens Xcode
```

In Android Studio press Run with a phone plugged in (USB debugging on) or an emulator. In Xcode pick a simulator or your iPhone and press Run.

After any change in `src/`, run `npm run cap:sync` before building again.

## Settings

- App id: `app.igo.ethiopia` (in `capacitor.config.ts`). Change it before the first store upload; it can't be changed after.
- Supabase keys come from `.env.local` at build time, the same as the website.
- The service worker is skipped inside the apps; they ship every file already.

## Not done yet

- App icon and splash screen (still Capacitor's defaults).
- Calendar export (.ics) uses a browser download, which may not work inside the apps.
- Store listings, signing keys and privacy policy.
