import type { City, Season, Spot, SuggestedSpot, Trip } from '../../types';
import { findCity } from '../../data/countries';
import { dateRange } from '../../utils/dates';
import { cityForDate } from './route';

/** The season a city is in on a date, if its weather changes plans. */
export function seasonOn(city: Pick<City, 'seasons'> | undefined, iso: string): Season | undefined {
  const month = Number(iso.slice(5, 7));
  return city?.seasons?.find((s) => s.months.includes(month));
}

const OUTDOOR = new Set(['countryside', 'hiking', 'wildlife', 'adventure']);

/** Countryside, hikes and wildlife: places the weather decides the time of. Meals never are. */
export function isOutdoor(place: Pick<SuggestedSpot, 'tags' | 'light'>): boolean {
  return place.light !== 'lunch' && place.light !== 'dinner' && Boolean(place.tags?.some((t) => OUTDOOR.has(t)));
}

/** In a rough-roads season igo leaves out the whole-day trips it would pick; the traveler's own stay. */
export function roadsClosed(spot: Pick<Spot, 'allDay' | 'pickedFor'>, season: Season | undefined): boolean {
  return Boolean(season?.roughRoads && spot.allDay && spot.pickedFor);
}

/** In a mornings season, igo's outdoor picks need the morning slot. */
export function wantsMorning(spot: Pick<Spot, 'outdoor' | 'pickedFor' | 'light' | 'allDay'>, season: Season | undefined): boolean {
  return Boolean(season?.mornings && spot.outdoor && spot.pickedFor && spot.light === 'any' && !spot.allDay);
}

export interface SeasonPrep {
  daysBefore: number;
  key: string;
  title: string;
  detail: string;
}

/** Before the trip: one warning for each city and season the route's dates fall in. */
export function seasonPrep(trip: Trip): SeasonPrep[] {
  const out = new Map<string, SeasonPrep>();
  for (const date of dateRange(trip.startDate, trip.endDate)) {
    const city = findCity(trip.countryCode, cityForDate(trip, date));
    const season = seasonOn(city, date);
    if (!city || !season) continue;
    const key = `season-${city.id}-${season.key}`;
    if (out.has(key)) continue;
    out.set(key, { daysBefore: 60, key, title: `Plan for ${season.name} in ${city.name}`, detail: season.prep });
  }
  return [...out.values()];
}
