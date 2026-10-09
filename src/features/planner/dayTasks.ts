import type { City, CountryPack, Spot, Task, Trip } from '../../types';
import { fromMinutes, shiftTime, toMinutes } from '../../utils/dates';
import { utcToZoned, zonedToUtc } from '../../utils/timezone';
import { ANY_SLOTS, MOVE_CHECK_IN, freeWindow, type DaySkeleton } from './assignSpots';
import { interestLabel } from './personalize';

export interface DayContext {
  trip: Trip;
  country: CountryPack;
  city: City;
  /** City of the previous night, on a day that moves to `city`. */
  fromCity?: City;
  day: DaySkeleton;
  spots: Spot[];
}

type Draft = Omit<Task, 'id' | 'date' | 'source'> & { key: string };

/** Post at 19:00 in the audience's time zone, converted to the city's local time. */
export function postingTime(date: string, audienceTimeZone: string, cityTimeZone: string): { time: string; dayShift: number } {
  const instant = zonedToUtc(date, '19:00', audienceTimeZone);
  const local = utcToZoned(instant, cityTimeZone);
  const shift = Math.round((Date.parse(local.date) - Date.parse(date)) / 86_400_000);
  return { time: local.time, dayShift: shift };
}

function spotDetail(spot: Spot): string | undefined {
  const why = spot.pickedFor?.length ? `Picked for you: ${spot.pickedFor.map(interestLabel).join(', ')}. ` : '';
  return `${why}${spot.shotList}`.trim() || undefined;
}

function mealTitle(spot: Spot, meal: 'Lunch' | 'Dinner'): string {
  return /lunch|dinner/i.test(spot.name) ? spot.name.replace(/^(lunch|dinner):\s*/i, `${meal}: `) : `${meal} at ${spot.name}`;
}

function spotDrafts(ctx: DayContext, sunrise: string, sunset: string): Draft[] {
  const creator = ctx.trip.mode === 'creator';
  const verb = creator ? 'Shoot' : 'Visit';
  const drafts: Draft[] = [];
  const [free, leave] = freeWindow(ctx.day, ctx.trip);
  const anyTimes = ANY_SLOTS.filter((t) => toMinutes(t) >= free && toMinutes(t) + 120 <= leave);
  let anyIndex = 0;
  for (const spot of ctx.spots) {
    const detail = spotDetail(spot);
    const category = creator ? 'shoot' : 'explore';
    const key = `spot-${spot.id}`;
    switch (spot.light) {
      case 'sunrise':
        drafts.push({ key: `go-${spot.id}`, time: shiftTime(sunrise, -60), title: `Leave for ${spot.name}`, category: 'logistics' });
        drafts.push({ key, time: shiftTime(sunrise, -30), title: `${verb} ${spot.name} at sunrise`, detail, category });
        break;
      case 'sunset':
        drafts.push({ key: `go-${spot.id}`, time: shiftTime(sunset, -90), title: `Head to ${spot.name}`, category: 'logistics' });
        drafts.push({ key, time: shiftTime(sunset, -60), title: `${verb} ${spot.name}: golden hour into blue hour`, detail, category });
        break;
      case 'night':
        drafts.push({ key, time: shiftTime(sunset, 90), title: `${verb} ${spot.name} after dark`, detail, category });
        break;
      case 'lunch':
        drafts.push({ key, time: '12:30', title: mealTitle(spot, 'Lunch'), detail, category: 'food' });
        break;
      case 'dinner':
        drafts.push({ key, time: '19:30', title: mealTitle(spot, 'Dinner'), detail, category: 'food' });
        break;
      default: {
        const time = anyTimes[anyIndex] ?? anyTimes.at(-1) ?? ANY_SLOTS[0]!;
        anyIndex += 1;
        const title = /^day trip/i.test(spot.name) ? spot.name : `${verb} ${spot.name}`;
        drafts.push({ key, time, title, detail, category });
      }
    }
  }
  return drafts;
}

