import type { Trip } from '../types';
import { findCity } from '../data/countries';
import type { Tombstone } from './sync';
import { dropLooseCopies } from '../features/planner/taskEdits';
import { repairTrip } from '../features/planner/checkPlan';

const KEY = 'igo.trips.v1';

/** Fills in fields that trips saved by older versions of igo (here or on another device) don't have. */
export function normalizeTrip(t: Trip): Trip {
  const trip = dropLooseCopies({
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
    doneIds: t.doneIds ?? [],
    hiddenIds: t.hiddenIds ?? [],
    customTasks: t.customTasks ?? [],
    spots: t.spots ?? [],
  });
  // Trips in countries igo no longer offers have no plan to check.
  return findCity(trip.countryCode, trip.cityId) ? repairTrip(trip) : trip;
}

export function loadTrips(): Trip[] | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Older saves may lack newer fields or point at countries that are no longer offered.
    const trips = (parsed as Trip[]).map(normalizeTrip).filter((t) => findCity(t.countryCode, t.cityId));
    return trips;
  } catch {
    return null;
  }
}

const DELETED_KEY = 'igo.deleted.v1';

export function loadTombstones(): Tombstone[] {
  try {
    const raw = window.localStorage.getItem(DELETED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Tombstone[]) : [];
  } catch {
    return [];
  }
}

export function saveTombstones(tombstones: Tombstone[]): void {
  try {
    window.localStorage.setItem(DELETED_KEY, JSON.stringify(tombstones));
  } catch {
    // Sync falls back to the server's copy if this is lost.
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
