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
  /** Door-to-door hours from the country's main hub, airport waits included. */
  hubHours?: number;
  /** Cities reached directly by road, without going back through the hub. */
  roads?: { cityId: string; hours: number }[];
  lat: number;
  lon: number;
  timeZone: string;
  suggestedSpots: SuggestedSpot[];
  /** Rains or heat that change what a visit can do, by month. */
  seasons?: Season[];
}

/** A stretch of the year when weather changes plans in a city. */
export interface Season {
  key: string;
  kind: 'rain' | 'heat';
  /** Months it covers, 1 for January to 12 for December. */
  months: number[];
  /** Short name, such as "the main rains". */
  name: string;
  /** What it means on the ground, shown on every day spent there. */
  note: string;
  /** Advice before booking, shown in the before-you-go list. */
  prep: string;
  /** Afternoons bring rain or heat, so igo plans outdoor places in the morning. */
  mornings?: boolean;
  /** Dirt roads turn impassable, so igo leaves out the whole-day trips it would pick. */
  roughRoads?: boolean;
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
  /** Far enough out of town to take the whole day. */
  allDay?: boolean;
  /** Days it happens, 0 Sunday to 6 Saturday, for markets held on fixed days. */
  weekdays?: number[];
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
  /** Festivals worth planning a route around, for dates from `from` to `to`. */
  festivals?: (from: string, to: string) => Festival[];
}

/** One part of a festival in one city, such as the eve procession. */
export interface FestivalEvent {
  key: string;
  cityId: string;
  date: string;
  start: string;
  end: string;
  title: string;
  detail: string;
  /** A catalogue place the event already covers, so it is not planned again. */
  place?: string;
}

export interface Festival {
  key: string;
  name: string;
  /** The main day. */
  date: string;
  /** Cities with the celebrations worth travelling for, best first. */
  cityIds: string[];
  events: FestivalEvent[];
  /** When the celebrations happen, for prep advice. Defaults to the afternoon before until the next morning. */
  when?: string;
  /** Advice once the route catches it. Defaults to booking rooms early. */
  book?: { title: string; detail: string };
}

export interface DayNote {
  kind: 'holiday' | 'fasting' | 'safety' | 'move' | 'season' | 'event';
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
  allDay?: boolean;
  weekdays?: number[];
  /** For meals: diets the place reliably serves. */
  diets?: Diet[];
  /** On places igo picked: outdoors (countryside, hikes, wildlife), so weather decides when to go. */
  outdoor?: boolean;
}

export type BookingKind = 'stay' | 'flight' | 'transport' | 'guide' | 'other';

/** Something the traveler booked, kept in the trip so it is there offline. */
export interface Booking {
  id: string;
  kind: BookingKind;
  /** Hotel, airline and flight number, bus company or guide's name. */
  name: string;
  cityId?: string;
  /** Check-in day for a stay, travel day for a flight or ride. */
  date?: string;
  /** Check-out day for a stay. */
  endDate?: string;
  time?: string;
  /** Arrival time for a flight. */
  arriveTime?: string;
  /** Where a flight or ride leaves from and goes to. */
  from?: string;
  to?: string;
  /** Confirmation or booking code. */
  ref?: string;
  phone?: string;
  address?: string;
  notes?: string;
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
  /** Stays, flights, rides and guides the traveler booked. Missing on trips saved before bookings existed. */
  bookings?: Booking[];
  customTasks: Task[];
  doneIds: string[];
  hiddenIds: string[];
  createdAt: string;
  /** Last change on any device, used to merge synced copies. */
  updatedAt?: string;
}

export interface Task {
  id: string;
  /** ISO date this task belongs to, or a pre-trip date. */
  date: string;
  time?: string;
  title: string;
  detail?: string;
  category: TaskCategory;
  /** Maps search for the place this task goes to, shown as a Directions link. */
  map?: string;
  source: 'auto' | 'user';
  /** On the traveler's edited copy of an igo task: the id of the igo task it stands in for. */
  replaces?: string;
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
