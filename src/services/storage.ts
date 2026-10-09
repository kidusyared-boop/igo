import type { Trip } from '../types';
import { findCity } from '../data/countries';

const KEY = 'igo.trips.v1';

export function loadTrips(): Trip[] | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Older saves may lack newer fields or point at countries that are no longer offered.
    const trips = (parsed as Trip[])
      .map((t) => ({
        ...t,
        stops: t.stops ?? [],
        interests: t.interests ?? [],
        pace: t.pace ?? 'balanced',
        budget: t.budget ?? 'mid',
        diets: t.diets ?? [],
        mobility: t.mobility ?? 'full',
        withKids: t.withKids ?? false,
        diaspora: t.diaspora ?? false,
        entryDoc: t.entryDoc ?? 'visa',
        familyTime: t.familyTime ?? false,
        dismissedPlaces: t.dismissedPlaces ?? [],
      }))
      .filter((t) => findCity(t.countryCode, t.cityId));
    return trips.length ? trips : null;
  } catch {
    return null;
  }
}

export function saveTrips(trips: Trip[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trips));
    return true;
  } catch {
    return false;
  }
}
