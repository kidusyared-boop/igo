import type { Task, Trip, TripPlan } from '../../types';
import { toMinutes } from '../../utils/dates';
import { generatePlan } from './generatePlan';
import { moveTask, partnerOf, spotOf } from './taskEdits';

export type ProblemCode = 'wrongCity' | 'beforeLanding' | 'afterAirport' | 'goAfterVisit' | 'twice' | 'routeOutside';

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

/** The city a place is in: the traveler's own places say so; igo's picks carry it in their id. */
function placeCity(trip: Trip, spotId: string): string | undefined {
  return trip.spots.find((s) => s.id === spotId)?.cityId ?? /^place:([^:]+):/.exec(spotId)?.[1];
}

/**
 * Checks a built plan against the rules every schedule must keep, whoever changed it:
 * places only on days in their city, each place once, leaving for a place before the
 * visit, nothing before landing or after leaving for the airport, and a route that
 * stays inside the trip. An empty list means the plan holds together.
 */
export function checkPlan(trip: Trip, plan: TripPlan): Problem[] {
  const problems: Problem[] = [];
  for (const stop of trip.stops) {
    if (stop.date <= trip.startDate || stop.date > trip.endDate) problems.push({ code: 'routeOutside', date: stop.date, title: '', ref: stop.id });
  }

  const seen = new Map<string, string>();
  for (const day of plan.days) {
    const at = (t: Task) => (t.time ? toMinutes(t.time) : null);
    const airport = day.tasks.filter((t) => /^airport/.test(keyOf(t)) && t.time).map((t) => toMinutes(t.time!));
    const leave = airport.length ? Math.min(...airport) : null;
    const visits = new Map<string, number | null>();

    for (const task of day.tasks) {
      const key = keyOf(task);
      const found = /^(spot|go)-(.+)$/.exec(key);
      const base = { date: day.date, title: task.title, ref: task.id };
      if (found) {
        const city = placeCity(trip, found[2]!);
        if (city && city !== day.cityId) problems.push({ code: 'wrongCity', ...base, cityId: city });
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
