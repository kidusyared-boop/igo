import { supabase } from './supabase';

export type Verdict = 'ok' | 'fix' | 'gone';

export interface PlaceCheck {
  verdict: Verdict;
  checkedAt: string;
}

/** Latest local verdict per place key. Empty when Supabase is off or unreachable. */
export async function fetchPlaceChecks(): Promise<Map<string, PlaceCheck>> {
  if (!supabase) return new Map();
  const { data, error } = await supabase.from('place_checks').select('place_key, verdict, checked_at');
  if (error || !data) return new Map();
  return new Map(
    (data as { place_key: string; verdict: Verdict; checked_at: string }[]).map((r) => [r.place_key, { verdict: r.verdict, checkedAt: r.checked_at }]),
  );
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
