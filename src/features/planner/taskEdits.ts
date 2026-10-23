import type { Spot, Stop, Task, Trip } from '../../types';
import { newId } from '../../utils/id';
import { addDays, daysBetween, fromMinutes, toMinutes } from '../../utils/dates';

/**
 * Saves the traveler's changes to a task. Their own tasks change in place. An igo task
 * becomes the traveler's own copy and the original is hidden, so the change survives
 * every rebuild of the plan (new dates, new interests, a sync from another phone) and
 * the copy keeps its tick.
 */
export function saveTaskEdit(trip: Trip, original: Task, edited: Task, makeId: () => string = () => newId('task')): Trip {
  if (original.source === 'user') {
    return { ...trip, customTasks: trip.customTasks.map((t) => (t.id === original.id ? { ...edited, id: original.id, source: 'user' } : t)) };
  }
  const copy: Task = { ...edited, id: makeId(), source: 'user', replaces: original.id };
  return {
    ...trip,
    customTasks: [...trip.customTasks, copy],
    hiddenIds: trip.hiddenIds.includes(original.id) ? trip.hiddenIds : [...trip.hiddenIds, original.id],
    doneIds: trip.doneIds.includes(original.id) ? [...trip.doneIds, copy.id] : trip.doneIds,
  };
}

/** Drops the traveler's copy and brings back igo's version of the task. */
export function resetTask(trip: Trip, taskId: string): Trip {
  const copy = trip.customTasks.find((t) => t.id === taskId);
  if (!copy?.replaces) return trip;
  return {
    ...trip,
    customTasks: trip.customTasks.filter((t) => t.id !== taskId),
    hiddenIds: trip.hiddenIds.filter((id) => id !== copy.replaces),
    doneIds: trip.doneIds.filter((id) => id !== taskId),
  };
}

/** igo tasks still standing in for an edited copy: hidden, but not by the traveler's choice. */
function replaced(trip: Trip): Set<string> {
  return new Set(trip.customTasks.flatMap((t) => (t.replaces ? [t.replaces] : [])));
}

/** Tasks the traveler hid themselves, which "Show hidden" brings back. */
export function hiddenByTraveler(trip: Trip): string[] {
  const stand = replaced(trip);
  return trip.hiddenIds.filter((id) => !stand.has(id));
}

/** Brings back hidden tasks, but not igo's versions of tasks the traveler edited. */
export function restoreHidden(trip: Trip): Trip {
  const stand = replaced(trip);
  return { ...trip, hiddenIds: trip.hiddenIds.filter((id) => stand.has(id)) };
}

/** The plan task an edited copy stands in for, split into its day and what it is. */
function origin(task: Task): { date: string; key: string } | null {
  const m = /^auto:(\d{4}-\d{2}-\d{2}):(.+)$/.exec(task.replaces ?? task.id);
  return m ? { date: m[1]!, key: m[2]! } : null;
}

/** Tasks whose day and time come from the flights or a festival's set date. */
export function followsFlight(task: Task): boolean {
  return /^(land|flight|connect|fest-)/.test(origin(task)?.key ?? '');
}

/** Leaving for the airport stays on the day the flight leaves. */
function dayLocked(task: Task): boolean {
  return followsFlight(task) || /^airport/.test(origin(task)?.key ?? '');
}

/** The tasks of a day that moves to another city. Moving one moves the whole journey. */
const ROUTE_KEYS = /^(move-out|move|move-in|settle-walk|travel-broll)$/;

/** The stop on the route a moving-day task belongs to. */
export function routeStop(trip: Trip, task: Task): Stop | undefined {
  const o = origin(task);
  return o && ROUTE_KEYS.test(o.key) ? trip.stops.find((s) => s.date === o.date) : undefined;
}

/** The id of the place behind a place task ("Shoot X" or "Leave for X"). */
function spotIdOf(task: Task): string | undefined {
  return /^(?:spot|go)-(.+)$/.exec(origin(task)?.key ?? '')?.[1];
}

/** For the traveler's copy of a place task: which of the place's tasks it stands in for. */
export function placeKeyOf(task: Task): { key: string; spotId: string } | undefined {
  if (!task.replaces) return undefined;
  const key = origin(task)?.key;
  const spotId = spotIdOf(task);
  return key && spotId ? { key, spotId } : undefined;
}

/** The place a place task is for: one of the traveler's own, or one igo picked. */
export function spotOf(task: Task, trip: Trip, picked: Spot[]): Spot | undefined {
  const id = spotIdOf(task);
  return id ? (trip.spots.find((s) => s.id === id) ?? picked.find((s) => s.id === id)) : undefined;
}

const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/**
 * Days a task can move to, from the trip's days and the city each is in. A moving day's
 * tasks move between the stops either side; a place stays in its city, on the weekdays
 * it is open; flight and festival tasks stay put.
 */
export function allowedDays(trip: Trip, task: Task, days: { date: string; cityId: string }[], spot?: Spot): string[] {
  const all = days.map((d) => d.date);
  if (dayLocked(task)) return [task.date];
  const stop = routeStop(trip, task);
  if (stop) {
    // Later journeys move along by the same number of days, so the last one must stay inside the trip.
    const after = trip.stops.filter((s) => s.date < stop.date).map((s) => s.date).sort().at(-1) ?? trip.startDate;
    const last = trip.stops.map((s) => s.date).sort().at(-1) ?? stop.date;
    const latest = addDays(trip.endDate, -daysBetween(stop.date, last));
    return all.filter((d) => d > after && d <= latest);
  }
  if (spot) {
    const city = spot.cityId ?? trip.cityId;
    return days.filter((d) => d.cityId === city && (!spot.weekdays || spot.weekdays.includes(weekday(d.date)))).map((d) => d.date);
  }
  return all;
}

