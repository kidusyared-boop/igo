import type { Trip } from '../../types';
import { COUNTRIES } from '../../data/countries';
import { addDays, daysBetween, todayIso } from '../../utils/dates';
import { deviceTimeZone } from '../../utils/timezone';
import { newId } from '../../utils/id';
import type { TKey } from '../../i18n';

export const MAX_TRIP_DAYS = 60;

export function blankTrip(): Trip {
  const country = COUNTRIES[0]!;
  const start = addDays(todayIso(), 14);
  return {
    id: newId('trip'),
    name: '',
    countryCode: country.code,
    cityId: country.cities[0]!.id,
    stops: [],
    startDate: start,
    endDate: addDays(start, 4),
    arrivalTime: '15:00',
    departureTime: '12:00',
    mode: 'traveler',
    audienceTimeZone: deviceTimeZone(),
    flyingDrone: false,
    interests: ['city', 'food', 'history', 'culture'],
    pace: 'balanced',
    budget: 'mid',
    diets: [],
    mobility: 'full',
    withKids: false,
    diaspora: false,
    entryDoc: 'visa',
    familyTime: false,
    dismissedPlaces: [],
    spots: [],
    customTasks: [],
    doneIds: [],
    hiddenIds: [],
    createdAt: new Date().toISOString(),
  };
}

/** Returns the message key for the first problem, or null. 'error.tooLong' takes {max}: MAX_TRIP_DAYS. */
export function validateTrip(trip: Trip): TKey | null {
  if (!trip.startDate || !trip.endDate) return 'error.dates';
  const days = daysBetween(trip.startDate, trip.endDate);
  if (days < 0) return 'error.order';
  if (days + 1 > MAX_TRIP_DAYS) return 'error.tooLong';
  if (!trip.arrivalTime || !trip.departureTime) return 'error.times';
  if (trip.stops.some((s) => s.date <= trip.startDate || s.date > trip.endDate)) {
    return 'error.stops';
  }
  return null;
}
