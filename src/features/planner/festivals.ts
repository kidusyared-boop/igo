import type { CountryPack, Festival, FestivalEvent, Trip } from '../../types';
import { findCity } from '../../data/countries';
import { addDays, formatDay, toMinutes } from '../../utils/dates';
import { cityForDate, routeCities } from './route';

/** Festivals go in the plan for creators and anyone who picked faith, culture or history, or picked nothing. */
export function wantsFestivals(trip: Trip): boolean {
  return trip.mode === 'creator' || trip.interests.length === 0 || trip.interests.some((i) => i === 'religion' || i === 'culture' || i === 'history');
}

export function tripFestivals(trip: Trip, country: CountryPack): Festival[] {
  return wantsFestivals(trip) ? (country.festivals?.(trip.startDate, trip.endDate) ?? []) : [];
}

/** The festival events the traveler is in the right city for, by date. */
export function festivalEventsByDate(trip: Trip, country: CountryPack): Map<string, FestivalEvent[]> {
  const byDate = new Map<string, FestivalEvent[]>();
  for (const f of tripFestivals(trip, country)) {
    for (const e of f.events) {
      if (cityForDate(trip, e.date) !== e.cityId) continue;
      byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    }
  }
  return byDate;
}

/** Minutes an event takes up, for keeping other plans out of it. */
export function eventWindow(e: Pick<FestivalEvent, 'start' | 'end'>): [number, number] {
  return [toMinutes(e.start), toMinutes(e.end)];
}

export interface FestivalPrep {
  daysBefore: number;
  key: string;
  title: string;
  detail: string;
}

const cityName = (trip: Trip, id: string) => findCity(trip.countryCode, id)?.name ?? id;

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function listNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * Before the trip: book early when the route already catches a festival,
 * and say so plainly when the route just misses one.
 */
export function festivalPrep(trip: Trip, country: CountryPack): FestivalPrep[] {
  const out: FestivalPrep[] = [];
  const legs = routeCities(trip);
  for (const f of tripFestivals(trip, country)) {
    const caught = f.events.filter((e) => cityForDate(trip, e.date) === e.cityId);
    if (caught.length) {
      const city = cityName(trip, caught[0]!.cityId);
      out.push({
        daysBefore: 90,
        key: `fest-book-${f.key}`,
        title: f.book?.title ?? `Book your room in ${city} now: ${f.name} fills every hotel`,
        detail: f.book?.detail ?? `You are there for ${f.name} on ${formatDay(f.date)}. Rooms sell out months ahead and prices rise sharply that week. Book domestic flights at the same time, and expect banks and offices to close on the day.`,
      });
      continue;
    }
    if (f.date < trip.startDate || f.date > trip.endDate) continue;
    const there = cityName(trip, cityForDate(trip, f.date));
    const best = f.cityIds.map((id) => cityName(trip, id));
    const onRoute = f.cityIds.filter((id) => legs.some((l) => l.cityId === id));
    const eve = formatDay(addDays(f.date, -1));
    const when = f.when ?? `from the afternoon of ${eve} to the next morning`;
    if (onRoute.length) {
      const city = cityName(trip, onRoute[0]!);
      out.push({
        daysBefore: 90,
        key: `fest-route-${f.key}`,
        title: `Change your route to be in ${city} for ${f.name}`,
        detail: `${capital(f.name)} is on ${formatDay(f.date)}, but your route has you in ${there} that day. ${city} is already on your route, so move that stop to be there ${when}.`,
      });
    } else {
      out.push({
        daysBefore: 90,
        key: `fest-route-${f.key}`,
        title: `Decide where to spend ${f.name}`,
        detail: `${capital(f.name)} is on ${formatDay(f.date)}, during your trip, and you will be in ${there}. It is worth being in ${listNames(best)}, ${when}. Add a stop there if you want to see it.`,
      });
    }
  }
  return out;
}