function arrivalDrafts(ctx: DayContext): Draft[] {
  const { trip, country } = ctx;
  const a = trip.arrivalTime;
  const checkIn = fromMinutes(Math.max(toMinutes(a) + 120, toMinutes('15:00')));
  return [
    { key: 'land', time: a, title: 'Land and clear immigration', detail: country.entry.summary, category: 'logistics' },
    { key: 'esim', time: shiftTime(a, 45), title: 'Turn on your eSIM and test data', detail: country.connectivity, category: 'logistics' },
    { key: 'cash', time: shiftTime(a, 55), title: `Get ${country.currency.code} cash from a bank ATM`, detail: country.currency.cashNote, category: 'logistics' },
    { key: 'ride', time: shiftTime(a, 70), title: 'Get to your stay', detail: country.rideApps, category: 'logistics' },
    { key: 'checkin', time: checkIn, title: 'Check in, unpack, put every battery on charge', category: 'logistics' },
    ...(toMinutes(a) < toMinutes('11:00')
      ? [{ key: 'early', time: shiftTime(a, 120), title: 'Ask for early check-in, or drop your bags and nap 90 minutes at most', category: 'rest' as const }]
      : []),
    { key: 'sleep', time: '22:00', title: 'Lights out by 22:00 local to reset your body clock', detail: 'Get daylight today and avoid naps longer than 20 minutes.', category: 'rest' },
    ...altitudeDrafts(ctx, shiftTime(checkIn, 15)),
    ...(country.arrivalTasks ?? []).map((t, i) => ({ ...t, time: shiftTime(checkIn, 30 + i * 10), category: 'logistics' as const })),
  ];
}

function altitudeDrafts(ctx: DayContext, time: string): Draft[] {
  const alt = ctx.city.altitudeM ?? 0;
  if (alt < 2000) return [];
  return [{
    key: 'altitude',
    time,
    title: `Take it easy: ${ctx.city.name} is at ${alt.toLocaleString('en-US')} m`,
    detail: 'Drink plenty of water, skip alcohol tonight and expect to get out of breath on stairs.',
    category: 'rest',
  }];
}

function moveDrafts(ctx: DayContext): Draft[] {
  const from = ctx.fromCity?.name ?? 'your last stop';
  return [
    { key: 'move-out', time: '08:00', title: `Check out in ${from}`, detail: 'Confirm your transfer time the night before.', category: 'logistics' },
    { key: 'move', time: '09:30', title: `Travel to ${ctx.city.name}`, detail: ctx.city.access, category: 'logistics' },
    { key: 'move-in', time: MOVE_CHECK_IN, title: `Check in in ${ctx.city.name}`, category: 'logistics' },
    ...altitudeDrafts(ctx, shiftTime(MOVE_CHECK_IN, 15)),
  ];
}

function departureDrafts(ctx: DayContext): Draft[] {
  const { trip, country } = ctx;
  const d = trip.departureTime;
  const drafts: Draft[] = [
    { key: 'checkout', time: fromMinutes(Math.min(toMinutes('11:00'), toMinutes(d) - 240)), title: 'Check out and leave bags with reception', category: 'logistics' },
    { key: 'cash-out', time: shiftTime(d, -210), title: `Spend or exchange leftover ${country.currency.code}`, category: 'logistics' },
    { key: 'airport', time: shiftTime(d, -180), title: 'Leave for the airport', detail: country.rideApps, category: 'logistics' },
    { key: 'flight', time: d, title: 'Flight departs', category: 'logistics' },
  ];
  if (trip.mode === 'creator') {
    drafts.unshift({ key: 'final-backup', time: fromMinutes(Math.max(0, toMinutes(d) - 300)), title: 'Final backup: every card on two drives before you format anything', category: 'edit' });
  }
  return drafts;
}

