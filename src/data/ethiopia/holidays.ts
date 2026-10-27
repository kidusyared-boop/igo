import { addDays, formatDay } from '../../utils/dates';
import { fromEthiopian, toEthiopian } from '../../utils/ethiopian';
import type { DayNote, Festival, FestivalEvent } from '../../types';

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

/**
 * Irreecha: Abbaa Gadaa leaders announce the date each year. It has fallen on
 * the Sunday from 2 to 8 October (Hora Harsadi at Bishoftu), with Hora Finfinne
 * in Addis Ababa the Saturday before, so this is an expected date.
 */
export function irreecha(gYear: number): string {
  for (let d = 2; d <= 8; d += 1) {
    const iso = `${gYear}-10-0${d}`;
    if (new Date(`${iso}T12:00:00Z`).getUTCDay() === 0) return iso;
  }
  return '';
}

/** The Great Ethiopian Run is set by its organisers each year; add each new date from ethiopianrun.org. */
const GREAT_RUN: Record<number, { date: string; registerBy: string }> = {
  2026: { date: '2026-11-22', registerBy: '2026-11-11' },
};

const greatRun = (gYear: number) => GREAT_RUN[gYear]?.date ?? '';

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
  const bishoftu = irreecha(year);
  if (iso === addDays(bishoftu, -1)) notes.push({ kind: 'event', text: 'Irreecha in Addis Ababa (expected date). Huge crowds gather at Hora Finfinne in the morning and central roads close.' });
  if (iso === bishoftu) notes.push({ kind: 'event', text: 'Irreecha at Bishoftu (expected date). The road from Addis Ababa is jammed all morning.' });
  if (iso === greatRun(year)) notes.push({ kind: 'event', text: 'Great Ethiopian Run in Addis Ababa. Roads around Meskel Square, the National Palace and Bole Road close in the morning, so leave extra time for the airport.' });
  const islamic = ISLAMIC[iso];
  if (islamic) notes.push({ kind: 'holiday', text: `${islamic} (expected; depends on moon sighting). Public holiday.` });
  return notes;
}

type EventDraft = Omit<FestivalEvent, 'date'> & { dayOffset: number };

interface FestivalDraft {
  key: string;
  name: string;
  date: (y: number) => string;
  cityIds: string[];
  events: EventDraft[];
  when?: (date: string) => string;
  book?: (date: string) => { title: string; detail: string };
}

const CONFIRM = 'Times shift each year, so confirm with your hotel or guide the day before.';

/**
 * The big festivals and events, with the cities where they are worth being for.
 * Times are typical, checked against travel guides and tour operators in October 2026.
 */
