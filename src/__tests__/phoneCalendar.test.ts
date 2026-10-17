import { beforeEach, describe, expect, it, vi } from 'vitest';

const cal = vi.hoisted(() => ({
  native: true,
  access: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => cal.native } }));
vi.mock('@ebarooni/capacitor-calendar', () => ({
  CapacitorCalendar: { requestFullCalendarAccess: cal.access, createEvent: cal.create, deleteEventsById: cal.remove },
}));

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

import { addTripToPhoneCalendar, phoneEvents, removeTripFromPhoneCalendar } from '../services/phoneCalendar';
import { calendarTasks } from '../services/ics';
import { generatePlan } from '../features/planner/generatePlan';
import { sampleTrip } from '../data/sampleTrip';

const trip = { ...sampleTrip(), id: 'trip-1' };
const plan = generatePlan(trip);
const tz = 'Africa/Addis_Ababa';

describe('adding a trip to the phone calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
    cal.native = true;
    cal.access.mockResolvedValue({ result: 'granted' });
    let n = 0;
    cal.create.mockImplementation(async () => ({ id: String(++n) }));
    cal.remove.mockResolvedValue({ result: { deleted: [], failed: [] } });
  });

  it('turns every task into one event, timed tasks at Addis time', () => {
    const events = phoneEvents(plan, tz);
    const tasks = calendarTasks(plan);
    expect(events).toHaveLength(tasks.length);
    const i = tasks.findIndex((t) => t.time);
    const timed = events[i];
    // Addis Ababa is UTC+3 all year: a task at 08:30 starts at 05:30 UTC.
    const [h = 0, min = 0] = tasks[i]!.time!.split(':').map(Number);
    const utc = new Date(timed!.startDate);
    expect(utc.getUTCHours() * 60 + utc.getUTCMinutes()).toBe((h * 60 + min - 180 + 1440) % 1440);
    expect(timed!.isAllDay).toBe(false);
    expect(timed!.endDate).toBeGreaterThan(timed!.startDate);
    const allDay = events[tasks.findIndex((t) => !t.time)];
    expect(allDay!.isAllDay).toBe(true);
    expect(allDay!.endDate).toBeUndefined();
  });

  it('asks for permission and stops if it is refused', async () => {
    cal.access.mockResolvedValue({ result: 'denied' });
    expect(await addTripToPhoneCalendar(trip, plan, tz)).toEqual({ status: 'denied' });
    expect(cal.create).not.toHaveBeenCalled();
  });

  it('adds the events, then replaces them instead of doubling on a second add', async () => {
    const count = calendarTasks(plan).length;
    expect(await addTripToPhoneCalendar(trip, plan, tz)).toEqual({ status: 'added', count });
    expect(cal.remove).not.toHaveBeenCalled();

    expect(await addTripToPhoneCalendar(trip, plan, tz)).toEqual({ status: 'updated', count });
    expect(cal.remove).toHaveBeenCalledTimes(1);
    const { ids } = cal.remove.mock.calls[0]![0] as { ids: string[] };
    expect(ids).toHaveLength(count);
    expect(ids[0]).toBe('1');
  });

  it('removes the events when the trip is deleted', async () => {
    await addTripToPhoneCalendar(trip, plan, tz);
    await removeTripFromPhoneCalendar(trip.id);
    expect(cal.remove).toHaveBeenCalledTimes(1);
    await removeTripFromPhoneCalendar(trip.id);
    expect(cal.remove).toHaveBeenCalledTimes(1);
  });

  it('remembers the events already added when one fails part way', async () => {
    cal.create.mockResolvedValueOnce({ id: 'a' }).mockRejectedValueOnce(new Error('boom'));
    await expect(addTripToPhoneCalendar(trip, plan, tz)).rejects.toThrow('boom');
    await removeTripFromPhoneCalendar(trip.id);
    expect(cal.remove).toHaveBeenCalledWith({ ids: ['a'] });
  });
});
