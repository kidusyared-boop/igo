import type { Booking, Task, Trip } from '../../types';

export const BOOKING_KINDS: Booking['kind'][] = ['stay', 'flight', 'transport', 'guide', 'other'];

/** Dated bookings in date and time order, then the undated ones. */
export function sortBookings(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    if (!a.date || !b.date) return Number(!a.date) - Number(!b.date);
    return a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '');
  });
}

/** Where the traveler sleeps in a city on a date: the latest stay there that starts on or before it. */
export function stayFor(trip: Pick<Trip, 'bookings'>, cityId: string, date: string): Booking | undefined {
  return sortBookings(trip.bookings ?? [])
    .filter((b) => b.kind === 'stay' && b.cityId === cityId && (!b.date || b.date <= date))
    .at(-1);
}

/** One line with what a traveler shows a driver or a check-in desk. */
export function bookingLine(b: Booking): string {
  return [b.name, b.time, b.ref && `ref ${b.ref}`, b.address, b.phone].filter(Boolean).join(' · ');
}

/** Google Maps search for an address, which opens the Maps app on phones that have it. */
export function mapLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Check-in steps that show the stay, and travel steps that a flight or ride booking covers. */
const STAY_KEYS = new Set(['checkin', 'move-in']);
const TRAVEL_KEYS = new Set(['land', 'flight', 'move', 'airport-hub', 'connect']);

/** Adds the traveler's own booking details to the day's check-in and travel tasks. */
export function withBookings(trip: Pick<Trip, 'bookings'>, day: { date: string; cityId: string }, tasks: Task[]): Task[] {
  if (!trip.bookings?.length) return tasks;
  const stay = stayFor(trip, day.cityId, day.date);
  const travel = (trip.bookings ?? []).filter((b) => (b.kind === 'flight' || b.kind === 'transport') && b.date === day.date);
  // On arrival the address matters most on the way from the airport, so it goes there when that step exists.
  const ride = tasks.find((t) => keyOf(t) === 'ride' && t.title.startsWith('Get to your stay'));
  return tasks.map((task) => {
    const key = keyOf(task);
    const toStay = ride ? task === ride : STAY_KEYS.has(key);
    const lines = [
      ...(toStay && stay ? [`Your stay: ${bookingLine(stay)}`] : []),
      ...(TRAVEL_KEYS.has(key) ? travel.filter((b) => key !== 'flight' || b.kind === 'flight').map((b) => `Your booking: ${bookingLine(b)}`) : []),
    ];
    return lines.length ? { ...task, detail: [...lines, task.detail].filter(Boolean).join('\n') } : task;
  });
}

function keyOf(task: Task): string {
  return task.id.split(':').slice(2).join(':');
}
