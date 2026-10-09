import type { DayNote, DayPlan, Task, Trip, TripPlan } from '../../types';
import { findCity, findCountry } from '../../data/countries';
import { dateRange, formatDay } from '../../utils/dates';
import { sunTimes } from '../../utils/solar';
import { assignSpots, type DaySkeleton } from './assignSpots';
import { buildDayTasks, sortTasks } from './dayTasks';
import { buildPreTripTasks } from './preTrip';
import { cityForDate } from './route';
import { pickPlaces } from './personalize';

function dayKind(index: number, total: number): DayPlan['kind'] {
  if (total === 1) return 'single';
  if (index === 0) return 'arrival';
  if (index === total - 1) return 'departure';
  return 'full';
}

const KIND_LABEL: Record<DayPlan['kind'], string> = {
  arrival: 'Arrival day',
  full: 'Full day',
  departure: 'Departure day',
  single: 'Day trip',
};

/**
 * Pure function: the same trip always produces the same task ids, so done
 * and hidden state stored on the trip survives every regeneration.
 */
export function generatePlan(trip: Trip): TripPlan {
  const country = findCountry(trip.countryCode);
  if (!country || !findCity(trip.countryCode, trip.cityId)) return { preTrip: [], days: [], unscheduledSpots: [], pickedSpots: [] };
  const cityOf = (id: string) => findCity(trip.countryCode, id) ?? findCity(trip.countryCode, trip.cityId)!;

  const dates = dateRange(trip.startDate, trip.endDate);
  const skeletons: DaySkeleton[] = dates.map((date, i) => {
    const city = cityOf(cityForDate(trip, date));
    const prev = i > 0 ? cityForDate(trip, dates[i - 1]!) : city.id;
    return {
      date,
      cityId: city.id,
      movedFrom: prev !== city.id ? prev : undefined,
      kind: dayKind(i, dates.length),
      sun: sunTimes(date, city.lat, city.lon, city.timeZone),
    };
  });
  const picked = pickPlaces(trip, skeletons, cityOf);
  const { byDate, unscheduled } = assignSpots(trip, skeletons, picked);

  const hidden = new Set(trip.hiddenIds);
  const visible = (t: Task) => !hidden.has(t.id);
  const custom = (date: string) => trip.customTasks.filter((t) => t.date === date);

  const days: DayPlan[] = skeletons.map((day, i) => {
    const city = cityOf(day.cityId);
    const fromCity = day.movedFrom ? cityOf(day.movedFrom) : undefined;
    const auto = buildDayTasks({ trip, country, city, fromCity, day, spots: byDate.get(day.date) ?? [] });
    const notes: DayNote[] = [
      ...(fromCity ? [{ kind: 'move' as const, text: `Moving from ${fromCity.name} to ${city.name}. ${city.access ?? ''}`.trim() }] : []),
      ...(country.dayNotes?.(day.date) ?? []),
      ...(city.safety ? [{ kind: 'safety' as const, text: city.safety }] : []),
    ];
    return {
      ...day,
      notes,
      label: `${KIND_LABEL[day.kind]} ${i + 1} · ${formatDay(day.date)}`,
      tasks: sortTasks([...auto, ...custom(day.date)].filter(visible)),
    };
  });

  const preCustom = trip.customTasks.filter((t) => t.date < trip.startDate);
  const preTrip = [...buildPreTripTasks(trip, country, cityOf(trip.cityId)), ...preCustom]
    .filter(visible)
    .sort((a, b) => a.date.localeCompare(b.date));

  const pickedSpots = [...byDate.entries()].flatMap(([date, spots]) =>
    spots.filter((spot) => spot.pickedFor).map((spot) => ({ spot, date })),
  );

  return { preTrip, days, unscheduledSpots: unscheduled, pickedSpots };
}
