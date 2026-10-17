import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { buildReminders } from '../features/reminders/buildReminders';
import { buildIcs } from '../services/ics';
import { validateTrip } from '../features/trips/tripDraft';
import { ETHIOPIA } from '../data/ethiopia/ethiopia';
import { translate } from '../i18n';
import { addDays, daysBetween, toMinutes } from '../utils/dates';
import type { Interest, Trip } from '../types';

// Plans many made-up trips (odd dates, long routes, every option) and checks rules
// every plan must keep. A fixed seed keeps the trips the same on every run.
let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const some = <T,>(xs: readonly T[]) => xs.filter(() => rnd() < 0.35);
const INTERESTS: Interest[] = ['city', 'countryside', 'food', 'coffee', 'history', 'religion', 'culture', 'markets', 'nightlife', 'hiking', 'wildlife', 'adventure'];
const CITIES = ETHIOPIA.cities.map((c) => c.id);
const TIMES = ['00:30', '03:10', '06:00', '08:45', '11:00', '13:30', '17:15', '20:00', '22:30', '23:40'];

function randomTrip(i: number): Trip {
  const start = addDays('2026-11-01', Math.floor(rnd() * 400));
  const len = pick([1, 1, 2, 3, 4, 5, 7, 10, 14, 21, 30, 60]);
  const stops = Array.from({ length: len > 2 ? Math.floor(rnd() * 4) : 0 }, (_, k) => ({ id: `s${k}`, cityId: pick(CITIES), date: addDays(start, 1 + Math.floor(rnd() * (len - 1))) }));
  return {
    id: `stress-${i}`, name: `Stress ${i}`, countryCode: 'ET', cityId: pick(CITIES), stops, startDate: start, endDate: addDays(start, len - 1),
    arrivalTime: pick(TIMES), departureTime: pick(TIMES), mode: pick(['creator', 'traveler'] as const),
    audienceTimeZone: pick(['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Africa/Addis_Ababa']), flyingDrone: rnd() < 0.3,
    interests: some(INTERESTS), pace: pick(['relaxed', 'balanced', 'packed'] as const), budget: pick(['low', 'mid', 'high'] as const),
    diets: some(['vegetarian', 'vegan', 'halal', 'fasting'] as const), mobility: pick(['full', 'limited'] as const), withKids: rnd() < 0.3,
    diaspora: rnd() < 0.3, entryDoc: pick(['visa', 'origin-id', 'ethiopian-passport'] as const), familyTime: rnd() < 0.3,
    dismissedPlaces: [], spots: [], customTasks: [], doneIds: [], hiddenIds: [], createdAt: '2026-10-17T00:00:00Z',
  };
}

const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const trips = Array.from({ length: 300 }, (_, i) => randomTrip(i)).filter((trip) => validateTrip(trip) === null);

describe('stress test: 300 made-up trips', () => {
  it('plans every trip the form accepts, with sane days and times', { timeout: 60_000 }, () => {
    expect(trips.length).toBeGreaterThan(200);
    for (const trip of trips) {
      const plan = generatePlan(trip);
      const where = `${trip.id} (${trip.startDate}..${trip.endDate}, lands ${trip.arrivalTime}, leaves ${trip.departureTime})`;
      expect(plan.days, where).toHaveLength(daysBetween(trip.startDate, trip.endDate) + 1);
      const ids = new Set<string>();
      for (const day of plan.days) {
        let previous = -1;
        for (const task of day.tasks) {
          expect(ids.has(task.id), `${where}: duplicate ${task.id}`).toBe(false);
          ids.add(task.id);
          expect(`${task.title} ${task.detail ?? ''}`, where).not.toMatch(/undefined|NaN|\[object/);
          if (!task.time) continue;
          expect(task.time, where).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
          const at = toMinutes(task.time);
          expect(at, `${where} ${day.date}: ${task.title} out of order`).toBeGreaterThanOrEqual(previous);
          previous = at;
          if (day.kind === 'arrival' || day.kind === 'single') {
            expect(at, `${where} ${day.date}: "${task.title}" before landing`).toBeGreaterThanOrEqual(toMinutes(trip.arrivalTime));
          }
          if ((day.kind === 'departure' || day.kind === 'single') && task.title !== 'Flight departs') {
            expect(at, `${where} ${day.date}: "${task.title}" after the flight`).toBeLessThan(toMinutes(trip.departureTime));
          }
        }
      }
      for (const task of plan.preTrip) expect(task.date < trip.startDate, `${where}: ${task.title}`).toBe(true);
      expect(() => buildIcs(trip, plan, 'Africa/Addis_Ababa')).not.toThrow();
    }
    expect(() => buildReminders(trips, (x) => generatePlan(x), new Date('2026-10-17T00:00:00Z'), t)).not.toThrow();
  });
});
