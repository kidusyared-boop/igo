import type { Light, Spot, SunTimes, Task, Trip, TripPlan } from '../../types';
import { toMinutes } from '../../utils/dates';
import { generatePlan } from './generatePlan';
import { moveTask, partnerOf, resetTask, spotOf } from './taskEdits';

export type ProblemCode = 'wrongCity' | 'beforeLanding' | 'beforeCheckIn' | 'wrongLight' | 'afterAirport' | 'goAfterVisit' | 'twice' | 'routeOutside' | 'movedBefore' | 'movedAfter' | 'onTheRoad';

export interface Problem {
  code: ProblemCode;
  date: string;
  title: string;
  /** The task, or the stop, the problem is about. */
  ref: string;
  /** For wrongCity: the city the place is in. */
  cityId?: string;
  /** For movedBefore and movedAfter: the step it would swap places with. */
  other?: string;
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
 * a route that stays inside the trip; and none of the traveler's own tasks while they are
 * on the road between two cities. An empty list means the plan holds together.
 */
export function checkPlan(trip: Trip, plan: TripPlan): Problem[] {
  const problems: Problem[] = [];
  for (const stop of trip.stops) {
    if (stop.date <= trip.startDate || stop.date > trip.endDate) problems.push({ code: 'routeOutside', date: stop.date, title: '', ref: stop.id });
  }

  const igo = stepOrder(trip);
  const spots = new Map<string, Spot>([...plan.pickedSpots.map((p) => [p.spot.id, p.spot] as const), ...trip.spots.map((s) => [s.id, s] as const)]);
  const seen = new Map<string, string>();
  for (const day of plan.days) {
    const at = (t: Task) => (t.time ? toMinutes(t.time) : null);
    const airport = day.tasks.filter((t) => /^airport/.test(keyOf(t)) && t.time).map((t) => toMinutes(t.time!));
    const leave = airport.length ? Math.min(...airport) : null;
    const visits = new Map<string, number | null>();
    // On a day that moves to another city, its places can only start once you have checked in there.
    const checkIn = day.movedFrom ? day.tasks.find((t) => keyOf(t) === 'move-in' && t.time) : undefined;
    const depart = day.movedFrom ? day.tasks.find((t) => keyOf(t) === 'move' && t.time) : undefined;

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
      // The traveler's own tasks can't happen on the bus or plane between two cities.
      const own = task.source === 'user' && !task.replaces;
      if (own && depart && checkIn && minutes > toMinutes(depart.time!) && minutes < toMinutes(checkIn.time!)) problems.push({ code: 'onTheRoad', ...base, other: checkIn.title });
    }

    problems.push(...outOfOrder(day, igo.get(day.date) ?? []));

    for (const task of day.tasks) {
      const go = /^go-(.+)$/.exec(keyOf(task));
      const visit = go ? visits.get(go[1]!) : undefined;
      if (go && task.time && visit != null && toMinutes(task.time) > visit) problems.push({ code: 'goAfterVisit', date: day.date, title: task.title, ref: task.id });
    }
  }
  return problems;
}

/** The trip as igo planned it, before any of the traveler's changes to igo's tasks. */
function unedited(trip: Trip): Trip {
  const copies = trip.customTasks.filter((t) => t.replaces);
  if (!copies.length) return trip;
  const replaced = new Set(copies.map((t) => t.replaces));
  return { ...trip, customTasks: trip.customTasks.filter((t) => !t.replaces), hiddenIds: trip.hiddenIds.filter((id) => !replaced.has(id)) };
}

/**
 * The order igo put each day's travel and logistics steps in: landing, getting cash, the
 * ride, check-in, checkout, the journey, leaving for a place, leaving for the airport.
 * These depend on each other, so a change may move them in time but never past each other.
 */
function stepOrder(trip: Trip): Map<string, string[]> {
  const plan = generatePlan(unedited(trip));
  return new Map(plan.days.map((d) => [d.date, d.tasks.filter((t) => t.category === 'logistics' && t.time).map(keyOf)]));
}

function outOfOrder(day: TripPlan['days'][number], order: string[]): Problem[] {
  const byKey = new Map(day.tasks.filter((t) => t.time).map((t) => [keyOf(t), t]));
  const steps = order.flatMap((key) => byKey.get(key) ?? []);
  const problems: Problem[] = [];
  for (let i = 1; i < steps.length; i++) {
    const [a, b] = [steps[i - 1]!, steps[i]!];
    if (toMinutes(a.time!) <= toMinutes(b.time!)) continue;
    // Blame the step the traveler changed; when both or neither were, the later one.
    const moved = a.replaces && !b.replaces ? a : b;
    problems.push(
      moved === b
        ? { code: 'movedBefore', date: day.date, title: b.title, ref: b.id, other: a.title }
        : { code: 'movedAfter', date: day.date, title: a.title, ref: a.id, other: b.title },
    );
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

/** Adds the traveler's own task, unless it would break a rule the plan kept before. */
export function tryAdd(trip: Trip, plan: TripPlan, task: Task, closed: ReadonlySet<string> = new Set()): { trip: Trip } | { problem: Problem } {
  const next = { ...trip, customTasks: [...trip.customTasks, task] };
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
