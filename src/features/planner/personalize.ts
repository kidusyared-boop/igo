import type { City, DayPlan, Interest, Pace, Spot, SuggestedSpot, Trip } from '../../types';

export type Preferences = Pick<Trip, 'interests' | 'budget' | 'diets' | 'mobility' | 'withKids'>;
import type { DaySkeleton } from './assignSpots';

export const INTERESTS: { value: Interest; label: string }[] = [
  { value: 'city', label: 'City life' },
  { value: 'countryside', label: 'Countryside' },
  { value: 'food', label: 'Restaurants and food' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'history', label: 'Historic sites' },
  { value: 'religion', label: 'Churches and monasteries' },
  { value: 'culture', label: 'Local culture' },
  { value: 'markets', label: 'Markets and shopping' },
  { value: 'nightlife', label: 'Music and nightlife' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'adventure', label: 'Adventure' },
];

export const PACES: { value: Pace; label: string; hint: string }[] = [
  { value: 'relaxed', label: 'Relaxed', hint: 'About 2 things a day' },
  { value: 'balanced', label: 'Balanced', hint: 'About 3 things a day' },
  { value: 'packed', label: 'Packed', hint: 'About 4 things a day' },
];

const PER_DAY: Record<Pace, number> = { relaxed: 2, balanced: 3, packed: 4 };

export function interestLabel(i: Interest): string {
  return INTERESTS.find((x) => x.value === i)?.label.toLowerCase() ?? i;
}

/** How many places a day can hold. Travel days get half, and children slow every day by one. */
export function dayCapacity(day: Pick<DayPlan, 'kind' | 'movedFrom'>, pace: Pace, withKids = false): number {
  const full = Math.max(1, PER_DAY[pace] - (withKids ? 1 : 0));
  return day.kind === 'full' && !day.movedFrom ? full : Math.max(1, Math.floor(full / 2));
}

/**
 * Whether a place suits the traveler's budget, body, children and diet.
 * Missing data counts as suitable, except halal, which a meal must state.
 */
export function placeFits(place: SuggestedSpot, prefs: Omit<Preferences, 'interests'>): boolean {
  if (prefs.mobility === 'limited' && place.effort === 'hard') return false;
  if (prefs.withKids && place.kids === false) return false;
  if (prefs.budget === 'low' && place.cost === 3) return false;
  if (place.light === 'lunch' || place.light === 'dinner') {
    for (const diet of prefs.diets) {
      if (diet === 'fasting') continue;
      if (diet === 'halal' ? !place.diets?.includes('halal') : place.diets && !place.diets.includes(diet)) return false;
    }
  }
  return true;
}

export function placeKey(cityId: string, name: string): string {
  return `${cityId}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

/**
 * Score a place for a traveler. Returns null when it should never be picked:
 * meals only for people who chose food, and countryside trips are left out
 * for people who only want the city.
 */
export function scorePlace(place: SuggestedSpot, prefs: Preferences): { score: number; matched: Interest[] } | null {
  if (!placeFits(place, prefs)) return null;
  const { interests } = prefs;
  const tags = place.tags ?? [];
  const isMeal = place.light === 'lunch' || place.light === 'dinner';
  if (isMeal && !interests.includes('food')) return null;
  const wantsCity = interests.includes('city');
  const wantsCountry = interests.includes('countryside');
  const countryOnly = tags.includes('countryside') && !tags.includes('city');
  const cityOnly = tags.includes('city') && !tags.includes('countryside');
  if (wantsCity && !wantsCountry && countryOnly) return null;
  if (interests.length === 0) return { score: 1, matched: [] };
  const matched = tags.filter((t) => interests.includes(t));
  let score = matched.length;
  if (wantsCountry && !wantsCity && cityOnly) score -= 0.5;
  // Small nudges only: interests decide, budget breaks ties.
  if (prefs.budget === 'low' && place.cost === 1) score += 0.25;
  if (prefs.budget === 'high' && place.cost === 3) score += 0.25;
  return score > 0 ? { score, matched } : null;
}

/** Places igo adds to fill each city's days, best match first. */
export function pickPlaces(trip: Trip, days: DaySkeleton[], cityOf: (id: string) => City, closed: ReadonlySet<string> = new Set()): Spot[] {
  const picked: Spot[] = [];
  const dismissed = new Set([...trip.dismissedPlaces, ...closed]);
  const userNames = new Set(trip.spots.map((s) => s.name.toLowerCase()));
  const cityIds = [...new Set(days.map((d) => d.cityId))];

  for (const cityId of cityIds) {
    const city = cityOf(cityId);
    const capacity = days.filter((d) => d.cityId === cityId).reduce((n, d) => n + dayCapacity(d, trip.pace, trip.withKids), 0);
    const own = trip.spots.filter((s) => (s.cityId ?? trip.cityId) === cityId && !isMealSpot(s)).length;
    const ranked = city.suggestedSpots
      .map((place, index) => ({ place, index, fit: scorePlace(place, trip) }))
      .filter((r) => r.fit && !dismissed.has(placeKey(cityId, r.place.name)) && !userNames.has(r.place.name.toLowerCase()))
      .sort((a, b) => (b.fit?.score ?? 0) - (a.fit?.score ?? 0) || a.index - b.index);
    // Meals sit outside the pace limit: someone who loves food still eats on a relaxed day.
    const isMeal = (r: (typeof ranked)[number]) => r.place.light === 'lunch' || r.place.light === 'dinner';
    const chosen = [...ranked.filter(isMeal), ...ranked.filter((r) => !isMeal(r)).slice(0, Math.max(0, capacity - own))];
    for (const r of chosen) {
      picked.push({
        id: `place:${placeKey(cityId, r.place.name)}`,
        name: r.place.name,
        light: r.place.light,
        shotList: r.place.note,
        cityId,
        pickedFor: r.fit?.matched ?? [],
        effort: r.place.effort,
        checked: r.place.checked,
      });
    }
  }
  return picked;
}

export function isMealSpot(spot: Pick<Spot, 'light'>): boolean {
  return spot.light === 'lunch' || spot.light === 'dinner';
}
