import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Trip } from '../types';
import { supabase } from '../services/supabase';
import { mergeTrips, type RemoteTrip, type Tombstone } from '../services/sync';
import type { TripDispatch } from './useTrips';

export type SyncState =
  | { status: 'off' }
  | { status: 'signed-out' }
  | { status: 'syncing'; email: string }
  | { status: 'synced'; email: string; at: Date }
  | { status: 'error'; email: string; message: string };

const signature = (trips: Trip[], tombstones: Tombstone[]) =>
  JSON.stringify([trips.map((t) => [t.id, t.updatedAt]), tombstones.map((d) => [d.id, d.deletedAt])]);

export function explain(message: string): string {
  if (/relation .*trips.* does not exist|Could not find the table/i.test(message)) {
    return 'The trips table is missing. Run supabase/migrations/0001_trips.sql in the Supabase SQL editor.';
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return 'Can\'t reach the sync server. Your trips are safe on this device and sync when the connection is back.';
  return message;
}

/** Keeps this device's trips in step with the signed-in account. The device copy always works on its own. */
export function useSync(trips: Trip[], tombstones: Tombstone[], dispatch: TripDispatch) {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<SyncState>(supabase ? { status: 'signed-out' } : { status: 'off' });
  const latest = useRef({ trips, tombstones });
  latest.current = { trips, tombstones };
  const running = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const email = session?.user.email ?? 'your account';

  const syncNow = useCallback(async () => {
    if (!supabase || !session) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setState({ status: 'syncing', email });
    try {
      const { data, error } = await supabase.from('trips').select('id, data, updated_at, deleted');
      if (error) throw new Error(error.message);
      const { trips: local, tombstones: dead } = latest.current;
      const merged = mergeTrips(local, dead, (data ?? []) as RemoteTrip[]);
      if (signature(merged.trips, merged.tombstones) !== signature(local, dead)) {
        dispatch({ type: 'merge', trips: merged.trips, tombstones: merged.tombstones });
      }
      if (merged.push.length) {
        const { error: pushError } = await supabase.from('trips').upsert(merged.push, { onConflict: 'user_id,id' });
        if (pushError) throw new Error(pushError.message);
      }
      setState({ status: 'synced', email, at: new Date() });
    } catch (e) {
      setState({ status: 'error', email, message: explain(e instanceof Error ? e.message : String(e)) });
    } finally {
      running.current = false;
      // A change that arrived mid-sync goes up in a second pass.
      if (again.current) {
        again.current = false;
        setTimeout(() => void syncNow(), 0);
      }
    }
  }, [session, email, dispatch]);

  // Sync on sign-in, when the app comes back into view, and shortly after each change.
  useEffect(() => {
    if (!session) {
      if (supabase) setState({ status: 'signed-out' });
      return;
    }
    void syncNow();
    const onFocus = () => void syncNow();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [session, syncNow]);

  const changes = signature(trips, tombstones);
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => void syncNow(), 2000);
    return () => clearTimeout(t);
  }, [changes, session, syncNow]);

  return { state, syncNow };
}
