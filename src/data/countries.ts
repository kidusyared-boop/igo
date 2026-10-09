import type { CountryPack } from '../types';
import { ETHIOPIA } from './ethiopia/ethiopia';

/**
 * Countries the app offers. igo launches Ethiopia-only; drafted packs for
 * expansion live in laterCountries.ts and are added here once reviewed.
 */
export const COUNTRIES: CountryPack[] = [ETHIOPIA];

export function findCountry(code: string): CountryPack | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function findCity(code: string, cityId: string) {
  return findCountry(code)?.cities.find((c) => c.id === cityId);
}
