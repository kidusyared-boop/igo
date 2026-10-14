import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import type { Trip } from '../types';
import { buildReminders } from '../features/reminders/buildReminders';
import { generatePlan } from '../features/planner/generatePlan';
import { closedPlaces } from '../services/placeChecks';
import { onReminderTap, remindersAvailable, scheduleReminders, useReminderChoice } from '../services/reminders';
import { usePlaceChecks } from './usePlaceChecks';
import { useT } from '../i18n';

/**
 * Keeps the phone's reminders in step with the trips: after every change,
 * and each time the app comes back to the front (which also moves the
 * 60-reminder window forward). Tapping a reminder opens its trip.
 */
export function useReminders(trips: Trip[], openTrip: (tripId: string) => void) {
  const on = useReminderChoice() === 'on';
  const { checks } = usePlaceChecks();
  const t = useT();
  const [resumed, setResumed] = useState(0);
  const open = useRef(openTrip);
  open.current = openTrip;

  useEffect(() => {
    if (!remindersAvailable()) return;
    const resume = App.addListener('resume', () => setResumed((n) => n + 1));
    const stopTaps = onReminderTap((id) => open.current(id));
    return () => {
      void resume.then((l) => l.remove());
      stopTaps();
    };
  }, []);

  useEffect(() => {
    if (!on || !remindersAvailable()) return;
    // Waits for a pause in edits, so ticking off several to-dos reschedules once.
    const timer = setTimeout(() => {
      const closed = closedPlaces(checks);
      const list = buildReminders(trips, (trip) => generatePlan(trip, closed), new Date(), t);
      scheduleReminders(list).catch(() => {
        // A failed sync leaves the earlier reminders in place; the next change retries.
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [on, trips, checks, t, resumed]);
}
