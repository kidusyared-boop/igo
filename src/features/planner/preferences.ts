import type { Budget, Diet, Trip } from '../../types';

export const BUDGETS: { value: Budget; label: string; hint: string }[] = [
  { value: 'low', label: 'Tight', hint: 'Skips expensive tours and leans on free and cheap places.' },
  { value: 'mid', label: 'Mid-range', hint: 'A mix of free places, entry fees and guides.' },
  { value: 'high', label: 'Comfortable', hint: 'Favors private tours and the best restaurants.' },
];

export const DIETS: { value: Diet; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'fasting', label: 'Orthodox fasting' },
];

export interface PrepDraft {
  daysBefore: number;
  key: string;
  title: string;
  detail?: string;
}

/** Short labels for the trip's "Planned for" line. */
export function preferenceLabels(trip: Trip): string[] {
  const labels = [`${BUDGETS.find((b) => b.value === trip.budget)?.label.toLowerCase() ?? trip.budget} budget`];
  labels.push(...trip.diets.map((d) => DIETS.find((x) => x.value === d)?.label.toLowerCase() ?? d));
  if (trip.mobility === 'limited') labels.push('easy access');
  if (trip.withKids) labels.push('with kids');
  if (trip.diaspora) labels.push(trip.familyTime ? 'visiting family' : 'visiting home');
  return labels;
}

/** Pre-trip tasks that follow from budget, diet, mobility and children. */
export function preferencePrep(trip: Trip): PrepDraft[] {
  const drafts: PrepDraft[] = [];
  if (trip.budget === 'low') {
    drafts.push({
      daysBefore: 21,
      key: 'pref-et-fares',
      title: 'Price domestic flights with your Ethiopian Airlines ticket',
      detail: 'Ethiopian Airlines usually sells domestic flights much cheaper to people who flew into Ethiopia with it. Check the fare with your international booking reference before you buy.',
    });
  }
  if (trip.diets.includes('vegan') || trip.diets.includes('vegetarian')) {
    drafts.push({
      daysBefore: 7,
      key: 'pref-yetsom',
      title: 'Learn one word: "yetsom" (fasting food)',
      detail: 'Yetsom dishes are vegan: shiro, misir wot, gomen, atkilt and yetsom beyaynetu. On Wednesdays, Fridays and through Lent most menus are fully vegan. Butter (kibe) goes into many non-fasting dishes, so ask for yetsom to be sure.',
    });
  }
  if (trip.diets.includes('halal')) {
    drafts.push({
      daysBefore: 7,
      key: 'pref-halal',
      title: 'Plan halal meals',
      detail: 'Butchers and restaurants keep Muslim-slaughtered meat ("ye Islam") apart from Christian ("ye Kiristiyan"). Harar, Dire Dawa and the Afar and Somali regions are mostly Muslim. In the highlands, ask before you order meat, or order yetsom, which has none.',
    });
  }
  if (trip.diets.includes('fasting')) {
    drafts.push({
      daysBefore: 3,
      key: 'pref-fasting',
      title: 'Check which days of your trip are fasting days',
      detail: 'igo marks them on each day. Restaurants serve yetsom on those days; many people eat nothing until the afternoon, so some places open their kitchens later.',
    });
  }
  if (trip.mobility === 'limited') {
    drafts.push({
      daysBefore: 21,
      key: 'pref-access',
      title: 'Ask every hotel for a ground-floor room or a working lift',
      detail: 'Power cuts can stop lifts for hours. Most historic sites have steep stone steps, ladders or uneven ground; tell your guide before the trip so they can plan the easiest way in and add rest stops.',
    });
  }
  if (trip.withKids) {
    drafts.push(
      {
        daysBefore: 30,
        key: 'pref-kids-health',
        title: 'Ask a travel clinic about vaccines and malaria tablets for your children',
        detail: 'Doses depend on age and weight. Pack rehydration salts, sun hats, child-safe insect repellent and familiar snacks. Addis Ababa and the highlands are high enough to tire children quickly.',
      },
      {
        daysBefore: 7,
        key: 'pref-kids-seats',
        title: 'Arrange child seats for transfers',
        detail: 'Taxis and minibuses rarely have them. Bring a travel seat or ask your driver or tour company to supply one.',
      },
    );
  }
  return drafts;
}
