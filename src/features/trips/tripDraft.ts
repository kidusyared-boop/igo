import type { Trip } from '../../types';
import { COUNTRIES } from '../../data/countries';
import { addDays, daysBetween, todayIso } from '../../utils/dates';
import { deviceTimeZone } from '../../utils/timezone';
import { newId } from '../../utils/id';

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
    dismissedPlaces: [],
    spots: [],
    customTasks: [],
    doneIds: [],
    hiddenIds: [],
    createdAt: new Date().toISOString(),
  };
}

export function validateTrip(trip: Trip): string | null {
  if (!trip.startDate || !trip.endDate) return 'Pick both travel dates.';
  const days = daysBetween(trip.startDate, trip.endDate);
  if (days < 0) return 'The last day is before the first day. Swap the dates.';
  if (days + 1 > MAX_TRIP_DAYS) return `Trips can be up to ${MAX_TRIP_DAYS} days. Split longer stays into one trip per city.`;
  if (!trip.arrivalTime || !trip.departureTime) return 'Add your landing and departure times.';
  if (trip.stops.some((s) => s.date <= trip.startDate || s.date > trip.endDate)) {
    return 'Each move to another city must fall after the first day and on or before the last day.';
  }
  return null;
}
