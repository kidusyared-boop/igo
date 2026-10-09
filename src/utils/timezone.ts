/** Wall-clock helpers built on Intl, so no time zone library is needed. */

function partsIn(timeZone: string, date: Date): Record<string, number> {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out;
}

/** Offset of `timeZone` from UTC at `date`, in minutes (Tokyo is +540). */
export function offsetMinutes(timeZone: string, date: Date): number {
  const p = partsIn(timeZone, date);
  const asUtc = Date.UTC(p.year ?? 0, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0, p.second ?? 0);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** The UTC instant for a wall-clock time on a date in a time zone. */
export function zonedToUtc(isoDate: string, hhmm: string, timeZone: string): Date {
  const guess = new Date(`${isoDate}T${hhmm}:00Z`);
  const first = new Date(guess.getTime() - offsetMinutes(timeZone, guess) * 60_000);
  // Re-check once in case the guess crossed a DST change.
  return new Date(guess.getTime() - offsetMinutes(timeZone, first) * 60_000);
}

/** Wall-clock date and time of a UTC instant in a time zone. */
export function utcToZoned(date: Date, timeZone: string): { date: string; time: string } {
  const p = partsIn(timeZone, date);
  const pad = (n: number | undefined) => String(n ?? 0).padStart(2, '0');
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
