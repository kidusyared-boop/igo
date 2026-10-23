import type { Task, Trip } from '../../types';
import { newId } from '../../utils/id';

/**
 * Saves the traveler's changes to a task. Their own tasks change in place. An igo task
 * becomes the traveler's own copy and the original is hidden, so the change survives
 * every rebuild of the plan (new dates, new interests, a sync from another phone) and
 * the copy keeps its tick.
 */
export function saveTaskEdit(trip: Trip, original: Task, edited: Task, makeId: () => string = () => newId('task')): Trip {
  if (original.source === 'user') {
    return { ...trip, customTasks: trip.customTasks.map((t) => (t.id === original.id ? { ...edited, id: original.id, source: 'user' } : t)) };
  }
  const copy: Task = { ...edited, id: makeId(), source: 'user', replaces: original.id };
  return {
    ...trip,
    customTasks: [...trip.customTasks, copy],
    hiddenIds: trip.hiddenIds.includes(original.id) ? trip.hiddenIds : [...trip.hiddenIds, original.id],
    doneIds: trip.doneIds.includes(original.id) ? [...trip.doneIds, copy.id] : trip.doneIds,
  };
}

/** Drops the traveler's copy and brings back igo's version of the task. */
export function resetTask(trip: Trip, taskId: string): Trip {
  const copy = trip.customTasks.find((t) => t.id === taskId);
  if (!copy?.replaces) return trip;
  return {
    ...trip,
    customTasks: trip.customTasks.filter((t) => t.id !== taskId),
    hiddenIds: trip.hiddenIds.filter((id) => id !== copy.replaces),
    doneIds: trip.doneIds.filter((id) => id !== taskId),
  };
}

/** igo tasks still standing in for an edited copy: hidden, but not by the traveler's choice. */
function replaced(trip: Trip): Set<string> {
  return new Set(trip.customTasks.flatMap((t) => (t.replaces ? [t.replaces] : [])));
}

/** Tasks the traveler hid themselves, which "Show hidden" brings back. */
export function hiddenByTraveler(trip: Trip): string[] {
  const stand = replaced(trip);
  return trip.hiddenIds.filter((id) => !stand.has(id));
}

/** Brings back hidden tasks, but not igo's versions of tasks the traveler edited. */
export function restoreHidden(trip: Trip): Trip {
  const stand = replaced(trip);
  return { ...trip, hiddenIds: trip.hiddenIds.filter((id) => stand.has(id)) };
}

/** Flight times come from the trip details, so these tasks cannot move on their own. */
export function followsFlight(task: Task): boolean {
  return /^auto:.*:(land|flight)$/.test(task.replaces ?? task.id);
}
