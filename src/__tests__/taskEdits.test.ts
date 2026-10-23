import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { followsFlight, hiddenByTraveler, resetTask, restoreHidden, saveTaskEdit } from '../features/planner/taskEdits';
import { buildReminders, LEAD_MINUTES } from '../features/reminders/buildReminders';
import { buildIcs } from '../services/ics';
import { mergeTrips } from '../services/sync';
import { sampleTrip } from '../data/sampleTrip';
import { translate } from '../i18n';
import type { Task, Trip } from '../types';
import { zonedToUtc } from '../utils/timezone';

const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const trip = (over: Partial<Trip> = {}): Trip => ({
  ...sampleTrip(), id: 'trip-1', name: 'Addis week', spots: [], customTasks: [], stops: [],
  startDate: '2026-11-10', endDate: '2026-11-14', ...over,
});
const ids = (() => {
  let n = 0;
  return () => `task_${++n}`;
})();
const all = (tr: Trip) => generatePlan(tr).days.flatMap((d) => d.tasks);
const flexible = (tr: Trip) => generatePlan(tr).days[1]!.tasks.find((x) => x.time && x.source === 'auto' && !followsFlight(x))!;

describe('editing and moving tasks', () => {
  it('moves an igo task to another day and time, and it leaves its old day', () => {
    const tr = trip();
    const task = flexible(tr);
    const next = saveTaskEdit(tr, task, { ...task, date: '2026-11-13', time: '16:45', title: 'Coffee with Selam' }, ids);
    const plan = generatePlan(next);
    expect(plan.days[1]!.tasks.some((x) => x.id === task.id || x.title === 'Coffee with Selam')).toBe(false);
    const moved = plan.days[3]!.tasks.find((x) => x.title === 'Coffee with Selam')!;
    expect(moved).toMatchObject({ time: '16:45', source: 'user', replaces: task.id, category: task.category });
  });

  it('keeps the change when the plan is rebuilt for new interests or a new pace', () => {
    const tr = trip();
    const task = flexible(tr);
    const edited = saveTaskEdit(tr, task, { ...task, title: 'My version' }, ids);
    for (const over of [{ interests: ['hiking' as const] }, { pace: 'packed' as const }, { mode: 'traveler' as const }]) {
      const titles = all({ ...edited, ...over }).map((x) => x.title);
      expect(titles.filter((x) => x === 'My version')).toHaveLength(1);
    }
  });

  it('keeps the tick on the edited copy', () => {
    const tr = trip();
    const task = flexible(tr);
    const done = { ...tr, doneIds: [task.id] };
    const next = saveTaskEdit(done, task, { ...task, time: '11:15' }, () => 'task_done');
    expect(next.doneIds).toContain('task_done');
  });

  it("edits the traveler's own task in place, without a copy", () => {
    const mine: Task = { id: 'task_mine', date: '2026-11-11', time: '09:00', title: 'Gym', category: 'rest', source: 'user' };
    const tr = trip({ customTasks: [mine] });
    const next = saveTaskEdit(tr, mine, { ...mine, date: '2026-11-12', time: '07:00' }, ids);
    expect(next.customTasks).toEqual([{ ...mine, date: '2026-11-12', time: '07:00' }]);
    expect(next.hiddenIds).toEqual([]);
  });

  it("puts igo's version back on undo", () => {
    const tr = trip();
    const task = flexible(tr);
    const next = saveTaskEdit(tr, task, { ...task, title: 'Changed' }, () => 'task_copy');
    const back = resetTask(next, 'task_copy');
    expect(back.customTasks).toEqual([]);
    expect(back.hiddenIds).toEqual([]);
    expect(all(back).some((x) => x.id === task.id)).toBe(true);
  });

  it('"Show hidden" does not bring back the old version next to the edited one', () => {
    const tr = trip();
    const [a, b] = generatePlan(tr).days[1]!.tasks.filter((x) => x.source === 'auto');
    const edited = saveTaskEdit({ ...tr, hiddenIds: [b!.id] }, a!, { ...a!, title: 'Edited' }, ids);
    expect(hiddenByTraveler(edited)).toEqual([b!.id]);
    const restored = restoreHidden(edited);
    expect(restored.hiddenIds).toEqual([a!.id]);
    expect(all(restored).filter((x) => x.id === a!.id)).toHaveLength(0);
  });

  it('a moved task gets its reminder at the new time, and the calendar file follows', () => {
    const tr = trip();
    const task = flexible(tr);
    const next = saveTaskEdit(tr, task, { ...task, date: '2026-11-12', time: '17:05', title: 'Moved task' }, ids);
    const list = buildReminders([next], (x) => generatePlan(x), new Date('2026-08-01T00:00:00Z'), t);
    const r = list.find((x) => x.title === 'Moved task')!;
    expect(r.at.getTime()).toBe(zonedToUtc('2026-11-12', '17:05', 'Africa/Addis_Ababa').getTime() - LEAD_MINUTES * 60_000);
    expect(buildIcs(next, generatePlan(next), 'Africa/Addis_Ababa')).toContain('SUMMARY:Moved task');
  });

  it('a task dated after a trip that got shorter shows on its last day', () => {
    const mine: Task = { id: 'task_late', date: '2026-11-14', time: '12:00', title: 'Souvenirs', category: 'explore', source: 'user' };
    const plan = generatePlan(trip({ customTasks: [mine], endDate: '2026-11-13' }));
    expect(plan.days.at(-1)!.tasks.find((x) => x.id === 'task_late')?.date).toBe('2026-11-13');
  });

  it('flight times stay tied to the trip details', () => {
    const days = generatePlan(trip()).days;
    expect(followsFlight(days[0]!.tasks.find((x) => x.id.endsWith(':land'))!)).toBe(true);
    expect(followsFlight(days.at(-1)!.tasks.find((x) => x.id.endsWith(':flight'))!)).toBe(true);
    expect(followsFlight(flexible(trip()))).toBe(false);
  });

  it('an edit on one phone reaches the other through sync', () => {
    const tr = { ...trip(), updatedAt: '2026-10-01T00:00:00Z' };
    const task = flexible(tr);
    const edited = { ...saveTaskEdit(tr, task, { ...task, title: 'From my phone' }, ids), updatedAt: '2026-10-02T00:00:00Z' };
    const merged = mergeTrips([tr], [], [{ id: tr.id, data: edited, updated_at: edited.updatedAt, deleted: false }]);
    expect(all(merged.trips[0]!).some((x) => x.title === 'From my phone')).toBe(true);
  });
});
