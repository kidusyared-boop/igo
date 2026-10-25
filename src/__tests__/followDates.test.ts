import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { followDates } from '../features/planner/followDates';
import { moveTask } from '../features/planner/taskEdits';
import { checkPlan } from '../features/planner/checkPlan';
import { normalizeTrip } from '../services/storage';
import { sampleTrip } from '../data/sampleTrip';
import { addDays } from '../utils/dates';
import type { Trip } from '../types';

const base = (): Trip => ({
  ...sampleTrip(), id: 'trip-1', name: 'Harar loop', spots: [], customTasks: [], hiddenIds: [], doneIds: [],
  startDate: '2026-11-10', endDate: '2026-11-15',
  stops: [{ id: 's1', cityId: 'harar', date: '2026-11-12' }, { id: 's2', cityId: 'addis', date: '2026-11-14' }],
});
const tasks = (tr: Trip) => generatePlan(tr).days.flatMap((d) => d.tasks);
const shiftTrip = (tr: Trip, days: number): Trip => ({
  ...tr, startDate: addDays(tr.startDate, days), endDate: addDays(tr.endDate, days),
  stops: tr.stops.map((s) => ({ ...s, date: addDays(s.date, days) })),
});
/** Ticked tasks, by what they say, so the same task on another day compares equal. */
const ticked = (tr: Trip) => tasks(tr).filter((t) => tr.doneIds.includes(t.id)).map((t) => t.title).sort();

describe('changing trip dates keeps the traveler\'s work', () => {
  const tickAll = (tr: Trip): Trip => ({ ...tr, doneIds: tasks(tr).filter((_, i) => i % 3 === 0).map((t) => t.id) });

  it('without carrying over, moving the trip loses its ticks or puts them on other tasks (the bug)', () => {
    const tr = tickAll(base());
    expect(ticked(tr).length).toBeGreaterThan(5);
    const lost = ticked(shiftTrip(tr, 2));
    expect(lost.length).toBeLessThan(ticked(tr).length / 2);
  });

  it('moving the whole trip later keeps every tick', () => {
    const tr = tickAll(base());
    expect(ticked(followDates(tr, shiftTrip(tr, 2)))).toEqual(ticked(tr));
  });

  it('moving the whole trip earlier keeps every tick', () => {
    const tr = tickAll(base());
    expect(ticked(followDates(tr, shiftTrip(tr, -5)))).toEqual(ticked(tr));
  });

  it('a later flight home takes the old last day\'s ticks with it', () => {
    const tr = base();
    const airport = tasks(tr).find((t) => t.date === tr.endDate && t.id.endsWith(':airport'))!;
    const done = { ...tr, doneIds: [airport.id] };
    const next = followDates(done, { ...done, endDate: addDays(tr.endDate, 2) });
    expect(next.doneIds).toEqual([`auto:${addDays(tr.endDate, 2)}:airport`]);
    expect(ticked(next)).toEqual(['Leave for the airport']);
  });

  it('an edited task and a hidden task survive the move', () => {
    const tr = base();
    const day = generatePlan(tr).days[3]!;
    const flexible = day.tasks.find((t) => t.time && t.category !== 'logistics' && !/:(spot|go)-/.test(t.id))!;
    const hidden = day.tasks.find((t) => t !== flexible && t.category !== 'logistics')!;
    const copied = moveTask(tr, flexible, { ...flexible, title: 'My own wording' }, undefined, undefined, () => 'task_mine');
    const edited = { ...copied, hiddenIds: [...copied.hiddenIds, hidden.id] };
    const moved = followDates(edited, shiftTrip(edited, 3));
    const after = tasks(moved);
    expect(after.filter((t) => t.title === 'My own wording').map((t) => t.date)).toEqual([addDays(day.date, 3)]);
    expect(after.some((t) => t.title === flexible.title && t.date === addDays(day.date, 3))).toBe(false);
    expect(after.some((t) => t.id === hidden.id.replace(day.date, addDays(day.date, 3)))).toBe(false);
    // Loading it again changes nothing: the copy still matches the task it stands in for.
    expect(normalizeTrip(moved).customTasks).toEqual(moved.customTasks);
  });

  it('a place pinned to a day moves with the trip', () => {
    const tr = { ...base(), spots: [{ id: 'sp5', cityId: 'harar', name: 'Jugol old town alleys', light: 'sunrise' as const, shotList: 'Doors', date: '2026-11-13' }] };
    const moved = followDates(tr, shiftTrip(tr, 4));
    expect(moved.spots[0]!.date).toBe('2026-11-17');
    expect(checkPlan(moved, generatePlan(moved))).toEqual([]);
  });

  it('your own tasks, prep tasks included, keep their place in the trip', () => {
    const tr = { ...base(), customTasks: [
      { id: 'own-1', date: '2026-11-11', title: 'Meet Abebe', time: '18:00', category: 'explore' as const, source: 'user' as const },
      { id: 'own-2', date: '2026-11-03', title: 'Print the visa', category: 'prep' as const, source: 'user' as const },
    ] };
    const moved = followDates(tr, shiftTrip(tr, 7));
    expect(moved.customTasks.map((t) => t.date)).toEqual(['2026-11-18', '2026-11-10']);
  });

  it('nothing changes when the dates stay the same', () => {
    const tr = tickAll(base());
    const same = { ...tr, name: 'Renamed' };
    expect(followDates(tr, same)).toBe(same);
  });
});
