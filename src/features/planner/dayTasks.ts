import type { City, CountryPack, Spot, Task, Trip } from '../../types';
import { fromMinutes, shiftTime, toMinutes } from '../../utils/dates';
import { utcToZoned, zonedToUtc } from '../../utils/timezone';
import { ANY_SLOTS, EARLY_FLIGHT, MOVE_CHECK_IN, anySlots, clashesWithEvent, isEveOfEarlyFlight, type DaySkeleton } from './assignSpots';
import { travelDetail } from './route';
import { interestLabel } from './personalize';
import { needsVisa } from './diaspora';

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

function spotDetail(spot: Spot, trip: Trip): string | undefined {
  const why = spot.pickedFor?.length ? `Picked for you: ${spot.pickedFor.map(interestLabel).join(', ')}. ` : '';
  const access = trip.mobility === 'limited' && spot.effort === 'moderate' ? 'Expect steps or uneven ground; ask your guide for the easiest way in. ' : '';
  return `${why}${access}${spot.shotList}`.trim() || undefined;
}

function mealTitle(spot: Spot, meal: 'Lunch' | 'Dinner'): string {
  return /lunch|dinner/i.test(spot.name) ? spot.name.replace(/^(lunch|dinner):\s*/i, `${meal}: `) : `${meal} at ${spot.name}`;
}

