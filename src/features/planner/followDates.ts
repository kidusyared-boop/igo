import type { Trip } from '../../types';
import { addDays, daysBetween } from '../../utils/dates';

/** Tasks that belong to the day you fly home, wherever that day moves. */
const FLY_HOME = /^(airport|airport-hub|flight|checkout|cash-out|final-backup)$/;

/**
 * igo's tasks carry their date in their id, so changing a trip's dates would leave the
 * traveler's ticks, hidden tasks, edits and pinned places on ids that no longer exist.
 * This carries them across: when the trip starts earlier or later, everything moves by as
 * many days; when the flight home moves, its tasks' ticks and edits go to the new last day.
 */
export function followDates(before: Trip, after: Trip): Trip {
  if (before.startDate === after.startDate && before.endDate === after.endDate) return after;
  const shift = daysBetween(before.startDate, after.startDate);
  const oldLast = addDays(before.endDate, shift);
  const dateFor = (date: string, key = '') => {
    const moved = addDays(date, shift);
    return moved === oldLast && FLY_HOME.test(key) ? after.endDate : moved;
  };
  const idFor = (id: string) => {
    const m = /^auto:(\d{4}-\d{2}-\d{2}):(.+)$/.exec(id);
    return m ? `auto:${dateFor(m[1]!, m[2])}:${m[2]}` : id;
  };
  const keyOf = (id?: string) => (id ? /^auto:\d{4}-\d{2}-\d{2}:(.+)$/.exec(id)?.[1] : undefined);

  return {
    ...after,
    doneIds: after.doneIds.map(idFor),
    hiddenIds: after.hiddenIds.map(idFor),
    customTasks: after.customTasks.map((t) => ({
      ...t,
      date: dateFor(t.date, keyOf(t.replaces)),
      ...(t.replaces ? { replaces: idFor(t.replaces) } : {}),
    })),
    spots: after.spots.map((s) => (s.date ? { ...s, date: dateFor(s.date) } : s)),
  };
}
