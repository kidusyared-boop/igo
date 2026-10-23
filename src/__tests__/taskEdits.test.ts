import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { allowedDays, followsFlight, hiddenByTraveler, moveTask, partnerOf, resetTask, restoreHidden, saveTaskEdit } from '../features/planner/taskEdits';
import { buildReminders, LEAD_MINUTES } from '../features/reminders/buildReminders';
import { buildIcs } from '../services/ics';
import { mergeTrips } from '../services/sync';
import { normalizeTrip } from '../services/storage';
import { tryEdit } from '../features/planner/checkPlan';
import { sampleTrip } from '../data/sampleTrip';
import { translate } from '../i18n';
import type { Task, Trip } from '../types';
import { zonedToUtc } from '../utils/timezone';
import { shiftTime } from '../utils/dates';

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
const flexible = (tr: Trip) => generatePlan(tr).days[1]!.tasks.find((x) => x.time && x.source === 'auto' && !followsFlight(x) && !/:(spot|go)-/.test(x.id))!;

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

describe('moving a task moves what hangs on it', () => {
  const route = (): Trip => trip({
    startDate: '2026-11-10', endDate: '2026-11-16',
    stops: [{ id: 's1', cityId: 'harar', date: '2026-11-12' }, { id: 's2', cityId: 'addis', date: '2026-11-13' }],
  });
  const dayOf = (tr: Trip, date: string) => generatePlan(tr).days.find((d) => d.date === date)!;
  const taskOf = (tr: Trip, date: string, key: string) => dayOf(tr, date).tasks.find((x) => x.id === `auto:${date}:${key}`)!;

  it('moving the journey to Harar moves the stop and the return along with it', () => {
    const tr = route();
    const travel = taskOf(tr, '2026-11-12', 'move');
    const next = moveTask(tr, travel, { ...travel, date: '2026-11-14' });
    expect(next.stops).toEqual([{ id: 's1', cityId: 'harar', date: '2026-11-14' }, { id: 's2', cityId: 'addis', date: '2026-11-15' }]);
    expect(next.customTasks).toEqual([]);
    const plan = generatePlan(next);
    expect(plan.days.map((d) => d.cityId)).toEqual(['addis', 'addis', 'addis', 'addis', 'harar', 'addis', 'addis']);
    expect(dayOf(next, '2026-11-14').tasks.some((x) => x.id.endsWith(':move-out'))).toBe(true);
    expect(dayOf(next, '2026-11-12').tasks.some((x) => /:move(-in|-out)?$/.test(x.id))).toBe(false);
  });

  it('only offers days that keep every later journey inside the trip', () => {
    const tr = route();
    const travel = taskOf(tr, '2026-11-12', 'move-in');
    const days = generatePlan(tr).days;
    expect(allowedDays(tr, travel, days)).toEqual(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
    const back = taskOf(tr, '2026-11-13', 'move');
    expect(allowedDays(tr, back, days)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
  });

  it('a journey edited before this fix can still be moved, and the stale copy goes', () => {
    const tr = route();
    const travel = taskOf(tr, '2026-11-12', 'move');
    const old = saveTaskEdit(tr, travel, { ...travel, date: '2026-11-14' }, () => 'task_old');
    const copy = old.customTasks[0]!;
    const next = moveTask(old, copy, { ...copy, date: '2026-11-14' });
    expect(next.customTasks).toEqual([]);
    expect(next.hiddenIds).toEqual([]);
    expect(next.stops.find((s) => s.id === 's1')!.date).toBe('2026-11-14');
  });

  it('moving a sunset place moves leaving for it too, timed by the new day', () => {
    const tr = trip({ spots: [{ id: 'sp2', cityId: 'addis', name: 'Entoto Park viewpoint', light: 'sunset', shotList: 'City reveal' }] });
    const at = generatePlan(tr).days.find((d) => d.tasks.some((x) => x.id.endsWith(':spot-sp2')))!;
    const target = at.date === '2026-11-12' ? '2026-11-13' : '2026-11-12';
    const visit = at.tasks.find((x) => x.id.endsWith(':spot-sp2'))!;
    const next = moveTask(tr, visit, { ...visit, date: target }, tr.spots[0]);
    const day = dayOf(next, target);
    expect(day.tasks.map((x) => x.id)).toEqual(expect.arrayContaining([`auto:${target}:go-sp2`, `auto:${target}:spot-sp2`]));
    expect(all(next).filter((x) => x.id.endsWith('-sp2'))).toHaveLength(2);
  });

  it('moving a place igo picked pins it, and it stays in its own city', () => {
    const tr = route();
    const plan = generatePlan(tr);
    const { spot, date } = plan.pickedSpots.find((p) => p.spot.cityId === 'addis' && p.date >= '2026-11-13')!;
    const visit = dayOf(tr, date).tasks.find((x) => x.id === `auto:${date}:spot-${spot.id}`)!;
    const days = allowedDays(tr, visit, plan.days, spot);
    expect(days).not.toContain('2026-11-12');
    const target = days.find((d) => d !== date)!;
    const next = moveTask(tr, visit, { ...visit, date: target }, spot);
    expect(next.spots.find((s) => s.id === spot.id)?.date).toBe(target);
    expect(dayOf(next, target).tasks.some((x) => x.id === `auto:${target}:spot-${spot.id}`)).toBe(true);
  });

  it('changing the time of a visit moves leaving for it by as much', () => {
    const tr = trip({ spots: [{ id: 'sp2', cityId: 'addis', name: 'Entoto Park viewpoint', light: 'sunset', shotList: 'City reveal' }] });
    const day = generatePlan(tr).days.find((d) => d.tasks.some((x) => x.id.endsWith(':spot-sp2')))!;
    const visit = day.tasks.find((x) => x.id.endsWith(':spot-sp2'))!;
    const go = partnerOf(visit, day.tasks)!;
    const next = moveTask(tr, visit, { ...visit, time: shiftTime(visit.time!, -30) }, tr.spots[0], go);
    const tasks = dayOf(next, day.date).tasks;
    expect(tasks.find((x) => x.replaces === go.id)?.time).toBe(shiftTime(go.time!, -30));
  });

  it('a place pinned to a day the route now spends elsewhere is planned again in its city', () => {
    const tr = { ...route(), spots: [{ id: 'mine', cityId: 'harar', name: 'Hyena feeding', light: 'night' as const, shotList: '', date: '2026-11-12' }] };
    const moved = { ...tr, stops: [{ id: 's1', cityId: 'harar', date: '2026-11-14' }, { id: 's2', cityId: 'addis', date: '2026-11-15' }] };
    const plan = generatePlan(moved);
    expect(dayOf(moved, '2026-11-12').tasks.some((x) => x.id.includes('-mine'))).toBe(false);
    expect(plan.days.find((d) => d.tasks.some((x) => x.id.endsWith(':spot-mine')))?.cityId).toBe('harar');
  });

  it('airport and flight tasks stay on their day', () => {
    const tr = route();
    const days = generatePlan(tr).days;
    expect(allowedDays(tr, taskOf(tr, '2026-11-16', 'airport'), days)).toEqual(['2026-11-16']);
  });
});

describe('what Kidus hit on his iPhone', () => {
  const route = (): Trip => trip({
    startDate: '2026-11-10', endDate: '2026-11-15',
    stops: [{ id: 's1', cityId: 'harar', date: '2026-11-12' }, { id: 's2', cityId: 'addis', date: '2026-11-14' }],
    spots: [{ id: 'sp5', cityId: 'harar', name: 'Jugol old town alleys', light: 'sunrise', shotList: 'Painted doors' }],
  });
  const plan = (tr: Trip) => generatePlan(tr);

  it('never moves a journey so far that the return falls after the flight home', () => {
    const tr = route();
    const travel = plan(tr).days.find((d) => d.date === '2026-11-12')!.tasks.find((x) => x.id.endsWith(':move'))!;
    expect(allowedDays(tr, travel, plan(tr).days)).toEqual(['2026-11-11', '2026-11-12', '2026-11-13']);
    expect(moveTask(tr, travel, { ...travel, date: '2026-11-14' })).toBe(tr);
    const ok = moveTask(tr, travel, { ...travel, date: '2026-11-13' });
    expect(plan(ok).days.at(-1)!.cityId).toBe('addis');
  });

  it('a place whose time was changed stays in its city after the journey there moves', () => {
    const tr = route();
    const day = plan(tr).days.find((d) => d.tasks.some((x) => x.id.endsWith(':spot-sp5')))!;
    const visit = day.tasks.find((x) => x.id.endsWith(':spot-sp5'))!;
    const timed = moveTask(tr, visit, { ...visit, time: shiftTime(visit.time!, -10) }, tr.spots[0], partnerOf(visit, day.tasks));
    const travel = plan(timed).days.find((d) => d.date === '2026-11-12')!.tasks.find((x) => x.id.endsWith(':move'))!;
    const moved = moveTask(timed, travel, { ...travel, date: '2026-11-13' });
    const days = plan(moved).days;
    const withJugol = days.filter((d) => d.tasks.some((x) => /Jugol/.test(x.title)));
    expect(withJugol.length).toBe(1);
    expect(withJugol[0]!.cityId).toBe('harar');
    expect(withJugol[0]!.tasks.filter((x) => /Jugol/.test(x.title))).toHaveLength(2);
    expect(withJugol[0]!.tasks.find((x) => /^Shoot Jugol/.test(x.title))?.time).toBe(shiftTime(visit.time!, -10));
  });

  it('an edited journey task goes along when its journey moves', () => {
    const tr = route();
    const checkIn = plan(tr).days.find((d) => d.date === '2026-11-12')!.tasks.find((x) => x.id.endsWith(':move-in'))!;
    const edited = moveTask(tr, checkIn, { ...checkIn, title: 'Check in at Ras Hotel' });
    const travel = plan(edited).days.find((d) => d.date === '2026-11-12')!.tasks.find((x) => x.id.endsWith(':move'))!;
    const moved = moveTask(edited, travel, { ...travel, date: '2026-11-13' });
    const day = plan(moved).days.find((d) => d.date === '2026-11-13')!;
    expect(day.tasks.filter((x) => /^Check in/.test(x.title)).map((x) => x.title)).toEqual(['Check in at Ras Hotel']);
    expect(plan(moved).days.find((d) => d.date === '2026-11-12')!.tasks.some((x) => /Check in/.test(x.title))).toBe(false);
  });

  it('copies left loose by the first version are cleared when the trip loads', () => {
    const tr = route();
    const travel = plan(tr).days.find((d) => d.date === '2026-11-12')!.tasks.find((x) => x.id.endsWith(':move'))!;
    const broken = saveTaskEdit(tr, travel, { ...travel, date: '2026-11-14' }, () => 'task_loose');
    const fixed = normalizeTrip(broken);
    expect(fixed.customTasks).toEqual([]);
    expect(fixed.hiddenIds).toEqual([]);
  });
});

describe('the checker refuses a place at a time you cannot be there', () => {
  const tr = trip({
    startDate: '2026-11-10', endDate: '2026-11-15',
    stops: [{ id: 's1', cityId: 'harar', date: '2026-11-12' }, { id: 's2', cityId: 'addis', date: '2026-11-14' }],
    spots: [
      { id: 'sp4', cityId: 'harar', name: 'Hyena feeding outside the walls', light: 'night', shotList: '', date: '2026-11-12' },
      { id: 'sp9', cityId: 'harar', name: 'Old town walk', light: 'any', shotList: '', date: '2026-11-13' },
    ],
  });
  const plan = generatePlan(tr);
  const day = plan.days.find((d) => d.date === '2026-11-12')!;
  const hyena = day.tasks.find((x) => x.id.endsWith(':spot-sp4'))!;

  it('a Harar outing before you have travelled to Harar', () => {
    const walk = plan.days.find((d) => d.date === '2026-11-13')!.tasks.find((x) => x.id.endsWith(':spot-sp9'))!;
    const moved = tryEdit(tr, plan, walk, { ...walk, date: '2026-11-12' });
    expect('trip' in moved).toBe(true);
    const after = 'trip' in moved ? moved.trip : tr;
    const p2 = generatePlan(after);
    const early = p2.days.find((d) => d.date === '2026-11-12')!.tasks.find((x) => x.id.endsWith(':spot-sp9'))!;
    const result = tryEdit(after, p2, early, { ...early, time: '08:30' });
    expect('problem' in result && result.problem.code).toBe('beforeCheckIn');
  });

  it('a night outing moved to the morning', () => {
    const result = tryEdit(tr, plan, hyena, { ...hyena, time: '07:17' });
    expect('problem' in result).toBe(true);
    expect('problem' in result && ['beforeCheckIn', 'wrongLight']).toContain('problem' in result && result.problem.code);
  });

  it('a night outing moved a little later is fine', () => {
    const result = tryEdit(tr, plan, hyena, { ...hyena, time: shiftTime(hyena.time!, 20) });
    expect('trip' in result).toBe(true);
  });
});

describe('repairing a trip saved before the checker', () => {
  it("puts back igo's version of a night outing someone moved to the morning", () => {
    const tr = trip({ spots: [{ id: 'sp4', cityId: 'addis', name: 'Night walk', light: 'night', shotList: '', date: '2026-11-12' }] });
    const visit = generatePlan(tr).days.find((d) => d.date === '2026-11-12')!.tasks.find((x) => x.id.endsWith(':spot-sp4'))!;
    const broken = saveTaskEdit(tr, visit, { ...visit, time: '07:17' }, () => 'task_bad');
    const fixed = normalizeTrip(broken);
    expect(fixed.customTasks).toEqual([]);
    expect(generatePlan(fixed).days.find((d) => d.date === '2026-11-12')!.tasks.find((x) => x.id.endsWith(':spot-sp4'))!.time).toBe(visit.time);
  });
});
