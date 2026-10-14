#!/bin/bash
# Installs the debug APK on the running Android emulator, then drives igo through its
# WebView with scripts/android-cdp.mjs: a screenshot of each screen, every JavaScript
# error, and the Android log.
# Usage: scripts/android-shots.sh OUT_DIR
set -u
OUT=$1
APP=app.igo.ethiopia
mkdir -p "$OUT"

adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell pm grant "$APP" android.permission.POST_NOTIFICATIONS || true
adb logcat -c
adb shell am start -n "$APP/.MainActivity"
sleep 15
adb exec-out screencap -p > "$OUT/00-phone-launch.png"
adb shell dumpsys webviewupdate | grep -m1 "Current WebView package" | tee "$OUT/webview.txt"

# The debug build lets DevTools attach to its WebView.
SOCKET=""
for _ in $(seq 1 20); do
  SOCKET=$(adb shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*' | head -1)
  [ -n "$SOCKET" ] && break
  sleep 2
done
if [ -n "$SOCKET" ]; then
  adb forward tcp:9222 "localabstract:$SOCKET"
  node scripts/android-cdp.mjs 9222 "$OUT" || echo "DevTools run failed"
else
  echo "No WebView DevTools socket found"
fi
adb exec-out screencap -p > "$OUT/99-phone-end.png"

adb logcat -d > "$OUT/logcat.txt"
grep -E "Capacitor|chromium|AndroidRuntime|FATAL" "$OUT/logcat.txt" > "$OUT/app-log.txt" || true
exit 0