const FESTIVALS: FestivalDraft[] = [
  {
    key: 'timkat',
    name: 'Timkat',
    date: ethiopianFeast(5, 11),
    cityIds: ['gondar', 'lalibela', 'addis'],
    events: [
      { key: 'timkat-eve-gondar', cityId: 'gondar', place: 'Fasilides Bath', dayOffset: -1, start: '13:00', end: '17:30', title: 'Timkat eve: follow the procession to Fasilides Bath', detail: `Roads close around 13:00, so be on the route by then. The procession leaves the city centre around 14:00 and reaches the bath around 17:00, with drums and singing. ${CONFIRM}` },
      { key: 'timkat-gondar', cityId: 'gondar', place: 'Fasilides Bath', dayOffset: 0, start: '06:00', end: '11:00', title: 'Timkat at Fasilides Bath: the water blessing, then the jump', detail: 'Mass runs through the night until about 07:00, then the archbishop blesses the pool and hundreds jump in. Be inside by 06:00 to get a place on the walls. Keep your camera in a dry bag and watch for pickpockets.' },
      { key: 'timkat-eve-lalibela', cityId: 'lalibela', dayOffset: -1, start: '13:00', end: '16:30', title: 'Timkat eve: the tabots go down to the pool', detail: `Priests in full robes lead the procession from the churches. Stand on higher ground for the best view. ${CONFIRM}` },
      { key: 'timkat-lalibela', cityId: 'lalibela', dayOffset: 0, start: '06:00', end: '10:30', title: 'Timkat morning: the water blessing and the walk back to the churches', detail: 'Be at the pool by 06:00. Pilgrims crowd the paths afterwards, so plan to walk, not drive.' },
      { key: 'timkat-eve-addis', cityId: 'addis', dayOffset: -1, start: '13:00', end: '16:30', title: 'Timkat eve: processions to Jan Meda', detail: `Tabots from churches across the city converge on Jan Meda. Roads close, so go on foot for the last part. ${CONFIRM}` },
      { key: 'timkat-addis', cityId: 'addis', dayOffset: 0, start: '06:00', end: '10:00', title: 'Timkat at Jan Meda: the water blessing', detail: 'Arrive by 06:00. Priests spray the crowd with blessed water, so protect your camera.' },
    ],
  },
  {
    key: 'genna',
    name: 'Genna',
    date: (y) => `${y}-01-07`,
    cityIds: ['lalibela'],
    events: [
      { key: 'genna-eve-lalibela', cityId: 'lalibela', dayOffset: -1, start: '18:00', end: '22:00', title: 'Genna eve: the night service around Bete Maryam', detail: `Thousands of pilgrims in white keep vigil through the night. Bring a warm layer and a head torch. ${CONFIRM}` },
      { key: 'genna-lalibela', cityId: 'lalibela', dayOffset: 0, start: '05:30', end: '09:30', title: 'Genna morning: priests chant on the rim above Bete Maryam', detail: 'The ceremony starts around sunrise and lasts two to three hours. The rim is kept for priests and officials, so watch from the slopes around the church, and hire a local guide for the crowded passages. No flash, and ask before photographing people at prayer.' },
    ],
  },
  {
    key: 'meskel',
    name: 'Meskel',
    date: ethiopianFeast(1, 17),
    cityIds: ['addis'],
    events: [
      { key: 'meskel-eve-addis', cityId: 'addis', dayOffset: -1, start: '14:00', end: '20:00', title: 'Demera: the Meskel bonfire at Meskel Square', detail: `Processions converge on the square from early afternoon and the bonfire is lit at nightfall. Arrive by 14:00 for a filming spot. ${CONFIRM}` },
    ],
  },
  {
    key: 'irreecha',
    name: 'Irreecha',
    date: irreecha,
    cityIds: ['addis'],
    events: [
      { key: 'irreecha-addis', cityId: 'addis', dayOffset: -1, start: '06:00', end: '11:00', title: 'Irreecha at Hora Finfinne: the Oromo thanksgiving in Addis', detail: `Hundreds of thousands gather in white and traditional dress, carrying fresh grass and flowers to the water to give thanks for the end of the rains. Go on foot, since central roads close. Ask before photographing people at prayer. ${CONFIRM}` },
      { key: 'irreecha-bishoftu', cityId: 'addis', place: 'Day trip to the Bishoftu crater lakes', dayOffset: 0, start: '05:30', end: '13:00', title: 'Irreecha at Lake Hora Harsadi, Bishoftu', detail: 'Leave Addis by 05:30: Bishoftu is about an hour away and the road jams. Abbaa Gadaa leaders open with blessings, then the crowd walks down to the lake. Stay off the steep slope to the water and keep your way out in mind, because a crush there killed dozens in 2016.' },
    ],
    when: (date) => `on the morning of ${formatDay(addDays(date, -1))} in Addis Ababa and the next morning at Bishoftu, an hour away`,
    book: (date) => ({
      title: 'Book a car to Bishoftu for Irreecha',
      detail: `You are in Addis Ababa for Irreecha on ${formatDay(addDays(date, -1))} and ${formatDay(date)}. Abbaa Gadaa leaders confirm the date a few weeks before, so check it then. Book a driver for the early run to Bishoftu now, because cars and Bishoftu rooms sell out.`,
    }),
  },
  {
    key: 'great-run',
    name: 'the Great Ethiopian Run',
    date: greatRun,
    cityIds: ['addis'],
    events: [
      { key: 'great-run-addis', cityId: 'addis', dayOffset: 0, start: '07:30', end: '10:30', title: 'Watch the Great Ethiopian Run at Meskel Square', detail: 'Up to 60,000 runners in matching shirts fill the streets for Africa\'s biggest 10 km race. The elite races start around 08:15, then the mass waves. The start and finish are both at Meskel Square, so film from the terraces. Times are set each year: check ethiopianrun.org the week before.' },
    ],
    when: (date) => `on the morning of ${formatDay(date)} at Meskel Square`,
    book: (date) => ({
      title: 'Want to run the Great Ethiopian Run? Register early',
      detail: `The race is on ${formatDay(date)} and international entries close on ${formatDay(GREAT_RUN[Number(date.slice(0, 4))]!.registerBy)} at ethiopianrun.org. Collect your race pack in person in Addis Ababa in the days before. Only watching? Nothing to book, but roads around Meskel Square close that morning.`,
    }),
  },
];

/** Festivals whose main day or eve falls between two dates. */
export function festivals(from: string, to: string): Festival[] {
  const out: Festival[] = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)) + 1; y += 1) {
    for (const f of FESTIVALS) {
      const date = f.date(y);
      if (!date || date < from || addDays(date, -1) > to) continue;
      const events = f.events.map(({ dayOffset, ...e }) => ({ ...e, date: addDays(date, dayOffset) })).filter((e) => e.date >= from && e.date <= to);
      out.push({ key: f.key, name: f.name, date, cityIds: f.cityIds, events, when: f.when?.(date), book: f.book?.(date) });
    }
  }
  return out;
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
