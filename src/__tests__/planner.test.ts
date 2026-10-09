import { describe, expect, it } from 'vitest';
import { sunTimes } from '../utils/solar';
import { zonedToUtc } from '../utils/timezone';
import { generatePlan } from '../features/planner/generatePlan';
import { postingTime } from '../features/planner/dayTasks';
import { sampleTrip } from '../data/sampleTrip';
import type { Trip } from '../types';
import { toMinutes } from '../utils/dates';
import { formatEthiopian, fromEthiopian, toEthiopianClock } from '../utils/ethiopian';
import { fasika, holidayNotes } from '../data/ethiopia/holidays';

const near = (actual: string, expected: string, tolerance = 4) =>
  expect(Math.abs(toMinutes(actual) - toMinutes(expected))).toBeLessThanOrEqual(tolerance);

const trip = (over: Partial<Trip> = {}): Trip => ({
  ...sampleTrip(),
  startDate: '2026-11-02',
  endDate: '2026-11-07',
  stops: [
    { id: 'a', cityId: 'harar', date: '2026-11-04' },
    { id: 'b', cityId: 'addis', date: '2026-11-06' },
  ],
  ...over,
});

describe('sunTimes', () => {
  it('matches published Tokyo times for 2026-06-21', () => {
    const t = sunTimes('2026-06-21', 35.6812, 139.7671, 'Asia/Tokyo');
    near(t!.sunrise, '04:25');
    near(t!.sunset, '19:00');
  });
  it('handles DST in Lisbon for 2026-07-01', () => {
    const t = sunTimes('2026-07-01', 38.7223, -9.1393, 'Europe/Lisbon');
    near(t!.sunrise, '06:14');
    near(t!.sunset, '21:05');
  });
});

describe('time zones', () => {
  it('converts wall-clock time to UTC', () => {
    expect(zonedToUtc('2026-11-02', '19:00', 'America/New_York').toISOString()).toBe('2026-11-03T00:00:00.000Z');
  });
  it('posts at 19:00 New York time, which is 03:00 the next day in Addis Ababa', () => {
    expect(postingTime('2026-11-02', 'America/New_York', 'Africa/Addis_Ababa')).toEqual({ time: '03:00', dayShift: 1 });
  });
});

describe('generatePlan', () => {
  it('builds one day per date with arrival and departure ends', () => {
    const plan = generatePlan(trip());
    expect(plan.days.map((d) => d.kind)).toEqual(['arrival', 'full', 'full', 'full', 'full', 'departure']);
  });
  it('schedules every sample spot into a fitting light window', () => {
    const plan = generatePlan(trip());
    expect(plan.unscheduledSpots).toHaveLength(0);
    const all = plan.days.flatMap((d) => d.tasks.map((t) => t.title));
    expect(all.some((t) => t.includes('Hyena feeding outside the walls after dark'))).toBe(true);
  });
  it('includes country-specific pre-trip tasks', () => {
    const titles = generatePlan(trip()).preTrip.map((t) => t.title);
    expect(titles).toContain('Submit Ethiopia e-Visa');
    expect(titles).toContain('Register your drone for Ethiopia');
    expect(titles).toContain('Book every leg of your route: Addis Ababa → Harar → Addis Ababa');
  });
  it('keeps task ids stable and applies hidden ids', () => {
    const first = generatePlan(trip());
    const id = first.days[1]!.tasks[0]!.id;
    expect(generatePlan(trip()).days[1]!.tasks[0]!.id).toBe(id);
    expect(generatePlan(trip({ hiddenIds: [id] })).days[1]!.tasks.some((t) => t.id === id)).toBe(false);
  });
  it('drops creator tasks in traveler mode', () => {
    const plan = generatePlan(trip({ mode: 'traveler' }));
    expect(plan.days.flatMap((d) => d.tasks).some((t) => t.category === 'post' || t.category === 'edit')).toBe(false);
  });
  it('never schedules departure-day tasks after leaving for the airport', () => {
    const last = generatePlan(trip()).days.at(-1)!;
    const leave = toMinutes('19:30');
    expect(last.tasks.filter((t) => t.title !== 'Flight departs').every((t) => !t.time || toMinutes(t.time) <= leave)).toBe(true);
  });
});

