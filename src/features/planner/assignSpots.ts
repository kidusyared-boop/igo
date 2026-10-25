import type { DayPlan, FestivalEvent, Light, Spot, Trip } from '../../types';
import { dayCapacity, isMealSpot } from './personalize';
import { addDays, toMinutes } from '../../utils/dates';
import { eventWindow } from './festivals';
import { findCountry } from '../../data/countries';
import { roadsClosed, seasonOn, wantsMorning } from './seasons';

export type DaySkeleton = Pick<DayPlan, 'date' | 'kind' | 'sun' | 'cityId' | 'movedFrom'> & {
  /** Festival events the traveler is in town for; nothing else is planned over them. */
  events?: FestivalEvent[];
  /** Door-to-door hours of the move on a day that changes city. */
  moveHours?: number;
  /** On an arrival or departure day outside the hub: hours between this city and the hub's airport. */
  viaHub?: number;
};

/** Whether a stretch of the day clashes with a festival event. */
export function clashesWithEvent(day: Pick<DaySkeleton, 'events'>, start: number, end: number): boolean {
  return (day.events ?? []).some((e) => {
    const [from, to] = eventWindow(e);
    return start < to && end > from;
  });
}

/** Leaving on a moving day, after checking out at 08:00. */
export const MOVE_DEPART = toMinutes('09:30');
/** Latest check-in igo plans; longer journeys get a warning instead. */
export const LATEST_CHECK_IN = toMinutes('21:00');

/** Minute of check-in on a moving day: the journey's length after leaving at 09:30. */
export function moveCheckIn(day: Pick<DaySkeleton, 'moveHours'>): number {
  return Math.min(MOVE_DEPART + Math.round((day.moveHours ?? 4.5) * 60), LATEST_CHECK_IN);
}

/** Minute of check-in on arrival day: two hours after landing, plus the connection when the first city is not the hub. */
export function arrivalCheckIn(day: Pick<DaySkeleton, 'viaHub'>, trip: Trip): number {
  const landed = toMinutes(trip.arrivalTime);
  return day.viaHub ? landed + 60 + Math.round(day.viaHub * 60) : landed + 120;
}

/** Minute to leave the stay on departure day: three hours before the flight, or earlier to get back to the hub first. */
export function departureLeave(day: Pick<DaySkeleton, 'viaHub'>, trip: Trip): number {
  const flight = toMinutes(trip.departureTime);
  return day.viaHub ? flight - 120 - Math.round(day.viaHub * 60) : flight - 180;
}

/** How many spots of each light a day can hold. */
const CAPACITY: Record<Light, number> = { sunrise: 1, any: 2, lunch: 1, sunset: 1, dinner: 1, night: 1 };

/** Start times for daytime places: one in the morning, one in the afternoon. */
export const ANY_SLOTS = ['09:30', '14:30'];

/** Daytime slots before this count as the morning, ahead of afternoon rain or heat. */
export const NOON = toMinutes('12:00');

/** After checking in on a moving day there is still time for one easy place nearby. */
export const MOVE_SLOT = '15:30';

/** Flights before 06:00 mean leaving for the airport the night before. */
export const EARLY_FLIGHT = toMinutes('06:00');

/** The last evening before a flight that leaves in the small hours. */
export function isEveOfEarlyFlight(day: Pick<DaySkeleton, 'date'>, trip: Trip): boolean {
  return toMinutes(trip.departureTime) < EARLY_FLIGHT && trip.endDate > trip.startDate && day.date === addDays(trip.endDate, -1);
}

/** Earliest and latest minute a day leaves free for places, given flights and moves. */
export function freeWindow(day: DaySkeleton, trip: Trip): [number, number] {
  const start =
    day.kind === 'arrival' || day.kind === 'single'
      ? arrivalCheckIn(day, trip) + 60
      : day.movedFrom
        ? moveCheckIn(day) + 60
        : 0;
  const end =
    day.kind === 'departure' || day.kind === 'single'
      ? departureLeave(day, trip) - 60
      : isEveOfEarlyFlight(day, trip)
        ? toMinutes('19:00')
        : 24 * 60;
  return [start, end];
}

const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** Afternoons kept free for family: 15:00 to 19:00 on full days in one place. */
const FAMILY_FROM = toMinutes('15:00');
const FAMILY_TO = toMinutes('19:00');

export function isFamilyDay(day: DaySkeleton, trip: Trip): boolean {
  return trip.diaspora && trip.familyTime && day.kind === 'full' && !day.movedFrom;
}

/** Daytime start times that fit this day's free window. */
export function anySlots(day: DaySkeleton, trip: Trip): string[] {
  const [free, leave] = freeWindow(day, trip);
  const family = isFamilyDay(day, trip);
  return (day.movedFrom ? [MOVE_SLOT] : ANY_SLOTS).filter((t) => {
    const start = toMinutes(t);
    const end = start + 120;
    return start >= free && end <= leave && !(family && end > FAMILY_FROM && start < FAMILY_TO) && !clashesWithEvent(day, start, end);
  });
}

