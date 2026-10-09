import { addDays } from '../../utils/dates';
import { fromEthiopian, toEthiopian } from '../../utils/ethiopian';
import type { DayNote } from '../../types';

/** Orthodox Easter (Fasika) in the Gregorian calendar, from the Julian computus. */
export function fasika(year: number): string {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julian = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return addDays(julian, 13);
}

/** Islamic holidays follow moon sighting; these are the expected dates and can move by a day. */
const ISLAMIC: Record<string, string> = {
  '2026-03-20': 'Eid al-Fitr', '2027-03-10': 'Eid al-Fitr', '2028-02-27': 'Eid al-Fitr',
  '2026-05-27': 'Eid al-Adha', '2027-05-17': 'Eid al-Adha', '2028-05-05': 'Eid al-Adha',
  '2026-08-26': 'Mawlid', '2027-08-15': 'Mawlid', '2028-08-04': 'Mawlid',
};

interface Fixed {
  name: string;
  detail: string;
  date: (gregorianYear: number) => string;
}

/** Ethiopian-calendar feasts, converted for the Gregorian year the date falls in. */
function ethiopianFeast(month: number, day: number) {
  return (gYear: number) => {
    // Pick the Ethiopian year whose instance of this month and day falls in gYear.
    for (const eYear of [gYear - 8, gYear - 7]) {
      const iso = fromEthiopian({ year: eYear, month, day });
      if (iso.startsWith(String(gYear))) return iso;
    }
    return '';
  };
}

const FIXED: Fixed[] = [
  { name: 'Genna (Christmas)', detail: 'Overnight church services; Lalibela draws huge crowds. Many shops close.', date: (y) => `${y}-01-07` },
  { name: 'Timkat (Epiphany)', detail: 'Processions from the eve before. Gondar\'s Fasilides Bath and Lalibela are packed: book rooms months ahead.', date: ethiopianFeast(5, 11) },
  { name: 'Adwa Victory Day', detail: 'Public holiday; government offices and banks closed.', date: (y) => `${y}-03-02` },
  { name: 'Labour Day', detail: 'Public holiday.', date: (y) => `${y}-05-01` },
  { name: 'Patriots\' Victory Day', detail: 'Public holiday.', date: (y) => `${y}-05-05` },
  { name: 'Downfall of the Derg', detail: 'Public holiday.', date: (y) => `${y}-05-28` },
  { name: 'Enkutatash (New Year)', detail: 'Ethiopian New Year. Families gather; expect closures.', date: ethiopianFeast(1, 1) },
  { name: 'Meskel', detail: 'Demera bonfire the evening before at Meskel Square, Addis. Arrive early for a filming position.', date: ethiopianFeast(1, 17) },
];

export function holidayNotes(iso: string): DayNote[] {
  const year = Number(iso.slice(0, 4));
  const notes: DayNote[] = [];
  for (const f of FIXED) {
    const date = f.date(year);
    if (date === iso) notes.push({ kind: 'holiday', text: `${f.name}. ${f.detail}` });
    if (addDays(date, -1) === iso && (f.name.startsWith('Timkat') || f.name === 'Meskel')) {
      notes.push({ kind: 'holiday', text: `Eve of ${f.name}: the main celebrations start this evening.` });
    }
  }
  const easter = fasika(year);
  if (iso === easter) notes.push({ kind: 'holiday', text: 'Fasika (Easter). The fast ends after midnight services; most businesses close.' });
  if (iso === addDays(easter, -2)) notes.push({ kind: 'holiday', text: 'Siklet (Good Friday). Public holiday; long church services.' });
  const islamic = ISLAMIC[iso];
  if (islamic) notes.push({ kind: 'holiday', text: `${islamic} (expected; depends on moon sighting). Public holiday.` });
  return notes;
}

/** Orthodox fasting: the 55 days before Fasika, and every Wednesday and Friday outside the 50 days after it. */
export function fastingNote(iso: string): DayNote | null {
  const year = Number(iso.slice(0, 4));
  const easter = fasika(year);
  const lentStart = addDays(easter, -55);
  if (iso >= lentStart && iso < easter) {
    return { kind: 'fasting', text: 'Abiy Tsom (Lent). Many places serve only fasting (vegan) food until mid-afternoon; meat is harder to find.' };
  }
  const afterEaster = iso > easter && iso <= addDays(easter, 50);
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
  if (!afterEaster && (dow === 3 || dow === 5)) {
    return { kind: 'fasting', text: 'Fasting day (Wednesday or Friday). Expect mostly vegan menus; try beyaynetu.' };
  }
  return null;
}

export function ethiopianDayNotes(iso: string): DayNote[] {
  const fasting = fastingNote(iso);
  return [...holidayNotes(iso), ...(fasting ? [fasting] : [])];
}

export { toEthiopian };
