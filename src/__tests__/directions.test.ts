import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { MAP_QUERIES, placeQuery } from '../features/places/mapQuery';
import { buildIcs } from '../services/ics';
import { phoneEvents } from '../services/phoneCalendar';
import { ETHIOPIA as ethiopia } from '../data/ethiopia/ethiopia';
import { sampleTrip } from '../data/sampleTrip';
import type { Trip } from '../types';

const city = (id: string) => ethiopia.cities.find((c) => c.id === id)!;

describe('directions', () => {
  it('searches the place with its city and country', () => {
    expect(placeQuery('Fasil Ghebbi royal enclosure', city('gondar'))).toBe('Fasil Ghebbi royal enclosure, Gondar, Ethiopia');
    expect(placeQuery('Gondar piazza coffee stop', city('gondar'))).toBe('Piazza, Gondar, Ethiopia');
    // The part of the city name in brackets is not what Maps knows.
    expect(placeQuery('Lunch at Simien Lodge', city('simien'))).toBe('Simien Lodge, Simien Mountains, Ethiopia');
    // A query that already names the place's town or country is left as it is.
    expect(placeQuery('Gondar market', city('gondar'))).toBe('Gondar market, Ethiopia');
    expect(placeQuery('Babile camel market', city('harar'))).toBe('Babile, Ethiopia');
  });

  it('gives no link for a kind of place rather than one spot', () => {
    expect(placeQuery('Tej at a local tej bet', city('lalibela'))).toBeUndefined();
    expect(placeQuery('Lunch in Jinka', city('jinka'))).toBeUndefined();
  });

  it('only lists catalogue places that exist, so a renamed place cannot lose its search', () => {
    const names = new Set(ethiopia.cities.flatMap((c) => c.suggestedSpots.map((s) => s.name)));
    expect(Object.keys(MAP_QUERIES).filter((n) => !names.has(n))).toEqual([]);
  });

  it('puts the place on its visit and on the step that leads there', () => {
    const trip: Trip = {
      ...sampleTrip(),
      startDate: '2027-02-02',
      endDate: '2027-02-05',
      arrivalTime: '08:00',
      departureTime: '22:30',
      cityId: 'addis',
      stops: [],
      spots: [{ id: 'trinity', cityId: 'addis', name: 'Holy Trinity Cathedral', light: 'sunrise', shotList: '', date: '2027-02-03' }],
    };
    const tasks = generatePlan(trip).days.flatMap((d) => d.tasks);
    const go = tasks.find((t) => t.id.endsWith(':go-trinity'));
    const visit = tasks.find((t) => t.id.endsWith(':spot-trinity'));
    expect(visit?.map).toBe('Holy Trinity Cathedral, Addis Ababa, Ethiopia');
    expect(go?.map).toBe(visit?.map);
    expect(tasks.find((t) => t.id.endsWith(':flight'))?.map).toBeUndefined();

    const plan = generatePlan(trip);
    expect(buildIcs(trip, plan, 'Africa/Addis_Ababa')).toContain('LOCATION:Holy Trinity Cathedral\\, Addis Ababa\\, Ethiopia');
    expect(phoneEvents(plan, 'Africa/Addis_Ababa').find((e) => e.title.startsWith('Leave for Holy Trinity'))?.location).toBe(visit?.map);
  });
});
