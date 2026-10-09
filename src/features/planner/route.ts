import type { Trip } from '../../types';

/** City for a date: the latest stop on or before it, otherwise the first city. */
export function cityForDate(trip: Trip, date: string): string {
  let city = trip.cityId;
  for (const stop of [...trip.stops].sort((a, b) => a.date.localeCompare(b.date))) {
    if (stop.date <= date) city = stop.cityId;
  }
  return city;
}

/** Ordered list of distinct city visits, e.g. Addis, Lalibela, Gondar, Addis. */
export function routeCities(trip: Trip): { cityId: string; from: string }[] {
  const legs = [{ cityId: trip.cityId, from: trip.startDate }];
  for (const stop of [...trip.stops].sort((a, b) => a.date.localeCompare(b.date))) {
    if (stop.date <= trip.startDate || stop.date > trip.endDate) continue;
    if (legs.at(-1)?.cityId !== stop.cityId) legs.push({ cityId: stop.cityId, from: stop.date });
  }
  return legs;
}
