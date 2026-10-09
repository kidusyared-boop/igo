import type { Trip } from '../types';
import { addDays, todayIso } from '../utils/dates';

/** An example trip so the first screen shows what igo does. Marked as an example in the UI. */
export function sampleTrip(): Trip {
  const start = addDays(todayIso(), 12);
  return {
    id: 'example-ethiopia',
    name: 'Addis and Harar (example)',
    countryCode: 'ET',
    cityId: 'addis',
    stops: [
      { id: 'st1', cityId: 'harar', date: addDays(start, 2) },
      { id: 'st2', cityId: 'addis', date: addDays(start, 4) },
    ],
    startDate: start,
    endDate: addDays(start, 5),
    arrivalTime: '07:30',
    departureTime: '22:30',
    mode: 'creator',
    audienceTimeZone: 'America/New_York',
    flyingDrone: true,
    interests: ['city', 'food', 'coffee', 'culture', 'history'],
    pace: 'balanced',
    dismissedPlaces: [],
    spots: [
      { id: 'sp2', cityId: 'addis', name: 'Entoto Park viewpoint', light: 'sunset', shotList: 'City reveal, time-lapse into night' },
      { id: 'sp4', cityId: 'harar', name: 'Hyena feeding outside the walls', light: 'night', shotList: 'Feeder close-up, me feeding with a stick, wide with torchlight' },
      { id: 'sp5', cityId: 'harar', name: 'Jugol old town alleys', light: 'sunrise', shotList: 'Painted doors, gimbal walk, call to prayer audio' },
    ],
    customTasks: [],
    doneIds: [],
    hiddenIds: [],
    createdAt: new Date().toISOString(),
  };
}
