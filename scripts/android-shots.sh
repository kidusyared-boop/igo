#!/bin/bash
# Installs the debug APK on the running Android emulator, taps through igo and saves
# a screenshot of each screen plus the app's log (JavaScript errors included).
# Usage: scripts/android-shots.sh OUT_DIR
set -u
OUT=$1
APP=app.igo.ethiopia
mkdir -p "$OUT"

shot() { adb exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }
tap() {
  for _ in 1 2 3 4 5; do
    adb shell uiautomator dump /sdcard/ui.xml > /dev/null 2>&1
    adb pull /sdcard/ui.xml "$OUT/ui.xml" > /dev/null 2>&1
    if xy=$(python3 scripts/android-find.py "$OUT/ui.xml" "$1"); then
      adb shell input tap $xy
      sleep 3
      return 0
    fi
    sleep 2
  done
  echo "NOT FOUND: $1"
  return 1
}

adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell pm grant "$APP" android.permission.POST_NOTIFICATIONS || true
adb logcat -c
adb shell am start -n "$APP/.MainActivity"
sleep 20
shot 01-launch
tap "Addis and Harar" && shot 02-example-trip
tap "All trips" && shot 03-back-to-list
tap "New trip" && shot 04-new-trip-form
tap "Build my plan" && shot 05-day-1
tap "Turn on reminders" && sleep 8 && shot 06-reminders-on
adb shell cmd statusbar expand-notifications && sleep 2 && shot 07-notifications
adb shell cmd statusbar collapse
tap "Before you go" && shot 08-before-you-go
tap "Trip options" && shot 09-trip-menu
adb shell input keyevent KEYCODE_BACK && sleep 2 && shot 10-after-back

adb logcat -d > "$OUT/logcat.txt"
grep -E "Capacitor|chromium|AndroidRuntime|FATAL|igo" "$OUT/logcat.txt" > "$OUT/app-log.txt" || true
rm -f "$OUT/ui.xml"
exit 0
