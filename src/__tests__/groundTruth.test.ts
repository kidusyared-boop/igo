import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { findCity } from '../data/countries';
import { ETHIOPIA } from '../data/ethiopia/ethiopia';
import { PLACES } from '../data/ethiopia/places';
import { sampleTrip } from '../data/sampleTrip';
import type { Trip } from '../types';
import { toMinutes } from '../utils/dates';

// Plans that would fail on the ground, found in the gap audit of October 2026.
const trip = (over: Partial<Trip>): Trip => ({ ...sampleTrip(), spots: [], customTasks: [], stops: [], ...over });
const day = (plan: ReturnType<typeof generatePlan>, date: string) => plan.days.find((d) => d.date === date)!;
const at = (plan: ReturnType<typeof generatePlan>, date: string, key: string) => day(plan, date).tasks.find((t) => t.id === `auto:${date}:${key}`);

describe('plans that hold up on the ground', () => {
  it('flies home from Addis Ababa when the trip ends somewhere else', () => {
    const plan = generatePlan(trip({ startDate: '2027-02-02', endDate: '2027-02-13', departureTime: '14:00', stops: [{ id: 'a', cityId: 'jinka', date: '2027-02-10' }] }));
    const back = at(plan, '2027-02-13', 'airport-hub');
    expect(back?.title).toMatch(/Leave for Addis Ababa/);
    // 14:00 flight, at Bole by 11:00, about 4.5 hours from Jinka.
    expect(back?.time).toBe('07:30');
    expect(back?.detail).toMatch(/by 11:00/);
    expect(day(plan, '2027-02-13').tasks.every((t) => !/Ride, Feres/.test(t.detail ?? '') || t.id.endsWith(':airport-hub'))).toBe(true);
    expect(plan.preTrip.some((t) => t.id === 'auto:pre:end-hub')).toBe(true);
  });

  it('tells travelers to sleep in Addis Ababa when the flight home is too early to reach', () => {
    const plan = generatePlan(trip({ startDate: '2027-02-02', endDate: '2027-02-06', departureTime: '08:45', stops: [{ id: 'a', cityId: 'harar', date: '2027-02-04' }] }));
    expect(day(plan, '2027-02-06').tasks.map((t) => t.title)).toEqual(['Be at the airport in Addis Ababa for your flight home', 'Flight departs']);
    expect(plan.preTrip.find((t) => t.id === 'auto:pre:end-hub')?.detail).toMatch(/last night in Addis Ababa/);
  });

  it('connects through Addis Ababa when the trip starts somewhere else', () => {
    const plan = generatePlan(trip({ cityId: 'harar', startDate: '2027-02-02', endDate: '2027-02-06', arrivalTime: '07:00' }));
    const first = day(plan, '2027-02-02');
    expect(at(plan, '2027-02-02', 'connect')?.title).toBe('Catch your connection to Harar');
    // Five hours from Bole to Harar, plus an hour at the airport.
    const checkIn = toMinutes(at(plan, '2027-02-02', 'checkin')!.time!);
    expect(checkIn).toBe(toMinutes('13:00'));
    expect(first.tasks.filter((t) => t.id.includes(':spot-')).every((t) => toMinutes(t.time!) > checkIn)).toBe(true);
    expect(plan.preTrip.some((t) => t.id === 'auto:pre:start-hub')).toBe(true);
  });

  it('gives a long move the whole day instead of an afternoon outing', () => {
    const plan = generatePlan(trip({ startDate: '2027-02-02', endDate: '2027-02-12', stops: [{ id: 'a', cityId: 'harar', date: '2027-02-04' }, { id: 'b', cityId: 'arba-minch', date: '2027-02-07' }] }));
    const move = day(plan, '2027-02-07');
    // Harar to Arba Minch goes back through Addis Ababa: about 10 hours.
    expect(at(plan, '2027-02-07', 'move-in')?.time).toBe('19:30');
    expect(move.tasks.some((t) => t.id.includes(':spot-') || t.id.endsWith(':settle-walk'))).toBe(false);
    // Addis Ababa to Harar is a short hop and still gets one.
    expect(day(plan, '2027-02-04').tasks.some((t) => t.id.includes(':spot-') || t.id.endsWith(':settle-walk'))).toBe(true);
  });

  it('warns when a move takes more than a day', () => {
    const plan = generatePlan(trip({ startDate: '2026-11-20', endDate: '2026-11-29', stops: [{ id: 'a', cityId: 'lalibela', date: '2026-11-23' }] }));
    expect(at(plan, '2026-11-23', 'move')?.detail).toMatch(/more than a day/);
  });

  it('uses roads between nearby cities', () => {
    const plan = generatePlan(trip({ cityId: 'arba-minch', startDate: '2027-02-02', endDate: '2027-02-08', stops: [{ id: 'a', cityId: 'jinka', date: '2027-02-05' }] }));
    expect(at(plan, '2027-02-05', 'move')?.detail).toMatch(/^About 6 hours by road/);
    expect(at(plan, '2027-02-05', 'move-in')?.time).toBe('15:30');
  });

  it('does not offer flights that are suspended', () => {
    for (const id of ['lalibela', 'axum', 'danakil']) {
      expect(findCity('ET', id)?.access, id).not.toMatch(/^(Ethiopian Airlines flight|Fly to)/);
    }
  });

  it('keeps meat off fasting days for travelers who keep the fast', () => {
    const fasting = (date: string) => Boolean(ETHIOPIA.dayNotes?.(date).some((n) => n.kind === 'fasting'));
    const fastFood = new Set(Object.values(PLACES).flat().filter((p) => p.diets?.some((d) => d === 'fasting' || d === 'vegan')).map((p) => p.name));
    const plan = generatePlan(trip({ startDate: '2027-01-14', endDate: '2027-01-27', diets: ['fasting'], interests: ['food', 'culture'], pace: 'relaxed', mode: 'traveler' }));
    const meals = plan.days.filter((d) => fasting(d.date)).flatMap((d) => d.tasks.filter((t) => t.category === 'food'));
    expect(meals.length).toBeGreaterThan(0);
    for (const meal of meals) expect([...fastFood].some((name) => meal.title.includes(name) || meal.title.includes(name.replace(/^(Lunch|Dinner):\s*/, ''))), meal.title).toBe(true);
    expect(plan.days.filter((d) => fasting(d.date)).some((d) => d.tasks.some((t) => /Kitfo/.test(t.title)))).toBe(false);
  });

  it('starts dinner after an evening outing is over', () => {
    const plan = generatePlan(trip({ startDate: '2026-11-20', endDate: '2026-11-29', mode: 'creator', interests: ['city', 'food', 'coffee', 'culture', 'history', 'religion'], pace: 'packed', stops: [{ id: 'a', cityId: 'lalibela', date: '2026-11-23' }, { id: 'b', cityId: 'harar', date: '2026-11-25' }, { id: 'c', cityId: 'addis', date: '2026-11-28' }] }));
    const both = plan.days.filter((d) => d.tasks.some((t) => /after dark/.test(t.title)) && d.tasks.some((t) => /^Dinner/.test(t.title)));
    expect(both.length).toBeGreaterThan(0);
    for (const d of both) {
      const night = toMinutes(d.tasks.find((t) => /after dark/.test(t.title))!.time!);
      const dinner = toMinutes(d.tasks.find((t) => /^Dinner/.test(t.title))!.time!);
      expect(dinner - night, d.date).toBeGreaterThanOrEqual(90);
    }
  });
});