describe('Ethiopia', () => {
  it('converts to the Ethiopian calendar, including the Pagume leap shift', () => {
    expect(formatEthiopian('2025-09-11')).toBe('Meskerem 1, 2018 E.C.');
    expect(formatEthiopian('2023-09-12')).toBe('Meskerem 1, 2016 E.C.');
    expect(formatEthiopian('2024-01-20')).toBe('Tir 11, 2016 E.C.');
    expect(fromEthiopian({ year: 2019, month: 1, day: 1 })).toBe('2026-09-11');
  });
  it('reads the Ethiopian clock from 6 am', () => {
    expect(toEthiopianClock('08:00')).toBe('2:00 morning');
    expect(toEthiopianClock('18:30')).toBe('12:30 evening');
    expect(toEthiopianClock('03:00')).toBe('9:00 night');
  });
  it('finds Fasika, Timkat and Meskel', () => {
    expect(fasika(2026)).toBe('2026-04-12');
    expect(fasika(2027)).toBe('2027-05-02');
    expect(holidayNotes('2027-01-19')[0]?.text).toMatch(/^Timkat/);
    expect(holidayNotes('2028-01-20')[0]?.text).toMatch(/^Timkat/);
    expect(holidayNotes('2026-09-27')[0]?.text).toMatch(/^Meskel/);
  });
  it('moves the route between cities and adds move tasks and safety notes', () => {
    const plan = generatePlan(trip({ stops: [{ id: 'a', cityId: 'lalibela', date: '2026-11-04' }] }));
    const move = plan.days[2]!;
    expect(move.cityId).toBe('lalibela');
    expect(move.movedFrom).toBe('addis');
    expect(move.tasks.some((t) => t.title === 'Travel to Lalibela')).toBe(true);
    expect(move.notes.some((n) => n.kind === 'safety')).toBe(true);
  });
  it('only schedules a spot on days in its city', () => {
    const plan = generatePlan(trip());
    const hyena = plan.days.find((d) => d.tasks.some((t) => t.title.includes('Hyena')));
    expect(hyena?.cityId).toBe('harar');
  });
});

describe('personalization', () => {
  const addisOnly = (over: Partial<Trip> = {}) =>
    trip({ stops: [], spots: [], mode: 'traveler', ...over });
  const titles = (t: Trip) => generatePlan(t).days.flatMap((d) => d.tasks.map((x) => x.title));
  const places = (t: Trip) => generatePlan(t).days.flatMap((d) => d.tasks.filter((x) => x.id.includes(':spot-place:')));

  it('gives different plans to different interests', () => {
    const history = titles(addisOnly({ interests: ['history'] }));
    const nature = titles(addisOnly({ interests: ['countryside', 'hiking'] }));
    expect(history.some((t) => t.includes('National Museum'))).toBe(true);
    expect(nature.some((t) => t.includes('Entoto'))).toBe(true);
    expect(nature.some((t) => t.includes('National Museum'))).toBe(false);
  });
  it('keeps city-only travelers out of the countryside', () => {
    const all = titles(addisOnly({ interests: ['city', 'hiking', 'history'] }));
    expect(all.some((t) => t.includes('Bishoftu') || t.includes('Entoto'))).toBe(false);
  });
  it('only adds restaurants for people who chose food', () => {
    expect(titles(addisOnly({ interests: ['history'] })).some((t) => /^(Lunch|Dinner)/.test(t))).toBe(false);
    expect(titles(addisOnly({ interests: ['food'] })).some((t) => /^(Lunch|Dinner)/.test(t))).toBe(true);
  });
  it('fits the number of places to the pace', () => {
    const fullDays = (t: Trip) => generatePlan(t).days.filter((d) => d.kind === 'full');
    const perDay = (t: Trip) => Math.max(...fullDays(t).map((d) => d.tasks.filter((x) => x.id.includes(':spot-place:') && x.category !== 'food').length));
    const interests: Trip['interests'] = ['city', 'history', 'culture', 'food', 'coffee', 'markets', 'nightlife'];
    expect(perDay(addisOnly({ interests, pace: 'relaxed' }))).toBeLessThanOrEqual(2);
    const short = { endDate: '2026-11-04' };
    expect(places(addisOnly({ ...short, interests, pace: 'packed' })).length).toBeGreaterThan(places(addisOnly({ ...short, interests, pace: 'relaxed' })).length);
  });
  it('never picks a place the traveler dismissed', () => {
    const t = addisOnly({ interests: ['history'], dismissedPlaces: ['addis:national-museum-lucy'] });
    expect(titles(t).some((x) => x.includes('National Museum'))).toBe(false);
  });
  it('explains why a place was picked', () => {
    const museum = places(addisOnly({ interests: ['history'] })).find((t) => t.title.includes('National Museum'));
    expect(museum?.detail).toMatch(/^Picked for you: historic sites/);
  });
});
