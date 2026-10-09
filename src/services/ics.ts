import type { Task, Trip, TripPlan } from '../types';
import { addDays } from '../utils/dates';
import { zonedToUtc } from '../utils/timezone';

const DURATION: Record<Task['category'], number> = {
  prep: 30, logistics: 30, shoot: 75, edit: 45, post: 15, explore: 90, food: 60, rest: 30,
};

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);
}

function eventFor(task: Task, timeZone: string, now: string): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${task.id.replace(/[^a-zA-Z0-9-]/g, '-')}@igo`, `DTSTAMP:${now}`, `SUMMARY:${escape(task.title)}`];
  if (task.time) {
    const start = zonedToUtc(task.date, task.time, timeZone);
    const end = new Date(start.getTime() + DURATION[task.category] * 60_000);
    lines.push(`DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`);
  } else {
    const day = task.date.replace(/-/g, '');
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${addDays(task.date, 1).replace(/-/g, '')}`);
  }
  if (task.detail) lines.push(`DESCRIPTION:${escape(task.detail)}`);
  lines.push('END:VEVENT');
  return lines;
}

export function buildIcs(trip: Trip, plan: TripPlan, cityTimeZone: string): string {
  const now = stamp(new Date());
  const tasks = [...plan.preTrip, ...plan.days.flatMap((d) => d.tasks)];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//igo//trip planner//EN', `X-WR-CALNAME:${escape(trip.name)}`];
  for (const t of tasks) lines.push(...eventFor(t, cityTimeZone, now));
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