function spotDrafts(ctx: DayContext, sunrise: string, sunset: string): Draft[] {
  const creator = ctx.trip.mode === 'creator';
  const verb = creator ? 'Shoot' : 'Visit';
  const drafts: Draft[] = [];
  const anyTimes = anySlots(ctx.day, ctx.trip);
  let anyIndex = 0;
  for (const spot of ctx.spots) {
    const detail = spotDetail(spot, ctx.trip);
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
        if (spot.allDay) {
          const title = /^day trip/i.test(spot.name) ? spot.name : `Day trip: ${spot.name}`;
          drafts.push({ key, time: '08:30', title, detail: `Leave by 08:30 and plan to be out until late afternoon. ${detail ?? ''}`.trim(), category });
          break;
        }
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
  // Landing before 11:00 means reaching the stay before normal check-in time.
  const early = toMinutes(a) < toMinutes('11:00');
  const checkInAt = toMinutes(a) + 120;
  const checkIn = fromMinutes(checkInAt);
  const late = checkInAt >= toMinutes('21:30');
  // Landing late at night: the steps after landing would all pile up at 23:59, so they become one.
  if (toMinutes(a) >= toMinutes('22:00')) {
    return [
      { key: 'land', time: a, title: 'Land and clear immigration', detail: needsVisa(trip) ? country.entry.summary : 'Use the Ethiopian citizens and Origin ID line with your document ready.', category: 'logistics' },
      { key: 'ride', time: fromMinutes(Math.min(toMinutes(a) + 30, 24 * 60 - 1)), title: 'Get to your stay and sleep', detail: `Turn on your eSIM at the airport if you need a ride app; cash can wait until morning. ${country.rideApps}`, category: 'logistics' },
    ];
  }
  return [
    { key: 'land', time: a, title: 'Land and clear immigration', detail: needsVisa(trip) ? country.entry.summary : 'Use the Ethiopian citizens and Origin ID line with your document ready.', category: 'logistics' },
    ...(trip.diaspora ? [{ key: 'tell-family', time: shiftTime(a, 50), title: 'Tell family you have landed and when you will reach them', category: 'logistics' as const }] : []),
    { key: 'esim', time: shiftTime(a, 45), title: 'Turn on your eSIM and test data', detail: country.connectivity, category: 'logistics' },
    { key: 'cash', time: shiftTime(a, 55), title: `Get ${country.currency.code} cash from a bank ATM`, detail: country.currency.cashNote, category: 'logistics' },
    { key: 'ride', time: shiftTime(a, 70), title: 'Get to your stay', detail: country.rideApps, category: 'logistics' },
    early
      ? { key: 'checkin', time: checkIn, title: 'Ask for early check-in, or drop your bags. Nap 90 minutes at most', detail: 'Put every battery on charge while you rest.', category: 'logistics' }
      : { key: 'checkin', time: checkIn, title: 'Check in, unpack, put every battery on charge', category: 'logistics' },
    late
      ? { key: 'sleep', time: fromMinutes(checkInAt + 15), title: 'Go straight to sleep', detail: 'Set an alarm for local breakfast time so tomorrow starts on Ethiopian time.', category: 'rest' }
      : { key: 'sleep', time: '22:00', title: 'Lights out by 22:00 local to reset your body clock', detail: 'Get daylight today and avoid naps longer than 20 minutes.', category: 'rest' },
    ...(late ? [] : altitudeDrafts(ctx, fromMinutes(checkInAt + 15))),
    // People visiting home already know the local clock and customs.
    ...(trip.diaspora || late ? [] : country.arrivalTasks ?? []).map((t, i) => ({ ...t, time: fromMinutes(checkInAt + 30 + i * 10), category: 'logistics' as const })),
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
    { key: 'move', time: '09:30', title: `Travel to ${ctx.city.name}`, detail: ctx.fromCity ? travelDetail(ctx.fromCity, ctx.city, ctx.country) : ctx.city.access, category: 'logistics' },
    { key: 'move-in', time: MOVE_CHECK_IN, title: `Check in in ${ctx.city.name}`, category: 'logistics' },
    ...altitudeDrafts(ctx, shiftTime(MOVE_CHECK_IN, 15)),
  ];
}

function departureDrafts(ctx: DayContext): Draft[] {
  const { trip, country } = ctx;
  const d = trip.departureTime;
  if (toMinutes(d) < EARLY_FLIGHT && ctx.day.kind === 'departure') {
    // Checkout, cash and backup sit on the evening before; see eveDrafts.
    return [
      { key: 'airport', time: fromMinutes(toMinutes(d) - 180), title: 'Leave for the airport', detail: country.rideApps, category: 'logistics' },
      { key: 'flight', time: d, title: 'Flight departs', category: 'logistics' },
    ];
  }
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

/** The evening before a flight in the small hours: wrap up before a short night. */
function eveDrafts(ctx: DayContext): Draft[] {
  const { trip, country } = ctx;
  const leave = toMinutes(trip.departureTime) - 180;
  const when = leave < 0 ? `${fromMinutes(leave + 24 * 60)} tonight` : `${fromMinutes(leave)} after midnight`;
  const drafts: Draft[] = [
    { key: 'cash-out', time: '19:00', title: `Spend or exchange leftover ${country.currency.code}`, category: 'logistics' },
    { key: 'checkout', time: '20:00', title: `Pack, settle your bill and book a ride for ${when}`, detail: 'Your flight leaves before dawn, so tonight is your last evening.', category: 'logistics' },
  ];
  if (trip.mode === 'creator') {
    drafts.push({ key: 'final-backup', time: '18:00', title: 'Final backup: every card on two drives before you format anything', category: 'edit' });
  }
  return drafts;
}

/** After the afternoon's shoot: in the evening after a day out, later on a moving day. */
function editTime(ctx: DayContext, hasAnySpot: boolean): string {
  if (ctx.spots.some((s) => s.allDay) || (ctx.day.movedFrom && hasAnySpot)) return '20:00';
  return ctx.day.movedFrom ? '16:30' : '16:00';
}

function creatorRoutine(ctx: DayContext, hasAnySpot: boolean): Draft[] {
  const { trip, city, day } = ctx;
  const post = postingTime(day.date, trip.audienceTimeZone, city.timeZone);
  const late = toMinutes(post.time) < toMinutes('07:00');
  const drafts: Draft[] = [
    { key: 'backup', time: '21:30', title: 'Back up footage: one drive plus cloud', detail: 'Keep cards untouched until the copy is verified.', category: 'edit' },
    { key: 'edit', time: editTime(ctx, hasAnySpot), title: 'Edit: pick selects and cut today\'s short', category: 'edit' },
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
  if (!trip.withKids && !ctx.spots.some((s) => s.light === 'lunch' || s.allDay)) {
    drafts.push({ key: 'midday', time: '13:00', title: 'Lunch and rest through the harsh midday light', category: 'rest' });
  }
  return drafts;
}

/** Tasks that only fill spare time, dropped when a festival event takes that time. */
const FILLERS = new Set(['broll', 'midday', 'explore', 'scout', 'kids-break', 'family', 'settle-walk']);

function festivalDrafts(ctx: DayContext): Draft[] {
  const category = ctx.trip.mode === 'creator' ? 'shoot' : 'explore';
  return (ctx.day.events ?? []).map((e) => ({ key: `fest-${e.key}`, time: e.start, title: e.title, detail: e.detail, category }));
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

  // A moving day with no place left to see still gets one easy outing after check-in.
  const [moveSlot] = day.kind === 'full' && day.movedFrom && !hasAnySpot ? anySlots(day, trip) : [];
  if (moveSlot) {
    drafts.push(
      creator
        ? { key: 'settle-walk', time: moveSlot, title: `Film establishing shots of ${ctx.city.name} near your stay`, detail: 'Street signs, skyline, daily life: the shots that tell viewers where you are now.', category: 'shoot' }
        : { key: 'settle-walk', time: moveSlot, title: `Walk around ${ctx.city.name} near your stay`, detail: 'An easy first look after the journey: find a cafe, a cash machine and your bearings.', category: 'explore' },
    );
  }

  if (trip.diaspora && trip.familyTime && day.kind === 'full' && !day.movedFrom) {
    drafts.push({ key: 'family', time: '15:00', title: 'Family time', detail: 'Kept free for visits, coffee at home and meals with relatives.', category: 'rest' });
  }

  if (trip.diaspora && (day.kind === 'full' || day.kind === 'arrival') && ctx.country.dayNotes?.(day.date).some((n) => n.kind === 'holiday')) {
    drafts.push({ key: 'holiday-home', time: '09:00', title: 'Holiday at home: confirm where the family gathers', detail: 'Shops and offices close and transport is busy. Book any ride a day ahead.', category: 'logistics' });
  }

  if (trip.withKids && day.kind === 'full' && !day.movedFrom) {
    drafts.push({ key: 'kids-break', time: '13:30', title: 'Quiet break at your stay for the kids', detail: 'A nap or downtime after lunch keeps the afternoon calm, especially at altitude.', category: 'rest' });
  }

  if (day.kind === 'arrival' && creator && ctx.spots.length === 0) {
    const free = toMinutes(trip.arrivalTime) + 180;
    if (free <= toMinutes(sunset) - 60) {
      drafts.push({ key: 'scout', time: shiftTime(sunset, -60), title: 'Scout nearby and film arrival B-roll at golden hour', category: 'shoot' });
    }
  }

  if (day.events?.length) {
    drafts = drafts
      .filter((t) => !(FILLERS.has(t.key) && t.time && clashesWithEvent(day, toMinutes(t.time), toMinutes(t.time) + 90)))
      .map((t) => (t.key === 'edit' && t.time && clashesWithEvent(day, toMinutes(t.time), toMinutes(t.time) + 90) ? { ...t, time: '20:30' } : t));
    drafts.push(...festivalDrafts(ctx));
  }

  if (day.kind === 'departure') {
    const leave = toMinutes(trip.departureTime) - 180;
    drafts = drafts.filter((t) => !t.time || toMinutes(t.time) <= leave || t.key === 'flight' || t.key === 'airport');
  }

  if (isEveOfEarlyFlight(day, trip)) {
    // Nothing after the wrap-up: the night is short.
    drafts = drafts.filter((t) => !t.time || toMinutes(t.time) < toMinutes('21:00') || t.key === 'land' || t.key === 'ride');
    const landed = day.kind === 'arrival' ? toMinutes(trip.arrivalTime) : 0;
    // Landing the evening before a small-hours flight: wrap up once you are at your stay.
    drafts.push(...eveDrafts(ctx).map((t, i) => (t.time && toMinutes(t.time) <= landed ? { ...t, time: fromMinutes(Math.min(landed + 90 + i * 10, 24 * 60 - 1)) } : t)));
  }

  if (day.kind === 'arrival' || day.kind === 'single') {
    // Nothing the traveler cannot do yet: before landing, or (in a one-day stopover) after leaving for the airport.
    const landed = toMinutes(trip.arrivalTime);
    const leave = day.kind === 'single' ? toMinutes(trip.departureTime) - 180 : 24 * 60;
    drafts = drafts.filter((t) => !t.time || t.key === 'flight' || t.key === 'airport' || (toMinutes(t.time) >= landed && toMinutes(t.time) <= leave));
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

