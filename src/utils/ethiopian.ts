import { addDays, daysBetween } from './dates';

/**
 * Ethiopian calendar and clock.
 * Calendar: 12 months of 30 days plus Pagume (5 or 6 days), about 7 to 8 years behind Gregorian.
 * Clock: the day starts at sunrise, so 07:00 is "1 in the morning" (1:00 day) and 19:00 is "1 at night".
 */

export const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
] as const;

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Meskerem 1 falls on 11 September, or on 12 September after an Ethiopian
 * leap year (one with a 6-day Pagume), which is when the year is divisible by 4.
 */
function newYear(ethiopianYear: number): string {
  const day = ethiopianYear % 4 === 0 ? 12 : 11;
  return `${ethiopianYear + 7}-09-${day}`;
}

export function toEthiopian(iso: string): EthiopianDate {
  let year = Number(iso.slice(0, 4)) - 7;
  if (iso < newYear(year)) year -= 1;
  const n = daysBetween(newYear(year), iso);
  return { year, month: Math.floor(n / 30) + 1, day: (n % 30) + 1 };
}

export function fromEthiopian({ year, month, day }: EthiopianDate): string {
  return addDays(newYear(year), (month - 1) * 30 + day - 1);
}

export function formatEthiopian(iso: string): string {
  const d = toEthiopian(iso);
  return `${ETHIOPIAN_MONTHS[d.month - 1]} ${d.day}, ${d.year} E.C.`;
}

/** "07:30" becomes "1:30 morning". Hours run 1 to 12 from 06:00 (day) and from 18:00 (night). */
export function toEthiopianClock(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const shifted = (h - 6 + 24) % 24;
  const hour12 = shifted % 12 === 0 ? 12 : shifted % 12;
  const period = h >= 6 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : h >= 18 ? 'evening' : 'night';
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
