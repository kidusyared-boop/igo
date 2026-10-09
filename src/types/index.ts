export type TravelMode = 'creator' | 'traveler';

export type Light = 'sunrise' | 'any' | 'lunch' | 'sunset' | 'dinner' | 'night';

export type Interest =
  | 'city'
  | 'countryside'
  | 'food'
  | 'coffee'
  | 'history'
  | 'religion'
  | 'culture'
  | 'markets'
  | 'nightlife'
  | 'hiking'
  | 'wildlife'
  | 'adventure';

export type Pace = 'relaxed' | 'balanced' | 'packed';

export type Budget = 'low' | 'mid' | 'high';

export type Diet = 'vegetarian' | 'vegan' | 'halal' | 'fasting';

export type Mobility = 'full' | 'limited';

/** How a diaspora traveler enters Ethiopia. */
export type EntryDoc = 'visa' | 'origin-id' | 'ethiopian-passport';

export type TaskCategory =
  | 'prep'
  | 'logistics'
  | 'shoot'
  | 'edit'
  | 'post'
  | 'explore'
  | 'food'
  | 'rest';

export interface City {
  id: string;
  name: string;
  region?: string;
  /** How people usually get there from the country's main hub. */
  access?: string;
  /** Region-level safety note shown on every day spent there. */
  safety?: string;
  altitudeM?: number;
  lat: number;
  lon: number;
  timeZone: string;
  suggestedSpots: SuggestedSpot[];
}

export interface SuggestedSpot {
  name: string;
  light: Light;
  note: string;
  /** What kind of traveler this place suits. Used to personalize plans. */
  tags?: Interest[];
  /** 1 free or cheap, 2 moderate, 3 expensive. */
  cost?: 1 | 2 | 3;
  /** Physical effort to get there and see it. */
  effort?: 'easy' | 'moderate' | 'hard';
  /** False where the place is unsuitable for young children. */
  kids?: boolean;
  /** For meals: diets the place reliably serves. */
  diets?: Diet[];
  /** ISO date a local last checked this entry. Absent means not yet checked. */
  checked?: string;
}

export interface CountryPack {
  code: string;
  name: string;
  lastReviewed: string;
  currency: { code: string; cashNote: string };
  plugs: string;
  voltage: string;
  emergency: string;
  connectivity: string;
  rideApps: string;
  entry: { summary: string; officialUrl: string; preArrivalForm?: PreArrivalForm };
  drone: { summary: string; registrationRequired: boolean };
  filming: string;
  tipping: string;
  cities: City[];
  /** Extra country-specific pre-trip tasks. */
  extraPrep?: { daysBefore: number; key: string; title: string; detail?: string; creatorOnly?: boolean }[];
  /** Extra country-specific arrival-day tasks, placed after check-in. */
  arrivalTasks?: { key: string; title: string; detail?: string }[];
  /** Local clock and calendar shown next to standard times. */
  localClock?: (hhmm: string) => string;
  localDate?: (iso: string) => string;
  dayNotes?: (iso: string) => DayNote[];
}

export interface DayNote {
  kind: 'holiday' | 'fasting' | 'safety' | 'move';
  text: string;
}

/** A move to another city on the route, starting on `date`. */
export interface Stop {
  id: string;
  cityId: string;
  date: string;
}

export interface PreArrivalForm {
  name: string;
  daysBefore: number;
  url: string;
}

export interface Spot {
  id: string;
  name: string;
  light: Light;
  shotList: string;
  /** City the spot is in; days in other cities never get it. */
  cityId?: string;
  /** ISO date the user pinned the spot to, or undefined to let the planner choose. */
  date?: string;
  /** Set on places igo picked from the traveler's interests. */
  pickedFor?: Interest[];
  /** Copied from the catalogue for places igo picked. */
  effort?: SuggestedSpot['effort'];
  checked?: string;
}

export interface Trip {
  id: string;
  name: string;
  countryCode: string;
  /** First city on the route. */
  cityId: string;
  stops: Stop[];
  startDate: string;
  endDate: string;
  arrivalTime: string;
  departureTime: string;
  mode: TravelMode;
  audienceTimeZone: string;
  flyingDrone: boolean;
  interests: Interest[];
  pace: Pace;
  budget: Budget;
  diets: Diet[];
  mobility: Mobility;
  withKids: boolean;
  /** Ethiopian or of Ethiopian origin, visiting home. */
  diaspora: boolean;
  entryDoc: EntryDoc;
  /** Keep afternoons free for family on full days. */
  familyTime: boolean;
  /** Suggested places the traveler said no to. */
  dismissedPlaces: string[];
  spots: Spot[];
  customTasks: Task[];
  doneIds: string[];
  hiddenIds: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  /** ISO date this task belongs to, or a pre-trip date. */
  date: string;
  time?: string;
  title: string;
  detail?: string;
  category: TaskCategory;
  source: 'auto' | 'user';
}

export interface DayPlan {
  date: string;
  cityId: string;
  /** Set when this day moves from another city. */
  movedFrom?: string;
  notes: DayNote[];
  label: string;
  kind: 'arrival' | 'full' | 'departure' | 'single';
  sun: SunTimes | null;
  tasks: Task[];
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

export interface TripPlan {
  preTrip: Task[];
  days: DayPlan[];
  unscheduledSpots: Spot[];
  /** Places igo picked from the traveler's interests, with the day each landed on. */
  pickedSpots: { spot: Spot; date: string }[];
}
