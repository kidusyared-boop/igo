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

/** Hours by road between two cities with a direct road, in either direction. */
function roadHours(from: City, to: City): number | undefined {
  return from.roads?.find((r) => r.cityId === to.id)?.hours ?? to.roads?.find((r) => r.cityId === from.id)?.hours;
}

/** Usual door-to-door hours from the hub when a city does not say. */
export const DEFAULT_HUB_HOURS = 4.5;

/**
 * Door-to-door hours for a move: a direct road if there is one, otherwise
 * through the hub, with an hour to change there.
 */
export function travelHours(from: City, to: City, country: Pick<CountryPack, 'cities'>): number {
  const hub = country.cities[0];
  if (from.id === to.id) return 0;
  const road = roadHours(from, to);
  if (road !== undefined) return road;
  if (!hub || from.id === hub.id) return to.hubHours ?? DEFAULT_HUB_HOURS;
  if (to.id === hub.id) return from.hubHours ?? DEFAULT_HUB_HOURS;
  return (from.hubHours ?? DEFAULT_HUB_HOURS) + (to.hubHours ?? DEFAULT_HUB_HOURS) + 1;
}

/**
 * How to get from one city to the next. Each city's access note describes the
 * trip from the main hub, so a move between two other cities usually goes
 * back through the hub.
 */
export function travelDetail(from: City, to: City, country: Pick<CountryPack, 'cities'>): string | undefined {
  const hub = country.cities[0];
  const road = roadHours(from, to);
  if (road !== undefined) return `About ${road} hours by road.`;
  if (!hub || from.id === hub.id) return to.access;
  if (to.id === hub.id) return from.access ? `The way you came, in reverse: ${from.access}` : undefined;
  return `Check for a direct flight first. Most routes go back through ${hub.name}, so allow the whole day. ${hub.name} to ${to.name}: ${to.access ?? ''}`.trim();
}
