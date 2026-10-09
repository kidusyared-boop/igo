import type { Trip } from '../types';

/** A trip as stored in Supabase. Deleted trips stay as tombstones so other devices learn about them. */
export interface RemoteTrip {
  id: string;
  data: Trip;
  updated_at: string;
  deleted: boolean;
}

export interface Tombstone {
  id: string;
  deletedAt: string;
}

/** Example trips live on each device and are never synced. */
export function syncable(trip: Pick<Trip, 'id'>): boolean {
  return !trip.id.startsWith('example');
}

const time = (iso: string | undefined) => (iso ? Date.parse(iso) : 0);

/**
 * Newest change wins per trip, comparing edits and deletions alike.
 * Returns the merged local state and the rows the server is missing or has older.
 */
export function mergeTrips(
  local: Trip[],
  tombstones: Tombstone[],
  remote: RemoteTrip[],
): { trips: Trip[]; tombstones: Tombstone[]; push: RemoteTrip[] } {
  const byId = new Map<string, { trip?: Trip; at: number; deleted: boolean }>();
  const localIds = new Set<string>();
  for (const t of local) {
    byId.set(t.id, { trip: t, at: time(t.updatedAt), deleted: false });
    localIds.add(t.id);
  }
  for (const d of tombstones) {
    const cur = byId.get(d.id);
    if (!cur || time(d.deletedAt) >= cur.at) byId.set(d.id, { trip: cur?.trip, at: time(d.deletedAt), deleted: true });
  }
  const localState = new Map(byId);

  const remoteById = new Map(remote.map((r) => [r.id, r]));
  for (const r of remote) {
    const cur = byId.get(r.id);
    const at = time(r.updated_at);
    if (!cur || at > cur.at) byId.set(r.id, { trip: r.data, at, deleted: r.deleted });
  }

  const trips: Trip[] = [];
  const nextTombstones: Tombstone[] = [];
  const push: RemoteTrip[] = [];
  for (const [id, entry] of byId) {
    if (entry.deleted) nextTombstones.push({ id, deletedAt: new Date(entry.at).toISOString() });
    else if (entry.trip) trips.push(entry.trip);
    const mine = localState.get(id);
    const server = remoteById.get(id);
    if (mine && (mine.trip || mine.deleted) && (!server || mine.at > time(server.updated_at)) && syncable({ id })) {
      const data = mine.trip ?? server?.data ?? ({ id } as Trip);
      push.push({ id, data, updated_at: new Date(mine.at || Date.now()).toISOString(), deleted: mine.deleted });
    }
  }
  // Keep the local order for trips that were already here, new ones from other devices go first.
  trips.sort((a, b) => Number(localIds.has(a.id)) - Number(localIds.has(b.id)) || local.indexOf(a) - local.indexOf(b));
  return { trips, tombstones: nextTombstones, push };
}
