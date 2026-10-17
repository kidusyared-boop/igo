import type { Task, Trip, TripPlan } from '../../types';
import { addDays, daysBetween } from '../../utils/dates';

/** How many to-dos the opening screen shows; the rest wait inside the trip. */
export const HOME_TODOS = 3;

export const isExample = (trip: Trip) => trip.id.startsWith('example');

/** The traveler's own trip that is under way or starts soonest. The example trip never counts. */
export function nextTrip(trips: Trip[], today: string): Trip | undefined {
  return trips
    .filter((trip) => !isExample(trip) && trip.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

export type TripTiming = { kind: 'ahead'; days: number } | { kind: 'during'; day: number; of: number };

export function tripTiming(trip: Trip, today: string): TripTiming {
  if (today < trip.startDate) return { kind: 'ahead', days: daysBetween(today, trip.startDate) };
  return { kind: 'during', day: daysBetween(trip.startDate, today) + 1, of: daysBetween(trip.startDate, trip.endDate) + 1 };
}

export interface HomeTodos {
  /** Before the trip: prep due within a week (or overdue). During it: today's plan. */
  when: 'week' | 'today';
  tasks: Task[];
  /** Prep progress, shown only before the trip. */
  done: number;
  total: number;
}

export function homeTodos(trip: Trip, plan: TripPlan, today: string): HomeTodos {
  const done = new Set(trip.doneIds);
  const open = (task: Task) => !done.has(task.id);
  if (today >= trip.startDate) {
    const day = plan.days.find((d) => d.date === today);
    return { when: 'today', tasks: (day?.tasks ?? []).filter(open).slice(0, HOME_TODOS), done: 0, total: 0 };
  }
  const soon = addDays(today, 7);
  const tasks = plan.preTrip
    .filter((task) => open(task) && task.date <= soon)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, HOME_TODOS);
  return { when: 'week', tasks, done: plan.preTrip.filter((task) => done.has(task.id)).length, total: plan.preTrip.length };
}