/** Whether a spot with this light fits on this day given flight times. */
export function slotFits(day: DaySkeleton, light: Light, trip: Trip): boolean {
  const sunrise = toMinutes(day.sun?.sunrise ?? '06:30');
  const sunset = toMinutes(day.sun?.sunset ?? '18:30');
  const [free, leave] = freeWindow(day, trip);
  const family = isFamilyDay(day, trip);
  const fits = ([start, end]: [number, number]) =>
    start >= free && end <= leave && !(family && end > FAMILY_FROM && start < FAMILY_TO) && !clashesWithEvent(day, start, end);
  switch (light) {
    case 'sunrise': return fits([sunrise - 30, sunrise + 60]);
    case 'any': return anySlots(day, trip).length > 0;
    case 'lunch': return fits([toMinutes('12:30'), toMinutes('13:30')]);
    case 'sunset': return fits([sunset - 60, sunset + 15]);
    case 'dinner': return fits([toMinutes('19:30'), toMinutes('21:00')]);
    case 'night': return fits([sunset + 90, sunset + 150]);
  }
}

/**
 * Pinned spots stay on their date. The rest go to the least-busy day that
 * still has room in the right light, preferring full days over travel days.
 * The traveler's own spots come first; places igo picked only fill days that
 * are under the pace limit, and are dropped quietly when nothing fits.
 */
export function assignSpots(
  trip: Trip,
  days: DaySkeleton[],
  picked: Spot[] = [],
): { byDate: Map<string, Spot[]>; unscheduled: Spot[] } {
  const byDate = new Map<string, Spot[]>(days.map((d) => [d.date, []]));
  const unscheduled: Spot[] = [];

  const inCity = (spot: Spot, day: DaySkeleton) => (spot.cityId ?? trip.cityId) === day.cityId;
  // A pin only holds while the route still has the traveler in that city that day.
  const dayOf = new Map(days.map((d) => [d.date, d]));
  const pinned = (spot: Spot) => Boolean(spot.date && dayOf.has(spot.date) && inCity(spot, dayOf.get(spot.date)!));

  for (const spot of trip.spots) {
    if (pinned(spot)) byDate.get(spot.date!)?.push(spot);
  }

  const used = (date: string, light: Light) => (byDate.get(date) ?? []).filter((s) => s.light === light).length;
  // A whole-day trip counts as two places against the pace limit.
  const weight = (spot: Spot) => (spot.allDay ? 2 : 1);
  const count = (date: string) => (byDate.get(date) ?? []).filter((s) => !isMealSpot(s)).reduce((n, s) => n + weight(s), 0);
  const awayAllDay = (date: string) => (byDate.get(date) ?? []).some((s) => s.allDay);
  const order = (d: DaySkeleton) => (d.kind === 'full' && !d.movedFrom ? 0 : 1);
  const keepsFast = trip.diets.includes('fasting');
  const country = findCountry(trip.countryCode);
  const fastingDay = (date: string) => Boolean(country?.dayNotes?.(date).some((n) => n.kind === 'fasting'));
  // On fasting days someone keeping the fast only gets meals that serve fasting food.
  const breaksFast = (spot: Spot, d: DaySkeleton) =>
    keepsFast && isMealSpot(spot) && !spot.diets?.some((x) => x === 'fasting' || x === 'vegan') && fastingDay(d.date);

  const seasonOf = (d: DaySkeleton) => seasonOn(country?.cities.find((c) => c.id === d.cityId), d.date);
  // In the rains or the heat, igo's outdoor picks only go where a morning slot is still free.
  const mornings = (d: DaySkeleton) => anySlots(d, trip).filter((t) => toMinutes(t) < NOON).length;
  const morningsUsed = (d: DaySkeleton) => (byDate.get(d.date) ?? []).filter((s) => wantsMorning(s, seasonOf(d))).length;

  // Whole-day trips need a full day in one place with nothing else in daylight.
  const roomFor = (spot: Spot, d: DaySkeleton) => {
    if (spot.weekdays && !spot.weekdays.includes(weekday(d.date))) return false;
    if (breaksFast(spot, d)) return false;
    if (roadsClosed(spot, seasonOf(d))) return false;
    if (wantsMorning(spot, seasonOf(d)) && morningsUsed(d) >= mornings(d)) return false;
    if (spot.allDay) {
      return d.kind === 'full' && !d.movedFrom && !d.events?.length && anySlots(d, trip).length === ANY_SLOTS.length && used(d.date, 'any') === 0 && used(d.date, 'sunset') === 0;
    }
    if (awayAllDay(d.date) && (spot.light === 'any' || spot.light === 'sunset')) return false;
    // Arriving from another city leaves energy for something easy, not a climb.
    if (d.movedFrom && spot.effort && spot.effort !== 'easy') return false;
    return used(d.date, spot.light) < (spot.light === 'any' ? anySlots(d, trip).length : CAPACITY[spot.light]);
  };
  const underPace = (spot: Spot, d: DaySkeleton) => {
    const n = count(d.date);
    return n === 0 || n + weight(spot) <= dayCapacity(d, trip.pace, trip.withKids);
  };

  const place = (spot: Spot, respectPace: boolean): boolean => {
    const pick = days
      .filter((d) => inCity(spot, d) && roomFor(spot, d) && slotFits(d, spot.light, trip))
      .filter((d) => !respectPace || isMealSpot(spot) || underPace(spot, d))
      .sort((a, b) => order(a) - order(b) || count(a.date) - count(b.date))[0];
    if (pick) byDate.get(pick.date)?.push(spot);
    return Boolean(pick);
  };

  for (const spot of trip.spots) {
    if (pinned(spot)) continue;
    if (!place(spot, false)) unscheduled.push(spot);
  }
  for (const spot of picked) place(spot, true);

  return { byDate, unscheduled };
}
