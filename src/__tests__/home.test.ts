import { describe, expect, it } from 'vitest';
import { homeTodos, HOME_TODOS, nextTrip, tripTiming } from '../features/home/homeState';
import { generatePlan } from '../features/planner/generatePlan';
import { sampleTrip } from '../data/sampleTrip';
import type { Trip } from '../types';

const trip = (over: Partial<Trip> = {}): Trip => ({
  ...sampleTrip(), id: 'trip-1', name: 'Addis week', spots: [], customTasks: [], stops: [], doneIds: [],
  startDate: '2026-11-10', endDate: '2026-11-14', ...over,
});

describe('opening screen', () => {
  it('counts down to your own soonest trip and ignores the example and past trips', () => {
    const trips = [
      trip({ id: 'example-1', startDate: '2026-10-20', endDate: '2026-10-25' }),
      trip({ id: 'past', startDate: '2026-09-01', endDate: '2026-09-05' }),
      trip({ id: 'later', startDate: '2026-12-01', endDate: '2026-12-05' }),
      trip({ id: 'soon' }),
    ];
    expect(nextTrip(trips, '2026-10-15')?.id).toBe('soon');
    expect(nextTrip([trips[0]!, trips[1]!], '2026-10-15')).toBeUndefined();
  });

  it('keeps a trip that is under way as the next trip', () => {
    expect(nextTrip([trip()], '2026-11-14')?.id).toBe('trip-1');
    expect(tripTiming(trip(), '2026-11-12')).toEqual({ kind: 'during', day: 3, of: 5 });
    expect(tripTiming(trip(), '2026-11-09')).toEqual({ kind: 'ahead', days: 1 });
  });

  it('lists prep due within a week, overdue first, and leaves out what is done', () => {
    const tr = trip();
    const plan = generatePlan(tr);
    const today = '2026-11-01';
    const due = plan.preTrip.filter((t) => t.date <= '2026-11-08').sort((a, b) => a.date.localeCompare(b.date));
    const first = homeTodos(tr, plan, today);
    expect(first.when).toBe('week');
    expect(first.tasks.map((t) => t.id)).toEqual(due.slice(0, HOME_TODOS).map((t) => t.id));
    expect(first.total).toBe(plan.preTrip.length);

    const done = trip({ doneIds: [due[0]!.id] });
    const after = homeTodos(done, generatePlan(done), today);
    expect(after.done).toBe(1);
    expect(after.tasks.map((t) => t.id)).not.toContain(due[0]!.id);
  });

  it("shows today's plan once the trip has started", () => {
    const tr = trip();
    const plan = generatePlan(tr);
    const todos = homeTodos(tr, plan, '2026-11-11');
    expect(todos.when).toBe('today');
    expect(todos.tasks.every((t) => t.date === '2026-11-11')).toBe(true);
    expect(todos.tasks.length).toBeGreaterThan(0);
  });
});
