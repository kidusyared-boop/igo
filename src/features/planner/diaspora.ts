import type { EntryDoc, Trip } from '../../types';
import type { PrepDraft } from './preferences';

export const ENTRY_DOCS: { value: EntryDoc; label: string; hint: string }[] = [
  { value: 'origin-id', label: 'Origin ID', hint: 'Ethiopian Origin ID (Yellow Card) with a foreign passport. No visa needed.' },
  { value: 'ethiopian-passport', label: 'Ethiopian passport', hint: 'Enter as an Ethiopian citizen. No visa needed.' },
  { value: 'visa', label: 'Visa', hint: 'Foreign passport without an Origin ID: you need an e-Visa like any visitor.' },
];

/** Whether the visitor e-Visa tasks apply to this trip. */
export function needsVisa(trip: Trip): boolean {
  return !trip.diaspora || trip.entryDoc === 'visa';
}

/** Pre-trip tasks for Ethiopians and people of Ethiopian origin visiting home. */
export function diasporaPrep(trip: Trip): PrepDraft[] {
  if (!trip.diaspora) return [];
  const drafts: PrepDraft[] = [];
  if (trip.entryDoc === 'origin-id') {
    drafts.push({
      daysBefore: 45,
      key: 'dia-origin-id',
      title: 'Check your Ethiopian Origin ID (Yellow Card) is valid for the whole trip',
      detail: 'Holders enter without a visa. Carry it with the foreign passport you fly on, and renew through the Immigration and Citizenship Service well before you travel if it is close to expiry.',
    });
  } else if (trip.entryDoc === 'ethiopian-passport') {
    drafts.push({
      daysBefore: 45,
      key: 'dia-passport',
      title: 'Check your Ethiopian passport is valid for at least 6 months',
      detail: 'Renewing inside Ethiopia can take weeks. If you also hold another passport, fly in and out on the same one.',
    });
  } else {
    drafts.push({
      daysBefore: 60,
      key: 'dia-get-origin-id',
      title: 'Think about an Ethiopian Origin ID if you visit often',
      detail: 'People of Ethiopian origin with another nationality can apply through the Immigration and Citizenship Service. It replaces a visa on every visit and lets you open local accounts and own property.',
    });
  }
  drafts.push(
    {
      daysBefore: 21,
      key: 'dia-money',
      title: 'Decide how you will move money home',
      detail: 'Banks and licensed remittance services pay the market rate since the birr floated in 2024, so informal channels no longer pay much more and carry real risk. Ethiopian banks offer diaspora foreign-currency accounts; ask your bank which documents it needs before you fly.',
    },
    {
      daysBefore: 14,
      key: 'dia-customs',
      title: 'Read the customs allowances before you pack gifts',
      detail: 'Personal effects are duty-free, but several new phones or laptops, many of one item, or anything that looks like it is for resale can be taxed at Bole. Declare foreign cash above the National Bank of Ethiopia limit when you land and keep the form: you may need it to take money out again.',
    },
    {
      daysBefore: 10,
      key: 'dia-bags',
      title: 'Weigh your bags with the gifts in them',
      detail: 'Allowances depend on your fare and route. Overweight fees at the airport cost far more than buying an extra bag in advance.',
    },
    {
      daysBefore: 7,
      key: 'dia-sim',
      title: 'Check whether your old Ethio Telecom number still works',
      detail: 'Numbers left unused for a long time can be cancelled. Bring the ID it is registered to; otherwise buy a new SIM at Bole.',
    },
  );
  if (trip.familyTime) {
    drafts.push({
      daysBefore: 14,
      key: 'dia-family-plan',
      title: 'Share your dates with family and agree who you will see when',
      detail: 'igo keeps your afternoons on full days free for family. Ask relatives outside Addis Ababa early: travel there takes a day each way.',
    });
  }
  return drafts;
}
