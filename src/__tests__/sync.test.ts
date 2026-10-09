import { describe, expect, it } from 'vitest';
import { mergeTrips, type RemoteTrip } from '../services/sync';
import { sampleTrip } from '../data/sampleTrip';
import type { Trip } from '../types';

const trip = (id: string, updatedAt: string, name = id): Trip => ({ ...sampleTrip(), id, name, updatedAt });
const row = (t: Trip, deleted = false): RemoteTrip => ({ id: t.id, data: t, updated_at: t.updatedAt!, deleted });

describe('mergeTrips', () => {
  it('pulls trips made on another device and pushes trips made here', () => {
    const here = trip('a', '2026-10-01T10:00:00Z');
    const there = trip('b', '2026-10-01T11:00:00Z');
    const out = mergeTrips([here], [], [row(there)]);
    expect(out.trips.map((t) => t.id).sort()).toEqual(['a', 'b']);
    expect(out.push.map((r) => r.id)).toEqual(['a']);
  });
  it('keeps the newest edit of the same trip', () => {
    const old = trip('a', '2026-10-01T10:00:00Z', 'Old');
    const newer = trip('a', '2026-10-02T10:00:00Z', 'New');
    expect(mergeTrips([old], [], [row(newer)]).trips[0]?.name).toBe('New');
    const out = mergeTrips([newer], [], [row(old)]);
    expect(out.trips[0]?.name).toBe('New');
    expect(out.push).toHaveLength(1);
  });
  it('spreads a deletion to other devices, unless the trip was edited after it', () => {
    const t = trip('a', '2026-10-01T10:00:00Z');
    const deletedHere = mergeTrips([], [{ id: 'a', deletedAt: '2026-10-02T00:00:00Z' }], [row(t)]);
    expect(deletedHere.trips).toHaveLength(0);
    expect(deletedHere.push[0]).toMatchObject({ id: 'a', deleted: true });
    const deletedThere = mergeTrips([t], [], [{ ...row(t), updated_at: '2026-10-03T00:00:00Z', deleted: true }]);
    expect(deletedThere.trips).toHaveLength(0);
    const editedLater = mergeTrips([trip('a', '2026-10-04T00:00:00Z')], [], [{ ...row(t), updated_at: '2026-10-03T00:00:00Z', deleted: true }]);
    expect(editedLater.trips).toHaveLength(1);
  });
  it('never uploads the example trip', () => {
    expect(mergeTrips([trip('example-addis', '2026-10-01T10:00:00Z')], [], []).push).toHaveLength(0);
  });
  it('pushes nothing when both sides match', () => {
    const t = trip('a', '2026-10-01T10:00:00Z');
    expect(mergeTrips([t], [], [row(t)]).push).toHaveLength(0);
  });
});
