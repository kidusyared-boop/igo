import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { checkPlan, newProblems, tryEdit } from '../features/planner/checkPlan';
import { allowedDays, routeStop, spotOf } from '../features/planner/taskEdits';
import { ETHIOPIA } from '../data/ethiopia/ethiopia';
import { addDays, fromMinutes } from '../utils/dates';
import type { Interest, Trip } from '../types';

// Makes many trips, then changes and moves their tasks at random the way a traveler can in
// the app, and checks the plan never breaks a rule it kept before. A fixed seed keeps the
// run the same each time.
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const INTERESTS: Interest[] = ['city', 'food', 'coffee', 'history', 'religion', 'culture', 'markets', 'nightlife', 'hiking'];
const CITIES = ETHIOPIA.cities.map((c) => c.id);

function randomTrip(i: number): Trip {
  const start = addDays('2026-11-01', Math.floor(rnd() * 300));
  const len = pick([3, 5, 7, 10, 14]);
  const legs = Math.floor(rnd() * 4);
  const dates = [...new Set(Array.from({ length: legs }, () => addDays(start, 1 + Math.floor(rnd() * (len - 1)))))].sort();
  return {
    id: `fuzz-${i}`, name: `Fuzz ${i}`, countryCode: 'ET', cityId: 'addis',
    stops: dates.map((date, k) => ({ id: `s${k}`, cityId: k === dates.length - 1 ? 'addis' : pick(CITIES.filter((c) => c !== 'addis')), date })),
    startDate: start, endDate: addDays(start, len - 1), arrivalTime: pick(['06:30', '09:00', '13:00']), departureTime: pick(['14:00', '20:30', '23:55']),
    mode: pick(['creator', 'traveler'] as const), audienceTimeZone: 'Europe/London', flyingDrone: false,
    interests: INTERESTS.filter(() => rnd() < 0.4), pace: pick(['relaxed', 'balanced', 'packed'] as const), budget: 'mid', diets: [],
    mobility: 'full', withKids: false, diaspora: false, entryDoc: 'visa', familyTime: false, dismissedPlaces: [], spots: [],
    customTasks: [], doneIds: [], hiddenIds: [], createdAt: '2026-10-23T00:00:00Z',
  };
}

describe('edit fuzz: 120 trips, 8 random changes each', () => {
  it('no change, accepted or refused, leaves the plan broken', { timeout: 60_000 }, () => {
    let accepted = 0;
    let refused = 0;
    for (let i = 0; i < 120; i++) {
      let trip = randomTrip(i);
      const baseline = checkPlan(trip, generatePlan(trip));
      expect(baseline, `trip ${i} as igo planned it`).toEqual([]);
      for (let step = 0; step < 8; step++) {
        const plan = generatePlan(trip);
        const day = pick(plan.days);
        const task = day.tasks.length ? pick(day.tasks) : undefined;
        if (!task) continue;
        const spot = spotOf(task, trip, plan.pickedSpots.map((p) => p.spot));
        const stop = routeStop(trip, task);
        const days = allowedDays(trip, task, plan.days, spot);
        const date = rnd() < 0.6 && days.length ? pick(days) : (stop?.date ?? task.date);
        const time = task.time && rnd() < 0.5 ? fromMinutes(Math.floor(rnd() * 24 * 60)) : task.time;
        const result = tryEdit(trip, plan, stop ? { ...task, date: stop.date } : task, { ...task, date, ...(time ? { time } : {}) });
        if ('problem' in result) {
          refused++;
          continue;
        }
        accepted++;
        trip = result.trip;
        const problems = newProblems(baseline, checkPlan(trip, generatePlan(trip)));
        expect(problems, `trip ${i} step ${step}: ${task.title} → ${date} ${time ?? ''}`).toEqual([]);
        expect(trip.stops.every((s) => s.date > trip.startDate && s.date <= trip.endDate)).toBe(true);
      }
    }
    expect(accepted).toBeGreaterThan(400);
    expect(refused).toBeGreaterThan(0);
  });
});
