import type { City, CountryPack, Spot, Task, Trip } from '../../types';
import { fromMinutes, shiftTime, toMinutes } from '../../utils/dates';
import { utcToZoned, zonedToUtc } from '../../utils/timezone';
import { ANY_SLOTS, EARLY_FLIGHT, LATEST_CHECK_IN, MOVE_DEPART, anySlots, arrivalCheckIn, clashesWithEvent, departureLeave, isEveOfEarlyFlight, moveCheckIn, type DaySkeleton } from './assignSpots';
import { travelDetail } from './route';
import { interestLabel } from './personalize';
import { needsVisa } from './diaspora';
import { withBookings } from '../bookings/bookings';

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
      case 'dinner': {
        // After an evening outing, dinner waits until it is over.
        const time = ctx.spots.some((s) => s.light === 'night') ? fromMinutes(Math.ceil((toMinutes(sunset) + 180) / 10) * 10) : '19:30';
        drafts.push({ key, time, title: mealTitle(spot, 'Dinner'), detail, category: 'food' });
        break;
      }
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
  const { trip, country, city } = ctx;
  const a = trip.arrivalTime;
  const via = ctx.day.viaHub;
  // Landing before 11:00 means reaching the stay before normal check-in time.
  const early = !via && toMinutes(a) < toMinutes('11:00');
  // A connection that would arrive after the latest check-in waits for the morning.
  const overnight = Boolean(via) && arrivalCheckIn(ctx.day, trip) > LATEST_CHECK_IN;
  const checkInAt = overnight ? toMinutes(a) + 120 : arrivalCheckIn(ctx.day, trip);
  const checkIn = fromMinutes(checkInAt);
  const late = checkInAt >= toMinutes('21:30');
  const hub = country.cities[0]?.name ?? 'the capital';
  // Landing late at night: the steps after landing would all pile up at 23:59, so they become one.
  if (toMinutes(a) >= toMinutes('22:00')) {
    return [
      { key: 'land', time: a, title: 'Land and clear immigration', detail: needsVisa(trip) ? country.entry.summary : 'Use the Ethiopian citizens and Origin ID line with your document ready.', category: 'logistics' },
      { key: 'ride', time: fromMinutes(Math.min(toMinutes(a) + 30, 24 * 60 - 1)), title: 'Get to your stay and sleep', detail: `${via ? `Domestic flights don't run overnight, so sleep near the airport and fly on to ${city.name} in the morning. ` : ''}Turn on your eSIM at the airport if you need a ride app; cash can wait until morning. ${country.rideApps}`, category: 'logistics' },
    ];
  }
  return [
    { key: 'land', time: a, title: 'Land and clear immigration', detail: needsVisa(trip) ? country.entry.summary : 'Use the Ethiopian citizens and Origin ID line with your document ready.', category: 'logistics' },
    ...(trip.diaspora ? [{ key: 'tell-family', time: shiftTime(a, 50), title: 'Tell family you have landed and when you will reach them', category: 'logistics' as const }] : []),
    { key: 'esim', time: shiftTime(a, 45), title: 'Turn on your eSIM and test data', detail: country.connectivity, category: 'logistics' },
    { key: 'cash', time: shiftTime(a, 55), title: `Get ${country.currency.code} cash from a bank ATM`, detail: country.currency.cashNote, category: 'logistics' },
    via && !overnight
      ? { key: 'connect', time: shiftTime(a, 90), title: `Catch your connection to ${city.name}`, detail: `${city.access ?? ''} Leave at least 2 hours between landing and a domestic flight. On one Ethiopian Airlines ticket your bags go straight through.`.trim(), category: 'logistics' as const }
      : { key: 'ride', time: shiftTime(a, 70), title: overnight ? `Get to a stay in ${hub} for tonight` : 'Get to your stay', detail: overnight ? `It is too late to reach ${city.name} today. Book the first connection tomorrow morning. ${country.rideApps}` : country.rideApps, category: 'logistics' as const },
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
  const hours = ctx.day.moveHours ?? 4.5;
  const checkIn = moveCheckIn(ctx.day);
  const tooLong = MOVE_DEPART + hours * 60 > LATEST_CHECK_IN;
  const how = ctx.fromCity ? travelDetail(ctx.fromCity, ctx.city, ctx.country) : ctx.city.access;
  const length = tooLong
    ? `This takes more than a day (about ${hours} hours). Break the journey with a night on the way, or add a stop in ${ctx.country.cities[0]?.name ?? 'the capital'}.`
    : how?.includes('hours by road')
      ? ''
      : `Plan on about ${hours} hours door to door, waits included.`;
  return [
    { key: 'move-out', time: '08:00', title: `Check out in ${from}`, detail: 'Confirm your transfer time the night before.', category: 'logistics' },
    { key: 'move', time: fromMinutes(MOVE_DEPART), title: `Travel to ${ctx.city.name}`, detail: `${how ?? ''} ${length}`.trim(), category: 'logistics' },
    { key: 'move-in', time: fromMinutes(checkIn), title: `Check in in ${ctx.city.name}`, category: 'logistics' },
    ...altitudeDrafts(ctx, fromMinutes(checkIn + 15)),
  ];
}

function departureDrafts(ctx: DayContext): Draft[] {
  const { trip, country } = ctx;
  const d = trip.departureTime;
  if (ctx.day.viaHub && ctx.day.kind === 'departure') return hubDepartureDrafts(ctx);
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

/** The last day in a city without international flights: get back to the hub first. */
function hubDepartureDrafts(ctx: DayContext): Draft[] {
  const { trip, country, city } = ctx;
  const hub = country.cities[0]!;
  const flight = toMinutes(trip.departureTime);
  const leave = departureLeave(ctx.day, trip);
  const at = (m: number) => fromMinutes(Math.max(0, m));
  if (leave < toMinutes('05:00')) {
    return [
      {
        key: 'airport',
        time: at(flight - 180),
        title: `Be at the airport in ${hub.name} for your flight home`,
        detail: `Your flight is too early to reach from ${city.name} on the same day, so spend your last night in ${hub.name}. ${travelDetail(city, hub, country) ?? ''}`.trim(),
        category: 'logistics',
      },
      { key: 'flight', time: trip.departureTime, title: 'Flight departs', category: 'logistics' },
    ];
  }
  const drafts: Draft[] = [
    { key: 'cash-out', time: at(leave - 60), title: `Spend or exchange leftover ${country.currency.code}`, category: 'logistics' },
    { key: 'checkout', time: at(leave - 30), title: 'Check out and settle your bill', category: 'logistics' },
    {
      key: 'airport-hub',
      time: at(leave),
      title: `Leave for ${hub.name}: your flight home leaves from there`,
      detail: `Be at the international airport by ${at(flight - 180)}. ${travelDetail(city, hub, country) ?? ''}`.trim(),
      category: 'logistics',
    },
    { key: 'airport', time: at(flight - 180), title: `Check in for your flight home in ${hub.name}`, category: 'logistics' },
    { key: 'flight', time: trip.departureTime, title: 'Flight departs', category: 'logistics' },
  ];
  if (trip.mode === 'creator') {
    drafts.unshift({ key: 'final-backup', time: at(leave - 90), title: 'Final backup: every card on two drives before you format anything', category: 'edit' });
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
  return ctx.day.movedFrom ? fromMinutes(Math.max(toMinutes('16:30'), moveCheckIn(ctx.day) + 30)) : '16:00';
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
    const leave = departureLeave(day, trip);
    drafts = drafts.filter((t) => !t.time || toMinutes(t.time) <= leave || t.key === 'flight' || t.key.startsWith('airport'));
  }

  if (isEveOfEarlyFlight(day, trip)) {
    // Nothing after the wrap-up: the night is short.
    drafts = drafts.filter((t) => !t.time || toMinutes(t.time) < toMinutes('21:00') || t.key === 'land' || t.key === 'ride' || t.key === 'move-in');
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

  const tasks = spreadOut(drafts).map(({ key, ...rest }) => ({ ...rest, id: `auto:${day.date}:${key}`, date: day.date, source: 'auto' as const }));
  return withBookings(trip, day, tasks);
}

/** Tasks tied to a clock someone else sets: flights, light, events and the audience's posting time. */
const isFixed = (key: string) => /^(post|land|flight|airport|spot-|go-|fest-)/.test(key);

/**
 * No two tasks share a minute. Fixed tasks keep their time; a flexible one that lands on a
 * taken minute moves 10 minutes later, or earlier when the day has run out.
 */
function spreadOut(drafts: Draft[]): Draft[] {
  const taken = new Set(drafts.filter((t) => t.time && isFixed(t.key)).map((t) => toMinutes(t.time!)));
  return drafts.map((t) => {
    if (!t.time || isFixed(t.key)) return t;
    let at = toMinutes(t.time);
    for (let step = 10; taken.has(at); ) {
      if (at + step > 24 * 60 - 1) step = -10;
      at += step;
    }
    taken.add(at);
    return at === toMinutes(t.time) ? t : { ...t, time: fromMinutes(at) };
  });
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return toMinutes(a.time) - toMinutes(b.time);
  });
}

