import { describe, expect, it } from 'vitest';
import { buildReminders, LEAD_MINUTES, MAX_PENDING, reminderId } from '../features/reminders/buildReminders';
import { generatePlan } from '../features/planner/generatePlan';
import { sampleTrip } from '../data/sampleTrip';
import { translate } from '../i18n';
import type { Trip } from '../types';
import { zonedToUtc } from '../utils/timezone';

const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const trip = (over: Partial<Trip> = {}): Trip => ({
  ...sampleTrip(), id: 'trip-1', name: 'Addis week', spots: [], customTasks: [], stops: [],
  startDate: '2026-11-10', endDate: '2026-11-14', ...over,
});
const build = (trips: Trip[], now: Date) => buildReminders(trips, (x) => generatePlan(x), now, t);
const before = new Date('2026-08-01T00:00:00Z');

describe('reminders', () => {
  it('reminds 30 minutes before each timed to-do, in Addis time', () => {
    const tr = trip();
    const task = generatePlan(tr).days[1]!.tasks.find((x) => x.time)!;
    const r = build([tr], before).find((x) => x.title === task.title && x.body.startsWith(task.time!))!;
    expect(r.at.getTime()).toBe(zonedToUtc(task.date, task.time!, 'Africa/Addis_Ababa').getTime() - LEAD_MINUTES * 60_000);
    expect(r.body).toBe(`${task.time} in Addis Ababa`);
    expect(r.tripId).toBe('trip-1');
  });

  it('gives a heads-up the evening before each day except the first', () => {
    const list = build([trip()], before);
    const eves = list.filter((x) => x.title === 'Tomorrow in Addis Ababa');
    expect(eves).toHaveLength(4);
    expect(eves[0]!.at.toISOString()).toBe('2026-11-10T17:00:00.000Z');
    expect(eves[0]!.body.split('\n').length).toBeGreaterThan(1);
  });

  it('reminds about prep work on its due date, one reminder per day', () => {
    const prep = build([trip()], before).filter((x) => x.title.startsWith('Before your trip: '));
    expect(prep.length).toBeGreaterThan(1);
    expect(new Set(prep.map((x) => x.at.getTime())).size).toBe(prep.length);
    expect(prep.every((x) => x.at.getHours() === 9)).toBe(true);
    const many = prep.find((x) => /\d+ things to do$/.test(x.title));
    if (many) expect(many.body.split('\n').length).toBe(Number(many.title.match(/(\d+)/)![1]));
  });

  it('skips a to-do that follows straight on from the last one reminded', () => {
    const list = build([trip({ mode: 'creator' })], before).filter((x) => x.body.includes(' in Addis Ababa'));
    const byDay = new Map<string, number[]>();
    for (const x of list) {
      const [date, time] = [x.at.toISOString().slice(0, 10), x.at.getTime() / 60_000];
      byDay.set(date, [...(byDay.get(date) ?? []), time]);
    }
    for (const times of byDay.values()) times.slice(1).forEach((m, i) => expect(m - times[i]!).toBeGreaterThanOrEqual(60));
  });

  it('leaves out done, hidden, past and example to-dos', () => {
    const tr = trip();
    const [a, b] = generatePlan(tr).days[1]!.tasks.filter((x) => x.time);
    const list = build([{ ...tr, doneIds: [a!.id], hiddenIds: [b!.id] }, { ...tr, id: 'example-1' }], before);
    expect(list.some((x) => x.id === reminderId(`trip-1|${a!.id}`) || x.id === reminderId(`trip-1|${b!.id}`))).toBe(false);
    expect(list.every((x) => x.tripId === 'trip-1')).toBe(true);
    const late = new Date('2026-11-13T00:00:00Z');
    expect(build([tr], late).every((x) => x.at > late)).toBe(true);
  });

  it('keeps ids stable, sorts by time and stays under the phone limit', () => {
    const a = build([trip()], before);
    const b = build([trip()], before);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(new Set(a.map((x) => x.id)).size).toBe(a.length);
    const long = build([trip({ endDate: '2026-11-30', pace: 'packed' })], before);
    expect(long).toHaveLength(MAX_PENDING);
    expect(long.every((x, i) => i === 0 || x.at >= long[i - 1]!.at)).toBe(true);
  });
});
