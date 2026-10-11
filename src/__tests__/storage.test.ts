import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadTrips, saveTrips } from '../services/storage';

describe('saved trips', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps an empty list, so a deleted example trip stays deleted', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) } });
    expect(loadTrips()).toBeNull();
    saveTrips([]);
    expect(loadTrips()).toEqual([]);
  });
});
