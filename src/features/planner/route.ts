import type { City, CountryPack, Trip } from '../../types';

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

/**
 * How to get from one city to the next. Each city's access note describes the
 * trip from the main hub, so a move between two other cities usually goes
 * back through the hub.
 */
export function travelDetail(from: City, to: City, country: Pick<CountryPack, 'cities'>): string | undefined {
  const hub = country.cities[0];
  if (!hub || from.id === hub.id) return to.access;
  if (to.id === hub.id) return from.access ? `The way you came, in reverse: ${from.access}` : undefined;
  return `Check for a direct flight first. Most routes go back through ${hub.name}, so allow the whole day. ${hub.name} to ${to.name}: ${to.access ?? ''}`.trim();
}
