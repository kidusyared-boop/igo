import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { travelDetail } from '../features/planner/route';
import { findCity, findCountry } from '../data/countries';
import { sampleTrip } from '../data/sampleTrip';
import type { Trip } from '../types';
import { toMinutes } from '../utils/dates';

// Problems found by planning real routes end to end, October 2026.
const trip = (over: Partial<Trip>): Trip => ({ ...sampleTrip(), spots: [], customTasks: [], stops: [], ...over });
const titles = (plan: ReturnType<typeof generatePlan>, date: string) => plan.days.find((d) => d.date === date)?.tasks.map((t) => t.title) ?? [];

describe('plans from real routes', () => {
  it('keeps whole-day trips off arrival days and alone on their day', () => {
    const plan = generatePlan(trip({ startDate: '2027-01-10', endDate: '2027-01-16', arrivalTime: '06:45', interests: ['religion', 'history', 'countryside'], pace: 'packed' }));
    for (const day of plan.days) {
      const away = day.tasks.filter((t) => /^day trip/i.test(t.title));
      if (!away.length) continue;
      expect(day.kind).toBe('full');
      expect(away).toHaveLength(1);
      const daylight = day.tasks.filter((t) => (t.category === 'shoot' || t.category === 'explore') && !/^day trip/i.test(t.title) && /golden hour|^Shoot (?!.*sunrise)|^Visit (?!.*sunrise)/.test(t.title));
      expect(daylight).toEqual([]);
    }
  });

  it('only puts fixed-day markets on their day', () => {
    // Key Afer runs on Thursdays.
    const plan = generatePlan(trip({ cityId: 'jinka', startDate: '2027-03-08', endDate: '2027-03-14', interests: ['markets'], pace: 'packed' }));
    const day = plan.days.find((d) => d.tasks.some((t) => /Key Afer/.test(t.title)));
    expect(day).toBeDefined();
    expect(new Date(`${day!.date}T12:00:00Z`).getUTCDay()).toBe(4);
  });

  it('wraps up the evening before a flight in the small hours', () => {
    const plan = generatePlan(trip({ startDate: '2027-03-01', endDate: '2027-03-05', departureTime: '03:10' }));
    const eve = titles(plan, '2027-03-04');
    expect(eve.some((t) => t.startsWith('Pack, settle your bill and book a ride for 00:10'))).toBe(true);
    expect(eve.some((t) => /Spend or exchange/.test(t))).toBe(true);
    expect(titles(plan, '2027-03-05')).toEqual(['Leave for the airport', 'Flight departs']);
  });

  it('does not say lights out before a late landing', () => {
    const plan = generatePlan(trip({ startDate: '2027-01-05', endDate: '2027-01-09', arrivalTime: '22:30' }));
    const day = plan.days[0]!;
    const land = toMinutes(day.tasks.find((t) => t.title === 'Land and clear immigration')!.time!);
    expect(day.tasks.every((t) => t.category !== 'rest' || toMinutes(t.time!) >= land)).toBe(true);
    expect(day.tasks.some((t) => /Lights out/.test(t.title))).toBe(false);
  });

  it('has one check-in on an early arrival', () => {
    const plan = generatePlan(trip({ startDate: '2027-01-10', endDate: '2027-01-12', arrivalTime: '06:45' }));
    expect(plan.days[0]!.tasks.filter((t) => /check-in|Check in/.test(t.title))).toHaveLength(1);
  });

  it('routes moves between two smaller cities through Addis Ababa', () => {
    const et = findCountry('ET')!;
    const city = (id: string) => findCity('ET', id)!;
    expect(travelDetail(city('addis'), city('harar'), et)).toBe(city('harar').access);
    expect(travelDetail(city('harar'), city('arba-minch'), et)).toMatch(/through Addis Ababa/);
    expect(travelDetail(city('harar'), city('addis'), et)).toMatch(/^The way you came/);
  });
});
