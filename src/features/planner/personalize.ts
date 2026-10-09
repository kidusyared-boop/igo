import type { City, DayPlan, Interest, Pace, Spot, SuggestedSpot, Trip } from '../../types';
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

/** How many places a day can hold. Travel days get half. */
export function dayCapacity(day: Pick<DayPlan, 'kind' | 'movedFrom'>, pace: Pace): number {
  const full = PER_DAY[pace];
  return day.kind === 'full' && !day.movedFrom ? full : Math.max(1, Math.floor(full / 2));
}

export function placeKey(cityId: string, name: string): string {
  return `${cityId}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

/**
 * Score a place for a traveler. Returns null when it should never be picked:
 * meals only for people who chose food, and countryside trips are left out
 * for people who only want the city.
 */
export function scorePlace(place: SuggestedSpot, interests: Interest[]): { score: number; matched: Interest[] } | null {
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
  return score > 0 ? { score, matched } : null;
}

/** Places igo adds to fill each city's days, best match first. */
export function pickPlaces(trip: Trip, days: DaySkeleton[], cityOf: (id: string) => City): Spot[] {
  const picked: Spot[] = [];
  const dismissed = new Set(trip.dismissedPlaces);
  const userNames = new Set(trip.spots.map((s) => s.name.toLowerCase()));
  const cityIds = [...new Set(days.map((d) => d.cityId))];

  for (const cityId of cityIds) {
    const city = cityOf(cityId);
    const capacity = days.filter((d) => d.cityId === cityId).reduce((n, d) => n + dayCapacity(d, trip.pace), 0);
    const own = trip.spots.filter((s) => (s.cityId ?? trip.cityId) === cityId && !isMealSpot(s)).length;
    const ranked = city.suggestedSpots
      .map((place, index) => ({ place, index, fit: scorePlace(place, trip.interests) }))
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
      });
    }
  }
  return picked;
}

export function isMealSpot(spot: Pick<Spot, 'light'>): boolean {
  return spot.light === 'lunch' || spot.light === 'dinner';
}
