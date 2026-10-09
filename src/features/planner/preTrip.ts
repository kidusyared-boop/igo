import type { CountryPack, City, Task, Trip } from '../../types';
import { addDays, formatDay } from '../../utils/dates';
import { findCity } from '../../data/countries';
import { routeCities } from './route';

function task(trip: Trip, daysBefore: number, key: string, fields: Omit<Task, 'id' | 'date' | 'source'>): Task {
  const date = addDays(trip.startDate, -daysBefore);
  return { id: `auto:pre:${key}`, date, source: 'auto', ...fields };
}

export function buildPreTripTasks(trip: Trip, country: CountryPack, city: City): Task[] {
  const creator = trip.mode === 'creator';
  const tasks: Task[] = [
    task(trip, 30, 'entry', {
      title: `Confirm ${country.name} entry rules for your passport`,
      detail: `${country.entry.summary} Official site: ${country.entry.officialUrl}`,
      category: 'prep',
    }),
    task(trip, 21, 'insurance', {
      title: creator ? 'Buy travel insurance that covers your camera gear' : 'Buy travel insurance',
      detail: creator ? 'Check the per-item limit; most basic policies cap electronics low.' : undefined,
      category: 'prep',
    }),
    task(trip, 14, 'esim', {
      title: `Buy an eSIM or plan a SIM for ${country.name}`,
      detail: country.connectivity,
      category: 'prep',
    }),
    task(trip, 7, 'bank', {
      title: 'Tell your bank and pack a card with no foreign transaction fee',
      detail: `Local currency is ${country.currency.code}. ${country.currency.cashNote}`,
      category: 'prep',
    }),
    task(trip, 7, 'maps', {
      title: `Download offline maps for ${city.name}`,
      category: 'prep',
    }),
    task(trip, 2, 'adapter', {
      title: `Pack a plug adapter: ${country.plugs}, ${country.voltage}`,
      detail: 'Check that chargers are rated for this voltage; most USB chargers handle 100 to 240 V.',
      category: 'prep',
    }),
    task(trip, 1, 'apps', {
      title: 'Install local ride and transit apps',
      detail: country.rideApps,
      category: 'prep',
    }),
    task(trip, 1, 'emergency', {
      title: 'Save emergency numbers and your hotel address offline',
      detail: country.emergency,
      category: 'prep',
    }),
  ];

  for (const extra of country.extraPrep ?? []) {
    if (extra.creatorOnly && !creator) continue;
    tasks.push(task(trip, extra.daysBefore, extra.key, { title: extra.title, detail: extra.detail, category: 'prep' }));
  }

  const legs = routeCities(trip);
  if (legs.length > 1) {
    const route = legs.map((l) => findCity(trip.countryCode, l.cityId)?.name ?? l.cityId).join(' → ');
    const moves = legs.slice(1).map((l) => {
      const c = findCity(trip.countryCode, l.cityId);
      return `${formatDay(l.from)}: ${c?.name}. ${c?.access ?? ''}`.trim();
    });
    tasks.push(task(trip, 21, 'route', {
      title: `Book every leg of your route: ${route}`,
      detail: moves.join(' '),
      category: 'prep',
    }));
  }

  const form = country.entry.preArrivalForm;
  if (form) {
    tasks.push(
      task(trip, Math.min(form.daysBefore, 30), 'form', {
        title: `Submit ${form.name}`,
        detail: `Do this about ${form.daysBefore} days before arrival: ${form.url}`,
        category: 'prep',
      }),
    );
  }

  if (trip.flyingDrone) {
    tasks.push(
      task(trip, 21, 'drone', {
        title: country.drone.registrationRequired
          ? `Register your drone for ${country.name}`
          : `Check whether you can bring a drone to ${country.name}`,
        detail: country.drone.summary,
        category: 'prep',
      }),
    );
  }

  if (creator) {
    tasks.push(
      task(trip, 7, 'shotlist', {
        title: `Write shot lists for your ${trip.spots.length || 'planned'} spots`,
        detail: 'Hook shot, establishing wide, details, a moving shot and one shot of you in frame for each spot.',
        category: 'prep',
      }),
      task(trip, 5, 'content-plan', {
        title: 'Decide what this trip produces',
        detail: 'Long video, shorts and posts. Note the angle for each so you shoot for it, not around it.',
        category: 'prep',
      }),
      task(trip, 1, 'gear', {
        title: 'Charge every battery, format cards, clear phone storage',
        category: 'prep',
      }),
    );
  }

  return tasks;
}
