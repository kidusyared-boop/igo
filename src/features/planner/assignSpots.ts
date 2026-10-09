import type { DayPlan, Light, Spot, Trip } from '../../types';
import { dayCapacity, isMealSpot } from './personalize';
import { toMinutes } from '../../utils/dates';

export type DaySkeleton = Pick<DayPlan, 'date' | 'kind' | 'sun' | 'cityId' | 'movedFrom'>;

export const MOVE_CHECK_IN = '14:00';

/** How many spots of each light a day can hold. */
const CAPACITY: Record<Light, number> = { sunrise: 1, any: 2, lunch: 1, sunset: 1, dinner: 1, night: 1 };

/** Start times for daytime places: one in the morning, one in the afternoon. */
export const ANY_SLOTS = ['09:30', '14:30'];

/** Earliest and latest minute a day leaves free for places, given flights and moves. */
export function freeWindow(day: DaySkeleton, trip: Trip): [number, number] {
  const start =
    day.kind === 'arrival' || day.kind === 'single'
      ? toMinutes(trip.arrivalTime) + 180
      : day.movedFrom
        ? toMinutes(MOVE_CHECK_IN) + 60
        : 0;
  const end = day.kind === 'departure' || day.kind === 'single' ? toMinutes(trip.departureTime) - 240 : 24 * 60;
  return [start, end];
}

/** Whether a spot with this light fits on this day given flight times. */
export function slotFits(day: DaySkeleton, light: Light, trip: Trip): boolean {
  const sunrise = toMinutes(day.sun?.sunrise ?? '06:30');
  const sunset = toMinutes(day.sun?.sunset ?? '18:30');
  const [free, leave] = freeWindow(day, trip);
  const fits = ([start, end]: [number, number]) => start >= free && end <= leave;
  switch (light) {
    case 'sunrise': return fits([sunrise - 30, sunrise + 60]);
    case 'any': return ANY_SLOTS.some((t) => fits([toMinutes(t), toMinutes(t) + 120]));
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

  for (const spot of trip.spots) {
    if (spot.date && byDate.has(spot.date)) byDate.get(spot.date)?.push(spot);
  }

  const inCity = (spot: Spot, day: DaySkeleton) => (spot.cityId ?? trip.cityId) === day.cityId;
  const used = (date: string, light: Light) => (byDate.get(date) ?? []).filter((s) => s.light === light).length;
  const count = (date: string) => (byDate.get(date) ?? []).filter((s) => !isMealSpot(s)).length;
  const order = (d: DaySkeleton) => (d.kind === 'full' && !d.movedFrom ? 0 : 1);

  const place = (spot: Spot, respectPace: boolean): boolean => {
    const pick = days
      .filter((d) => inCity(spot, d) && used(d.date, spot.light) < CAPACITY[spot.light] && slotFits(d, spot.light, trip))
      .filter((d) => !respectPace || isMealSpot(spot) || count(d.date) < dayCapacity(d, trip.pace, trip.withKids))
      .sort((a, b) => order(a) - order(b) || count(a.date) - count(b.date))[0];
    if (pick) byDate.get(pick.date)?.push(spot);
    return Boolean(pick);
  };

  for (const spot of trip.spots) {
    if (spot.date && byDate.has(spot.date)) continue;
    if (!place(spot, false)) unscheduled.push(spot);
  }
  for (const spot of picked) place(spot, true);

  return { byDate, unscheduled };
}
