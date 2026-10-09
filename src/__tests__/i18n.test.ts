import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { am } from '../i18n/am';
import { translate, type TKey } from '../i18n';

const keys = Object.keys(en) as TKey[];
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  it('has a non-empty Amharic string for every key', () => {
    const missing = keys.filter((k) => !am[k]?.trim());
    expect(missing).toEqual([]);
    expect(Object.keys(am).sort()).toEqual([...keys].sort());
  });

  it('keeps the same placeholders in Amharic', () => {
    for (const k of keys) expect(placeholders(am[k]), k).toEqual(placeholders(en[k]));
  });

  it('fills placeholders and leaves unknown ones', () => {
    expect(translate('en', 'list.days', { n: 3 })).toBe('3 days');
    expect(translate('am', 'list.days', { n: 3 })).toBe('3 ቀናት');
    expect(translate('en', 'country.notice', { date: '2026-01' })).toContain('{link}');
  });
});
