#!/bin/bash
# Screenshots igo on the booted iPhone simulator while scripts/ios-tour.js taps through it.
# Usage: scripts/ios-shots.sh UDID OUT_DIR
set -euo pipefail
UDID=$1
OUT=$2
APP=app.igo.ethiopia
# Must match ios-tour.js. LOAD_S is roughly how long the page takes to start after launch.
START_S=4
STEP_S=10
LOAD_S=3
NAMES=(01-trip-list 02-new-trip-form 03-form-creator 04-form-scrolled 05-day-1 06-day-1-scrolled
  07-before-you-go 08-places 09-country 10-trip-menu 11-trip-list-after)

mkdir -p "$OUT"
xcrun simctl launch "$UDID" "$APP"
t0=$(date +%s)
for i in "${!NAMES[@]}"; do
  # Halfway through each step, so a slow start or tap still lands in the shot.
  at=$((LOAD_S + START_S + i * STEP_S + STEP_S / 2))
  now=$(($(date +%s) - t0))
  [ "$at" -gt "$now" ] && sleep $((at - now))
  xcrun simctl io "$UDID" screenshot "$OUT/${NAMES[$i]}.png"
done

# The tour runs once, so a relaunch in dark mode opens the app as a user would see it.
sleep 6
xcrun simctl ui "$UDID" appearance dark
xcrun simctl terminate "$UDID" "$APP"
xcrun simctl launch "$UDID" "$APP"
sleep 8
xcrun simctl io "$UDID" screenshot "$OUT/12-dark.png"