const sameContent = (a: Task, b: Task) =>
  a.title === b.title && (a.time ?? '') === (b.time ?? '') && (a.detail ?? '') === (b.detail ?? '') && a.category === b.category;

/** igo's own task for `key` on `date`, as the rebuilt plan will have it. */
const planTask = (base: Task, key: string, date: string): Task => {
  const { replaces: _r, ...rest } = base;
  return { ...rest, id: `auto:${date}:${key}`, date, source: 'auto' };
};

/**
 * Saves a change to a task and moves what hangs on it. Moving a travel day's task moves
 * the stop on the route, so checkout, the journey and check-in move together and the city
 * changes on the new day. Moving a place moves both its tasks (leaving and the visit) by
 * pinning the place to the new day, where igo times it by that day's light. Anything else
 * is saved as the traveler's own task (see saveTaskEdit).
 */
export function moveTask(
  trip: Trip,
  original: Task,
  edited: Task,
  spot?: Spot,
  partner?: Task,
  makeId: () => string = () => newId('task'),
): Trip {
  const o = origin(original);
  const stop = routeStop(trip, original);
  const routeMove = stop && edited.date !== stop.date;
  const placeMove = spot && edited.date !== original.date;
  if (o && (routeMove || placeMove)) {
    // Drop an earlier copy: the plan task on the new day takes over.
    let next = original.replaces ? resetTask(trip, original.id) : trip;
    if (routeMove) {
      // This journey and every later one move by the same number of days, but never past the end of the trip.
      const shift = daysBetween(stop.date, edited.date);
      if (edited.date <= trip.startDate || next.stops.some((s) => s.date >= stop.date && addDays(s.date, shift) > trip.endDate)) return trip;
      if (next.stops.some((s) => s.date < stop.date && s.date >= edited.date)) return trip;
      const shifted = new Set(next.stops.filter((s) => s.date >= stop.date).map((s) => s.date));
      next = { ...next, stops: next.stops.map((s) => (s.date >= stop.date ? { ...s, date: addDays(s.date, shift) } : s)) };
      next = shiftJourneyCopies(next, shifted, shift);
    } else if (spot) {
      const pinned = { ...spot, date: edited.date };
      next = { ...next, spots: next.spots.some((s) => s.id === spot.id) ? next.spots.map((s) => (s.id === spot.id ? pinned : s)) : [...next.spots, pinned] };
    }
    // Wording or notes changed as well: keep them on the task in its new place. A place's time comes from the new day's light.
    const kept = placeMove ? { ...edited, time: original.time } : edited;
    if (sameContent(original, kept)) return next;
    return saveTaskEdit(next, planTask(original, o.key, edited.date), kept, makeId);
  }
  let next = saveTaskEdit(trip, original, edited, makeId);
  // Moving a visit later or earlier moves leaving for it by as much, and the other way round.
  if (partner?.time && original.time && edited.time && edited.time !== original.time && edited.date === original.date) {
    const shift = toMinutes(edited.time) - toMinutes(original.time);
    const time = fromMinutes(Math.min(Math.max(toMinutes(partner.time) + shift, 0), 24 * 60 - 1));
    next = saveTaskEdit(next, partner, { ...partner, time }, makeId);
  }
  return next;
}

/** The traveler's edited copies of tasks on moving days go along when those journeys move. */
function shiftJourneyCopies(trip: Trip, dates: Set<string>, shift: number): Trip {
  const moves = new Map<string, string>();
  const customTasks = trip.customTasks.map((t) => {
    const o = t.replaces ? origin(t) : null;
    if (!o || !ROUTE_KEYS.test(o.key) || !dates.has(o.date)) return t;
    const date = addDays(o.date, shift);
    const replaces = `auto:${date}:${o.key}`;
    moves.set(t.replaces!, replaces);
    return { ...t, date, replaces };
  });
  if (!moves.size) return trip;
  return { ...trip, customTasks, hiddenIds: trip.hiddenIds.map((id) => moves.get(id) ?? id) };
}

/** The other half of a place task: leaving for a place, or the visit itself. */
export function partnerOf(task: Task, dayTasks: Task[]): Task | undefined {
  const o = origin(task);
  const id = spotIdOf(task);
  if (!o || !id) return undefined;
  const key = o.key.startsWith('go-') ? `spot-${id}` : `go-${id}`;
  return dayTasks.find((t) => origin(t)?.key === key && t.date === task.date);
}

/**
 * The first version of task editing saved a moved journey or place as a loose copy on the
 * new day, which left the route and the rest of its tasks behind. Such copies are dropped
 * and igo's tasks come back, so the plan is whole again and the move can be redone.
 */
export function dropLooseCopies(trip: Trip): Trip {
  const loose = trip.customTasks.filter((t) => {
    const o = t.replaces ? origin(t) : null;
    return o && t.date !== o.date && (ROUTE_KEYS.test(o.key) || /^(spot|go)-/.test(o.key));
  });
  return loose.reduce((next, t) => resetTask(next, t.id), trip);
}
