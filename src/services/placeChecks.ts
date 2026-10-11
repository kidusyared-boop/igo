import { supabase } from './supabase';

export type Verdict = 'ok' | 'fix' | 'gone';

export interface PlaceCheck {
  verdict: Verdict;
  checkedAt: string;
}

const CACHE_KEY = 'igo.placeChecks.v1';

/** The last checks fetched on this device, so closed places stay out of plans with no internet. */
export function loadCachedChecks(): Map<string, PlaceCheck> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? '[]');
    return new Map(Array.isArray(parsed) ? (parsed as [string, PlaceCheck][]) : []);
  } catch {
    return new Map();
  }
}

function cacheChecks(checks: Map<string, PlaceCheck>): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify([...checks]));
  } catch {
    // The next fetch fills it again.
  }
}

/** Latest local verdict per place key. Falls back to this device's last copy when the server is unreachable. */
export async function fetchPlaceChecks(): Promise<Map<string, PlaceCheck>> {
  if (!supabase) return new Map();
  try {
    const { data, error } = await supabase.from('place_checks').select('place_key, verdict, checked_at');
    if (error || !data) return loadCachedChecks();
    const checks = new Map(
      (data as { place_key: string; verdict: Verdict; checked_at: string }[]).map((r) => [r.place_key, { verdict: r.verdict, checkedAt: r.checked_at }]),
    );
    cacheChecks(checks);
    return checks;
  } catch {
    return loadCachedChecks();
  }
}

/** Whether the signed-in person is on the reviewers list. */
export async function isReviewer(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from('reviewers').select('email').limit(1);
  return !error && (data?.length ?? 0) > 0;
}

export async function submitCheck(placeKey: string, verdict: Verdict, note: string): Promise<string | null> {
  if (!supabase) return 'Sync is off in this build.';
  const { error } = await supabase.from('place_reviews').insert({ place_key: placeKey, verdict, note: note.trim() || null });
  return error ? error.message : null;
}

/** Keys of places a local reported as closed or no longer there. */
export function closedPlaces(checks: Map<string, PlaceCheck>): Set<string> {
  return new Set([...checks].filter(([, c]) => c.verdict === 'gone').map(([key]) => key));
}
