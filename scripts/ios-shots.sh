#!/bin/bash
# Screenshots igo on the booted iPhone simulator while scripts/ios-tour.js taps through it.
# Usage: scripts/ios-shots.sh UDID OUT_DIR
set -euo pipefail
UDID=$1
OUT=$2
APP=app.igo.ethiopia
# One name per tour step, in order; the first is the screen the app opens on.
NAMES=(01-trip-list 02-new-trip-form 03-form-creator 04-form-scrolled 05-day-1 06-day-1-scrolled
  07-before-you-go 08-places 09-country 10-trip-menu 11-trip-list-after)

mkdir -p "$OUT"
xcrun simctl ui "$UDID" appearance light
xcrun simctl launch "$UDID" "$APP"
sleep 10
for i in "${!NAMES[@]}"; do
  if [ "$i" -gt 0 ]; then
    # Dark and back to light tells the tour to take its next step.
    xcrun simctl ui "$UDID" appearance dark
    sleep 1
    xcrun simctl ui "$UDID" appearance light
    sleep 3
  fi
  xcrun simctl io "$UDID" screenshot "$OUT/${NAMES[$i]}.png"
done

# The tour runs once, so a relaunch in dark mode opens the app as a user would see it.
xcrun simctl ui "$UDID" appearance dark
xcrun simctl terminate "$UDID" "$APP"
xcrun simctl launch "$UDID" "$APP"
sleep 8
xcrun simctl io "$UDID" screenshot "$OUT/12-dark.png"
