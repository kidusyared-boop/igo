import type { Task, Trip, TripPlan } from '../../types';
import { findCity } from '../../data/countries';
import { addDays, toMinutes } from '../../utils/dates';
import { zonedToUtc } from '../../utils/timezone';
import type { TFunction } from '../../i18n';

export interface Reminder {
  /** Stable across rebuilds, so rescheduling replaces rather than duplicates. */
  id: number;
  at: Date;
  title: string;
  body: string;
  tripId: string;
}

/** How long before a timed to-do its reminder goes off. */
export const LEAD_MINUTES = 30;
/** Local trip time for the evening heads-up about the next day. */
const EVENING = '20:00';
/** Device time for reminders about undated prep work. */
const PREP_HOUR = 9;
/** A to-do starting this soon after the last one reminded gets no reminder of its own: you are already on the move. */
const CHAIN_MINUTES = 60;
/** iPhone keeps at most 64 pending; the next sync tops the list back up. */
export const MAX_PENDING = 60;

/** A positive 31-bit number from a string, as both phones need integer ids. */
export function reminderId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647 || 1;
}

const open = (trip: Trip) => {
  const done = new Set(trip.doneIds);
  const hidden = new Set(trip.hiddenIds);
  return (task: Task) => !done.has(task.id) && !hidden.has(task.id);
};

function preview(timed: Task[], t: TFunction): string {
  const shown = timed.slice(0, 3).map((task) => `${task.time} ${task.title}`);
  const more = timed.length - shown.length;
  return more > 0 ? `${shown.join('\n')}\n${t('remind.more', { n: more })}` : shown.join('\n');
}

/**
 * Every reminder still ahead for these trips: each timed to-do LEAD_MINUTES
 * before it starts (unless it follows straight on from the one before), an
 * evening heads-up for each day after the first, and prep to-dos at 9:00 on
 * the day they are due. Done, hidden and example
 * trips' to-dos are left out. Sorted by time and capped at MAX_PENDING.
 */
export function buildReminders(
  trips: Trip[],
  planFor: (trip: Trip) => TripPlan,
  now: Date,
  t: TFunction,
): Reminder[] {
  const out: Reminder[] = [];
  const push = (key: string, at: Date, title: string, body: string, tripId: string) => {
    if (at.getTime() > now.getTime()) out.push({ id: reminderId(key), at, title, body, tripId });
  };

  for (const trip of trips) {
    if (trip.id.startsWith('example')) continue;
    const plan = planFor(trip);
    const isOpen = open(trip);
    const zoneOf = (cityId: string) => findCity(trip.countryCode, cityId)?.timeZone;

    // Prep due on the same day goes in one reminder.
    const prepByDate = new Map<string, Task[]>();
    for (const task of plan.preTrip.filter(isOpen)) prepByDate.set(task.date, [...(prepByDate.get(task.date) ?? []), task]);
    for (const [date, tasks] of prepByDate) {
      const [y, m, d] = date.split('-').map(Number) as [number, number, number];
      const at = new Date(y, m - 1, d, PREP_HOUR);
      if (tasks.length === 1) push(`${trip.id}|${tasks[0]!.id}`, at, t('remind.prep', { title: tasks[0]!.title }), trip.name, trip.id);
      else push(`${trip.id}|pre|${date}`, at, t('remind.prepMany', { n: tasks.length }), tasks.map((x) => x.title).join('\n'), trip.id);
    }

    plan.days.forEach((day, i) => {
      const zone = zoneOf(day.cityId);
      if (!zone) return;
      const city = findCity(trip.countryCode, day.cityId)?.name ?? '';
      const tasks = day.tasks.filter(isOpen);
      let previous: number | null = null;
      const timed = tasks.filter((task) => task.time).sort((x, y) => toMinutes(x.time!) - toMinutes(y.time!));
      for (const task of timed) {
        const minutes = toMinutes(task.time!);
        if (previous !== null && minutes - previous < CHAIN_MINUTES) continue;
        previous = minutes;
        const start = zonedToUtc(day.date, task.time!, zone);
        push(`${trip.id}|${task.id}`, new Date(start.getTime() - LEAD_MINUTES * 60_000), task.title, t('remind.at', { time: task.time!, city }), trip.id);
      }
      // The first day's plan starts on arrival, so a heads-up the night before would reach you at home.
      if (i > 0 && timed.length) {
        push(`${trip.id}|eve|${day.date}`, zonedToUtc(addDays(day.date, -1), EVENING, zone), t('remind.tomorrow', { city }), preview(timed, t), trip.id);
      }
    });
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PENDING);
}
