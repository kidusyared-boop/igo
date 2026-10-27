import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { festivals, holidayNotes, irreecha } from '../data/ethiopia/holidays';
import { sampleTrip } from '../data/sampleTrip';
import type { Trip } from '../types';
import { toMinutes } from '../utils/dates';

const trip = (over: Partial<Trip>): Trip => ({ ...sampleTrip(), spots: [], customTasks: [], stops: [], ...over });
const day = (plan: ReturnType<typeof generatePlan>, date: string) => plan.days.find((d) => d.date === date)!;
const pre = (plan: ReturnType<typeof generatePlan>, key: string) => plan.preTrip.find((t) => t.id === `auto:pre:${key}`);

// Timkat 2027 is on 19 January, so its eve is the 18th.
describe('festivals', () => {
  it('dates the eve and the main day', () => {
    const timkat = festivals('2027-01-15', '2027-01-25').find((f) => f.key === 'timkat')!;
    expect(timkat.date).toBe('2027-01-19');
    expect(timkat.events.find((e) => e.key === 'timkat-eve-gondar')?.date).toBe('2027-01-18');
    expect(festivals('2026-09-20', '2026-09-30').find((f) => f.key === 'meskel')?.events[0]?.date).toBe('2026-09-26');
  });

  it('plans Timkat in Gondar and keeps other plans out of its way', () => {
    const plan = generatePlan(trip({
      startDate: '2027-01-15', endDate: '2027-01-22', interests: ['religion', 'history', 'countryside'], pace: 'packed',
      stops: [{ id: 's1', cityId: 'gondar', date: '2027-01-17' }, { id: 's2', cityId: 'addis', date: '2027-01-21' }],
    }));
    const eve = day(plan, '2027-01-18');
    const feast = day(plan, '2027-01-19');
    expect(eve.tasks.find((t) => t.id.endsWith('fest-timkat-eve-gondar'))?.time).toBe('13:00');
    expect(feast.tasks.find((t) => t.id.endsWith('fest-timkat-gondar'))?.time).toBe('06:00');
    for (const d of [eve, feast]) {
      expect(d.tasks.some((t) => /^Day trip/i.test(t.title))).toBe(false);
    }
    // Nothing else to shoot or visit during the procession.
    const clash = eve.tasks.filter((t) => !t.id.includes(':fest-') && (t.category === 'shoot' || t.category === 'explore') && toMinutes(t.time!) >= toMinutes('12:00') && toMinutes(t.time!) < toMinutes('16:30'));
    expect(clash).toEqual([]);
    expect(eve.tasks.find((t) => t.id.endsWith(':edit'))?.time).toBe('20:30');
    expect(pre(plan, 'fest-book-timkat')?.title).toMatch(/Gondar/);
    // The bath is the feast itself, so it is not planned again as a separate visit.
    expect(plan.days.flatMap((d) => d.tasks).filter((t) => /Fasilides Bath/.test(t.title) && !t.id.includes(':fest-'))).toEqual([]);
  });

  it('says so when the route leaves a festival city just before the feast', () => {
    const plan = generatePlan(trip({
      startDate: '2027-01-12', endDate: '2027-01-22',
      stops: [{ id: 's1', cityId: 'gondar', date: '2027-01-14' }, { id: 's2', cityId: 'bahir-dar', date: '2027-01-17' }],
    }));
    expect(pre(plan, 'fest-route-timkat')?.title).toBe('Change your route to be in Gondar for Timkat');
    expect(plan.days.some((d) => d.tasks.some((t) => t.id.includes(':fest-')))).toBe(false);
  });

  it('suggests where to go when no festival city is on the route', () => {
    const plan = generatePlan(trip({ cityId: 'hawassa', startDate: '2027-01-16', endDate: '2027-01-21' }));
    expect(pre(plan, 'fest-route-timkat')?.detail).toMatch(/Gondar, Lalibela and Addis Ababa/);
  });

  it('plans the Meskel bonfire in Addis Ababa over the afternoon and sunset', () => {
    const plan = generatePlan(trip({ startDate: '2026-09-24', endDate: '2026-09-29', interests: ['culture', 'city'], pace: 'packed' }));
    const eve = day(plan, '2026-09-26');
    expect(eve.tasks.find((t) => t.id.endsWith('fest-meskel-eve-addis'))?.time).toBe('14:00');
    expect(eve.tasks.some((t) => /golden hour/.test(t.title))).toBe(false);
  });

  it('leaves festivals out for travelers who did not ask for them', () => {
    const plan = generatePlan(trip({ mode: 'traveler', interests: ['food', 'wildlife'], startDate: '2027-01-15', endDate: '2027-01-22', stops: [{ id: 's1', cityId: 'gondar', date: '2027-01-17' }] }));
    expect(plan.days.some((d) => d.tasks.some((t) => t.id.includes(':fest-')))).toBe(false);
    expect(plan.preTrip.some((t) => t.id.includes(':fest-'))).toBe(false);
  });

  it('expects Irreecha on the first-week October weekend', () => {
    expect(irreecha(2026)).toBe('2026-10-04');
    expect(irreecha(2025)).toBe('2025-10-05');
    expect(irreecha(2016)).toBe('2016-10-02');
    expect(holidayNotes('2026-10-03').map((n) => n.kind)).toContain('event');
  });

  it('plans Irreecha in Addis Ababa and at Bishoftu, without a second Bishoftu day trip', () => {
    const plan = generatePlan(trip({ startDate: '2026-10-01', endDate: '2026-10-07', interests: ['culture', 'countryside'], pace: 'packed' }));
    expect(day(plan, '2026-10-03').tasks.find((t) => t.id.endsWith('fest-irreecha-addis'))?.time).toBe('06:00');
    expect(day(plan, '2026-10-04').tasks.find((t) => t.id.endsWith('fest-irreecha-bishoftu'))?.time).toBe('05:30');
    expect(plan.days.flatMap((d) => d.tasks).filter((t) => /Bishoftu crater lakes/.test(t.title))).toEqual([]);
    expect(pre(plan, 'fest-book-irreecha')?.title).toBe('Book a car to Bishoftu for Irreecha');
  });

  it('plans the Great Ethiopian Run in Addis Ababa and warns everyone about the road closures', () => {
    const plan = generatePlan(trip({ startDate: '2026-11-20', endDate: '2026-11-24', interests: ['culture'] }));
    expect(day(plan, '2026-11-22').tasks.find((t) => t.id.endsWith('fest-great-run-addis'))?.time).toBe('07:30');
    expect(pre(plan, 'fest-book-great-run')?.detail).toMatch(/Wed, Nov 11/);
    expect(holidayNotes('2026-11-22').some((n) => /Great Ethiopian Run/.test(n.text))).toBe(true);
    // Years without an announced date get nothing rather than a guess.
    expect(festivals('2027-11-01', '2027-11-30').some((f) => f.key === 'great-run')).toBe(false);
  });

  it('points travelers elsewhere to Addis Ababa for the run', () => {
    const plan = generatePlan(trip({ cityId: 'hawassa', startDate: '2026-11-20', endDate: '2026-11-24', interests: ['culture'] }));
    const prep = pre(plan, 'fest-route-great-run');
    expect(prep?.title).toBe('Decide where to spend the Great Ethiopian Run');
    expect(prep?.detail).toMatch(/^The Great Ethiopian Run is on Sun, Nov 22/);
  });
});
