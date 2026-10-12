import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { reminderId, type Reminder } from '../features/reminders/buildReminders';

const KEY = 'igo.reminders.v1';
/** The sample sent on turning reminders on, kept apart from the trip reminders. */
const SAMPLE_ID = reminderId('igo|sample');
type Choice = 'on' | 'off' | 'later';

/** Reminders need the phone app; the website can't wake you up. */
export const remindersAvailable = () => Capacitor.isNativePlatform();

const listeners = new Set<() => void>();

function read(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' || v === 'later' ? v : null;
  } catch {
    return null;
  }
}

function save(choice: Choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // The choice lasts until the app closes.
  }
  listeners.forEach((l) => l());
}

/** The traveler's choice: on, off, asked to decide later, or never asked (null). */
export function useReminderChoice(): Choice | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
}

export const askLater = () => save('later');

/**
 * Asks the phone for permission and shows a sample a few seconds later, so the
 * traveler sees reminders work. False when the traveler or the phone says no.
 */
export async function turnOnReminders(sample: { title: string; body: string }): Promise<boolean> {
  const { display } = await LocalNotifications.requestPermissions();
  if (display !== 'granted') return false;
  save('on');
  await LocalNotifications.schedule({
    notifications: [{ id: SAMPLE_ID, ...sample, schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, smallIcon: 'ic_stat_igo', iconColor: '#e8a317' }],
  }).catch(() => {});
  return true;
}

export async function turnOffReminders(): Promise<void> {
  save('off');
  await clearPending();
}

async function clearPending() {
  const { notifications } = await LocalNotifications.getPending();
  const ids = notifications.filter(({ id }) => id !== SAMPLE_ID).map(({ id }) => ({ id }));
  if (ids.length) await LocalNotifications.cancel({ notifications: ids });
}

/** Replaces every pending reminder with `list`. Does nothing if permission was taken away in settings. */
export async function scheduleReminders(list: Reminder[]): Promise<void> {
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') return;
  await clearPending();
  if (!list.length) return;
  await LocalNotifications.schedule({
    notifications: list.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      largeBody: r.body,
      schedule: { at: r.at, allowWhileIdle: true },
      smallIcon: 'ic_stat_igo',
      iconColor: '#e8a317',
      extra: { tripId: r.tripId },
    })),
  });
}

/** Calls `open` with the trip id when the traveler taps a reminder. */
export function onReminderTap(open: (tripId: string) => void): () => void {
  const listener = LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const tripId = (notification.extra as { tripId?: unknown } | undefined)?.tripId;
    if (typeof tripId === 'string') open(tripId);
  });
  return () => void listener.then((l) => l.remove());
}
