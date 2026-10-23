import { describe, expect, it } from 'vitest';
import { generatePlan } from '../features/planner/generatePlan';
import { mapLink, sortBookings, stayFor, telLink } from '../features/bookings/bookings';
import { buildIcs } from '../services/ics';
import { mergeTrips } from '../services/sync';
import { sampleTrip } from '../data/sampleTrip';
import type { Booking, Trip } from '../types';

const trip = (bookings: Booking[], over: Partial<Trip> = {}): Trip => ({
  ...sampleTrip(),
  spots: [],
  startDate: '2027-02-02',
  endDate: '2027-02-07',
  arrivalTime: '08:00',
  departureTime: '22:30',
  stops: [{ id: 'a', cityId: 'harar', date: '2027-02-04' }, { id: 'b', cityId: 'addis', date: '2027-02-06' }],
  bookings,
  ...over,
});
const detail = (t: Trip, date: string, key: string) => generatePlan(t).days.find((d) => d.date === date)?.tasks.find((x) => x.id === `auto:${date}:${key}`)?.detail ?? '';

const addisFirst: Booking = { id: 'b1', kind: 'stay', name: 'Jupiter Hotel', cityId: 'addis', date: '2027-02-02', ref: 'JH42', address: 'Kazanchis, Addis Ababa', phone: '+251 11 552 7333' };
const harar: Booking = { id: 'b2', kind: 'stay', name: 'Rewda Guesthouse', cityId: 'harar', date: '2027-02-04' };
const addisLast: Booking = { id: 'b3', kind: 'stay', name: 'Radisson Blu', cityId: 'addis', date: '2027-02-06' };
const toHarar: Booking = { id: 'b4', kind: 'flight', name: 'Ethiopian ET 160', from: 'Addis Ababa', to: 'Dire Dawa', date: '2027-02-04', time: '07:10', arriveTime: '08:15', ref: 'XK9Q2L' };
const home: Booking = { id: 'b5', kind: 'flight', name: 'Ethiopian ET 700', date: '2027-02-07', time: '22:30' };
const guide: Booking = { id: 'b6', kind: 'guide', name: 'Abdi', cityId: 'harar', phone: '0911 223344' };

describe('bookings', () => {
  it('sorts dated bookings by day and time, undated last', () => {
    expect(sortBookings([guide, home, toHarar, addisFirst]).map((b) => b.id)).toEqual(['b1', 'b4', 'b5', 'b6']);
  });

  it('finds the stay for a city on a date, using the latest one that has started', () => {
    const t = trip([addisFirst, harar, addisLast]);
    expect(stayFor(t, 'addis', '2027-02-03')?.name).toBe('Jupiter Hotel');
    expect(stayFor(t, 'addis', '2027-02-07')?.name).toBe('Radisson Blu');
    expect(stayFor(t, 'harar', '2027-02-02')).toBeUndefined();
  });

  it('stops using a stay on its check-out day', () => {
    const t = trip([{ ...addisFirst, endDate: '2027-02-04' }]);
    expect(stayFor(t, 'addis', '2027-02-03')?.name).toBe('Jupiter Hotel');
    // Back in Addis Ababa after Harar with no new stay: igo does not guess the old hotel.
    expect(stayFor(t, 'addis', '2027-02-06')).toBeUndefined();
    expect(detail(t, '2027-02-06', 'move-in')).not.toMatch(/Your stay/);
  });

  it('puts the stay on getting there or check-in, and the flight on travel tasks', () => {
    const t = trip([addisFirst, harar, addisLast, toHarar, home, guide]);
    expect(detail(t, '2027-02-02', 'ride')).toMatch(/^Your stay: Jupiter Hotel · ref JH42 · Kazanchis, Addis Ababa · \+251 11 552 7333/);
    expect(detail(t, '2027-02-02', 'checkin')).not.toMatch(/Your stay/);
    expect(detail(t, '2027-02-04', 'move-in')).toMatch(/^Your stay: Rewda Guesthouse/);
    expect(detail(t, '2027-02-04', 'move')).toMatch(/^Your booking: Ethiopian ET 160 · Addis Ababa → Dire Dawa · 07:10–08:15 · ref XK9Q2L\n/);
    expect(detail(t, '2027-02-06', 'move-in')).toMatch(/^Your stay: Radisson Blu/);
    expect(detail(t, '2027-02-07', 'flight')).toBe('Your booking: Ethiopian ET 700 · 22:30');
    // A guide is listed in Bookings only.
    expect(generatePlan(t).days.flatMap((d) => d.tasks).some((x) => x.detail?.includes('Abdi'))).toBe(false);
  });

  it('puts the stay on getting there after a late landing', () => {
    expect(detail(trip([addisFirst], { arrivalTime: '23:15' }), '2027-02-02', 'ride')).toMatch(/^Your stay: Jupiter Hotel/);
  });

  it('leaves plans alone for trips without bookings', () => {
    const before = generatePlan({ ...trip([]), bookings: undefined });
    expect(generatePlan(trip([]))).toEqual(before);
  });

  it('keeps bookings in calendar files and through sync', () => {
    const t = { ...trip([addisFirst]), id: 'trip-1', updatedAt: '2027-01-01T10:00:00Z' };
    expect(buildIcs(t, generatePlan(t), 'Africa/Addis_Ababa')).toContain('Your stay: Jupiter Hotel');
    const merged = mergeTrips([], [], [{ id: t.id, data: t, updated_at: t.updatedAt, deleted: false }]);
    expect(merged.trips[0]?.bookings).toEqual([addisFirst]);
  });

  it('links addresses to maps and numbers to the dialer', () => {
    expect(mapLink('Kazanchis, Addis Ababa')).toBe('https://www.google.com/maps/search/?api=1&query=Kazanchis%2C%20Addis%20Ababa');
    expect(telLink('+251 11 552-7333')).toBe('tel:+251115527333');
  });
});
