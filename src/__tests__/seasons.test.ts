import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { checkPlan } from '../features/planner/checkPlan';
import { sampleTrip } from '../data/sampleTrip';
import type { Trip, TripPlan } from '../types';
import { toMinutes } from '../utils/dates';

const trip = (over: Partial<Trip>): Trip => ({ ...sampleTrip(), spots: [], customTasks: [], stops: [], ...over });
const pre = (plan: TripPlan, key: string) => plan.preTrip.find((t) => t.id === `auto:pre:${key}`);
const outdoorTimes = (plan: TripPlan) =>
  plan.pickedSpots
    .filter(({ spot }) => spot.outdoor && spot.light === 'any' && !spot.allDay)
    .map(({ spot, date }) => plan.days.find((d) => d.date === date)!.tasks.find((t) => t.id.endsWith(`:spot-${spot.id}`))!.time!);

const outdoorsy: Partial<Trip> = { interests: ['countryside', 'hiking', 'wildlife', 'history'], pace: 'packed' };

describe('seasons', () => {
  it('warns about the main rains and plans outdoor places in the morning', () => {
    const rainy = trip({
      ...outdoorsy, startDate: '2027-07-10', endDate: '2027-07-18',
      stops: [{ id: 's1', cityId: 'gondar', date: '2027-07-12' }, { id: 's2', cityId: 'simien', date: '2027-07-14' }, { id: 's3', cityId: 'addis', date: '2027-07-17' }],
    });
    const plan = generatePlan(rainy);
    expect(pre(plan, 'season-simien-main-rains')?.title).toBe('Plan for the main rains in Simien Mountains (Debark)');
    expect(pre(plan, 'season-addis-main-rains')).toBeDefined();
    expect(plan.days.every((d) => d.notes.some((n) => n.kind === 'season'))).toBe(true);
    const times = outdoorTimes(plan);
    expect(times.length).toBeGreaterThan(0);
    for (const time of times) expect(toMinutes(time)).toBeLessThan(toMinutes('12:00'));
    expect(checkPlan(rainy, plan)).toEqual([]);
  });

  it('says nothing in the dry season', () => {
    const plan = generatePlan(trip({
      ...outdoorsy, startDate: '2027-01-10', endDate: '2027-01-18',
      stops: [{ id: 's1', cityId: 'gondar', date: '2027-01-12' }, { id: 's2', cityId: 'simien', date: '2027-01-14' }, { id: 's3', cityId: 'addis', date: '2027-01-17' }],
    }));
    expect(plan.preTrip.some((t) => t.id.includes(':season-'))).toBe(false);
    expect(plan.days.some((d) => d.notes.some((n) => n.kind === 'season'))).toBe(false);
    // Out of season, the afternoon slot is open to outdoor places again.
    expect(outdoorTimes(plan).some((time) => toMinutes(time) >= toMinutes('12:00'))).toBe(true);
  });

  it('leaves out Omo village day trips when the long rains close the roads', () => {
    const omo = (startDate: string, endDate: string) =>
      trip({ interests: ['culture', 'markets', 'countryside'], pace: 'packed', cityId: 'addis', startDate, endDate, stops: [{ id: 's1', cityId: 'jinka', date: startDate.slice(0, 8) + '03' }, { id: 's2', cityId: 'addis', date: startDate.slice(0, 8) + '09' }] });
    const dayTrips = (plan: TripPlan) => plan.pickedSpots.filter(({ spot }) => spot.cityId === 'jinka' && spot.allDay);
    const wet = generatePlan(omo('2027-04-01', '2027-04-10'));
    expect(dayTrips(wet)).toEqual([]);
    expect(wet.pickedSpots.some(({ spot }) => spot.cityId === 'jinka')).toBe(true);
    expect(pre(wet, 'season-jinka-long-rains')?.detail).toMatch(/impassable/);
    expect(dayTrips(generatePlan(omo('2027-07-01', '2027-07-10'))).length).toBeGreaterThan(0);
    // The traveler's own day trip stays: it is their call.
    const own = omo('2027-04-01', '2027-04-10');
    own.spots = [{ id: 'mine', cityId: 'jinka', name: 'Mursi village, Mago National Park', light: 'any', shotList: '', allDay: true }];
    expect(generatePlan(own).days.some((d) => d.tasks.some((t) => t.id.endsWith(':spot-mine')))).toBe(true);
  });

  it('warns about Danakil heat in summer', () => {
    const plan = generatePlan(trip({
      interests: ['adventure'], startDate: '2027-06-01', endDate: '2027-06-08',
      stops: [{ id: 's1', cityId: 'danakil', date: '2027-06-03' }, { id: 's2', cityId: 'addis', date: '2027-06-07' }],
    }));
    expect(pre(plan, 'season-danakil-heat')?.title).toBe('Plan for the hottest months in Danakil Depression (via Semera)');
    expect(plan.days.find((d) => d.cityId === 'danakil')?.notes.find((n) => n.kind === 'season')?.text).toMatch(/45 °C/);
  });
});
