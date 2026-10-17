import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import type { Trip, TripPlan } from '../types';
import { calendarTasks, taskTimes } from './ics';

const KEY = (tripId: string) => `igo.calendar.${tripId}`;

export interface PhoneEvent {
  title: string;
  description?: string;
  isAllDay: boolean;
  startDate: number;
  endDate?: number;
}

/** Only the phone apps can write to the phone's calendar; the website shares a file instead. */
export function phoneCalendarAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/** The trip's tasks as calendar events, matching what the .ics file holds. */
export function phoneEvents(plan: TripPlan, timeZone: string): PhoneEvent[] {
  return calendarTasks(plan).map((task) => {
    const times = taskTimes(task, timeZone);
    const base = { title: task.title, ...(task.detail ? { description: task.detail } : {}) };
    if (times) return { ...base, isAllDay: false, startDate: times.start.getTime(), endDate: times.end.getTime() };
    // Whole-day tasks: the plugin turns any moment of the local day into that calendar day.
    const [y = 0, m = 1, d = 1] = task.date.split('-').map(Number);
    return { ...base, isAllDay: true, startDate: new Date(y, m - 1, d, 12).getTime() };
  });
}

function savedIds(tripId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY(tripId)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveIds(tripId: string, ids: string[]): void {
  try {
    if (ids.length) localStorage.setItem(KEY(tripId), JSON.stringify(ids));
    else localStorage.removeItem(KEY(tripId));
  } catch {
    // Storage full or blocked: the events are still in the calendar, they just won't be replaced next time.
  }
}

export type AddResult = { status: 'added' | 'updated'; count: number } | { status: 'denied' };

/**
 * Writes the trip into the phone's default calendar. Adding the same trip
 * again replaces the events from last time instead of doubling them.
 */
export async function addTripToPhoneCalendar(trip: Trip, plan: TripPlan, timeZone: string): Promise<AddResult> {
  const { result } = await CapacitorCalendar.requestFullCalendarAccess();
  if (result !== 'granted') return { status: 'denied' };
  const previous = savedIds(trip.id);
  if (previous.length) await CapacitorCalendar.deleteEventsById({ ids: previous }).catch(() => {});
  const ids: string[] = [];
  try {
    for (const event of phoneEvents(plan, timeZone)) {
      const { id } = await CapacitorCalendar.createEvent(event);
      if (id) ids.push(id);
    }
  } finally {
    saveIds(trip.id, ids);
  }
  return { status: previous.length ? 'updated' : 'added', count: ids.length };
}

/** Removes a deleted trip's events from the phone's calendar, if igo added any. */
export async function removeTripFromPhoneCalendar(tripId: string): Promise<void> {
  const ids = savedIds(tripId);
  if (!ids.length || !phoneCalendarAvailable()) return;
  await CapacitorCalendar.deleteEventsById({ ids }).catch(() => {});
  saveIds(tripId, []);
}
