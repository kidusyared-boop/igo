import { beforeEach, describe, expect, it, vi } from 'vitest';

const select = vi.fn();
vi.mock('../services/supabase', () => ({ supabase: { from: () => ({ select }) } }));
const { fetchPlaceChecks } = await import('../services/placeChecks');

const store = new Map<string, string>();
vi.stubGlobal('window', {
  localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
});

describe('fetchPlaceChecks offline', () => {
  beforeEach(() => store.clear());

  it('keeps the last checks when the server cannot be reached', async () => {
    select.mockResolvedValueOnce({ data: [{ place_key: 'addis:x', verdict: 'gone', checked_at: '2026-10-01' }], error: null });
    expect((await fetchPlaceChecks()).get('addis:x')?.verdict).toBe('gone');

    select.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect((await fetchPlaceChecks()).get('addis:x')?.verdict).toBe('gone');

    select.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } });
    expect((await fetchPlaceChecks()).get('addis:x')?.verdict).toBe('gone');
  });
});
