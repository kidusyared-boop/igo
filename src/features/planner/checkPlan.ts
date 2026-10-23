import type { Light, Spot, SunTimes, Task, Trip, TripPlan } from '../../types';
import { toMinutes } from '../../utils/dates';
import { generatePlan } from './generatePlan';
import { moveTask, partnerOf, resetTask, spotOf } from './taskEdits';

export type ProblemCode = 'wrongCity' | 'beforeLanding' | 'beforeCheckIn' | 'wrongLight' | 'afterAirport' | 'goAfterVisit' | 'twice' | 'routeOutside';

export interface Problem {
  code: ProblemCode;
  date: string;
  title: string;
  /** The task, or the stop, the problem is about. */
  ref: string;
  /** For wrongCity: the city the place is in. */
  cityId?: string;
}

/** What a plan task, or the traveler's copy of one, is: e.g. "move-in" or "spot-sp5". */
function keyOf(task: Task): string {
  return (task.replaces ?? task.id).replace(/^auto:\d{4}-\d{2}-\d{2}:/, '');
}

/** When in the day a place's light allows a visit, in minutes from midnight. */
function lightWindow(light: Light, sun: SunTimes | null): [number, number] {
  const rise = toMinutes(sun?.sunrise ?? '06:30');
  const set = toMinutes(sun?.sunset ?? '18:30');
  switch (light) {
    case 'sunrise': return [rise - 90, rise + 90];
    case 'sunset': return [set - 150, set + 30];
    case 'night': return [set + 30, 24 * 60 - 1];
    case 'lunch': return [toMinutes('11:00'), toMinutes('15:30')];
    case 'dinner': return [toMinutes('17:30'), toMinutes('23:00')];
    case 'any': return [rise, set];
  }
}

/**
 * Checks a built plan against the rules every schedule must keep, whoever changed it:
 * places only on days in their city and, on a moving day, only after checking in there;
 * each place once, at a time its light allows (no night outing in the morning); leaving
 * for a place before the visit; nothing before landing or after leaving for the airport;
 * and a route that stays inside the trip. An empty list means the plan holds together.
 */
export function checkPlan(trip: Trip, plan: TripPlan): Problem[] {
  const problems: Problem[] = [];
  for (const stop of trip.stops) {
    if (stop.date <= trip.startDate || stop.date > trip.endDate) problems.push({ code: 'routeOutside', date: stop.date, title: '', ref: stop.id });
  }

  const spots = new Map<string, Spot>([...plan.pickedSpots.map((p) => [p.spot.id, p.spot] as const), ...trip.spots.map((s) => [s.id, s] as const)]);
  const seen = new Map<string, string>();
  for (const day of plan.days) {
    const at = (t: Task) => (t.time ? toMinutes(t.time) : null);
    const airport = day.tasks.filter((t) => /^airport/.test(keyOf(t)) && t.time).map((t) => toMinutes(t.time!));
    const leave = airport.length ? Math.min(...airport) : null;
    const visits = new Map<string, number | null>();
    // On a day that moves to another city, its places can only start once you have checked in there.
    const checkIn = day.movedFrom ? day.tasks.find((t) => keyOf(t) === 'move-in' && t.time) : undefined;

    for (const task of day.tasks) {
      const key = keyOf(task);
      const found = /^(spot|go)-(.+)$/.exec(key);
      const base = { date: day.date, title: task.title, ref: task.id };
      if (found) {
        const spot = spots.get(found[2]!);
        const city = spot?.cityId ?? /^place:([^:]+):/.exec(found[2]!)?.[1] ?? trip.cityId;
        if (city !== day.cityId) problems.push({ code: 'wrongCity', ...base, cityId: city });
        else if (checkIn && task.time && toMinutes(task.time) < toMinutes(checkIn.time!)) problems.push({ code: 'beforeCheckIn', ...base, cityId: city });
        if (found[1] === 'spot' && spot && !spot.allDay && task.time) {
          const [from, to] = lightWindow(spot.light, day.sun);
          const m = toMinutes(task.time);
          if (m < from || m > to) problems.push({ code: 'wrongLight', ...base });
        }
        const where = seen.get(key);
        if (where && where !== day.date) problems.push({ code: 'twice', ...base });
        seen.set(key, day.date);
        if (found[1] === 'spot') visits.set(found[2]!, at(task));
      }
      const minutes = at(task);
      if (minutes === null) continue;
      if ((day.kind === 'arrival' || day.kind === 'single') && minutes < toMinutes(trip.arrivalTime)) problems.push({ code: 'beforeLanding', ...base });
      if (leave !== null && minutes > leave && !/^(airport|flight|connect)/.test(key)) problems.push({ code: 'afterAirport', ...base });
    }

    for (const task of day.tasks) {
      const go = /^go-(.+)$/.exec(keyOf(task));
      const visit = go ? visits.get(go[1]!) : undefined;
      if (go && task.time && visit != null && toMinutes(task.time) > visit) problems.push({ code: 'goAfterVisit', date: day.date, title: task.title, ref: task.id });
    }
  }
  return problems;
}

/** Problems a change would add to the plan, compared with before it. */
export function newProblems(before: Problem[], after: Problem[]): Problem[] {
  const had = new Set(before.map((p) => `${p.code}|${p.title}`));
  return after.filter((p) => !had.has(`${p.code}|${p.title}`));
}

/**
 * Applies a change to a task the way the app does (moving what hangs on it), rebuilds the
 * plan and checks it. A change that would break a rule the plan kept before is refused,
 * with the first problem it would cause.
 */
export function tryEdit(
  trip: Trip,
  plan: TripPlan,
  original: Task,
  edited: Task,
  closed: ReadonlySet<string> = new Set(),
): { trip: Trip } | { problem: Problem } {
  const spot = spotOf(original, trip, plan.pickedSpots.map((p) => p.spot));
  const partner = partnerOf(original, plan.days.find((d) => d.date === original.date)?.tasks ?? []);
  const next = moveTask(trip, original, edited, spot, partner);
  if (next === trip && edited.date !== original.date) return { problem: { code: 'routeOutside', date: edited.date, title: original.title, ref: original.id } };
  const added = newProblems(checkPlan(trip, plan), checkPlan(next, generatePlan(next, closed)));
  return added[0] ? { problem: added[0] } : { trip: next };
}

/**
 * Puts back igo's version of any task the traveler changed in a way that breaks a rule,
 * for plans saved before the checker existed or synced from an older copy of the app.
 */
export function repairTrip(trip: Trip): Trip {
  let next = trip;
  for (let round = 0; round < 5; round++) {
    const copies = new Set(next.customTasks.filter((t) => t.replaces).map((t) => t.id));
    const broken = [...new Set(checkPlan(next, generatePlan(next)).map((p) => p.ref).filter((ref) => copies.has(ref)))];
    if (!broken.length) return next;
    next = broken.reduce(resetTask, next);
  }
  return next;
}