function creatorRoutine(ctx: DayContext, hasAnySpot: boolean): Draft[] {
  const { trip, city, day } = ctx;
  const post = postingTime(day.date, trip.audienceTimeZone, city.timeZone);
  const late = toMinutes(post.time) < toMinutes('07:00');
  const drafts: Draft[] = [
    { key: 'backup', time: '21:30', title: 'Back up footage: one drive plus cloud', detail: 'Keep cards untouched until the copy is verified.', category: 'edit' },
    { key: 'edit', time: '16:00', title: 'Edit: pick selects and cut today\'s short', category: 'edit' },
    late
      ? {
          key: 'post',
          time: '21:00',
          title: 'Schedule today\'s post before bed',
          detail: `Set it to go live at ${post.time} here, which is 19:00 for your audience (${trip.audienceTimeZone}).`,
          category: 'post',
        }
      : {
          key: 'post',
          time: post.time,
          title: 'Publish today\'s post',
          detail: `${post.time} here is 19:00 for your audience (${trip.audienceTimeZone}).`,
          category: 'post',
        },
    { key: 'charge', time: '22:00', title: 'Charge batteries and clear cards for tomorrow', category: 'rest' },
  ];
  if (ctx.day.movedFrom) {
    drafts.push({ key: 'travel-broll', time: '10:00', title: 'Film the journey: departure, window shots, arrival', category: 'shoot' });
    return drafts;
  }
  if (!hasAnySpot) {
    drafts.push({ key: 'broll', time: '10:30', title: 'Film B-roll: food, transport, street life, hands and details', category: 'shoot' });
  }
  if (!ctx.spots.some((s) => s.light === 'lunch')) {
    drafts.push({ key: 'midday', time: '13:00', title: 'Lunch and rest through the harsh midday light', category: 'rest' });
  }
  return drafts;
}

export function buildDayTasks(ctx: DayContext): Task[] {
  const { trip, day } = ctx;
  const sunrise = day.sun?.sunrise ?? '06:30';
  const sunset = day.sun?.sunset ?? '18:30';
  const creator = trip.mode === 'creator';
  const hasAnySpot = ctx.spots.some((s) => s.light === 'any');
  let drafts: Draft[] = spotDrafts(ctx, sunrise, sunset);

  if (day.kind === 'arrival' || day.kind === 'single') drafts.push(...arrivalDrafts(ctx));
  if (day.kind === 'departure' || day.kind === 'single') drafts.push(...departureDrafts(ctx));

  if (day.kind === 'full' && day.movedFrom) drafts.push(...moveDrafts(ctx));

  if (day.kind === 'full') {
    if (creator) drafts.push(...creatorRoutine(ctx, hasAnySpot));
    else {
      if (!hasAnySpot && !day.movedFrom) drafts.push({ key: 'explore', time: '10:00', title: 'Explore a new neighborhood on foot', category: 'explore' });
      drafts.push({ key: 'plan-tomorrow', time: '21:00', title: 'Plan tomorrow: check opening hours and book timed tickets', category: 'rest' });
    }
  }

  if (day.kind === 'arrival' && creator && ctx.spots.length === 0) {
    const free = toMinutes(trip.arrivalTime) + 180;
    if (free <= toMinutes(sunset) - 60) {
      drafts.push({ key: 'scout', time: shiftTime(sunset, -60), title: 'Scout nearby and film arrival B-roll at golden hour', category: 'shoot' });
    }
  }

  if (day.kind === 'departure') {
    const leave = toMinutes(trip.departureTime) - 180;
    drafts = drafts.filter((t) => !t.time || toMinutes(t.time) <= leave || t.key === 'flight');
  }

  return drafts.map(({ key, ...rest }) => ({ ...rest, id: `auto:${day.date}:${key}`, date: day.date, source: 'auto' as const }));
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return toMinutes(a.time) - toMinutes(b.time);
  });
}

