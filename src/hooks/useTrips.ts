import { useEffect, useReducer, useState } from 'react';
import type { Spot, Task, Trip } from '../types';
import { loadTrips, saveTrips } from '../services/storage';
import { sampleTrip } from '../data/sampleTrip';

type Action =
  | { type: 'upsert'; trip: Trip }
  | { type: 'remove'; tripId: string }
  | { type: 'toggleDone'; tripId: string; taskId: string }
  | { type: 'hide'; tripId: string; taskId: string }
  | { type: 'restoreHidden'; tripId: string }
  | { type: 'addTask'; tripId: string; task: Task }
  | { type: 'removeTask'; tripId: string; taskId: string }
  | { type: 'upsertSpot'; tripId: string; spot: Spot }
  | { type: 'removeSpot'; tripId: string; spotId: string }
  | { type: 'dismissPlace'; tripId: string; key: string }
  | { type: 'restorePlaces'; tripId: string };

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function updateTrip(trips: Trip[], id: string, fn: (t: Trip) => Trip): Trip[] {
  return trips.map((t) => (t.id === id ? fn(t) : t));
}

function reducer(trips: Trip[], action: Action): Trip[] {
  switch (action.type) {
    case 'upsert':
      return trips.some((t) => t.id === action.trip.id)
        ? updateTrip(trips, action.trip.id, () => action.trip)
        : [action.trip, ...trips];
    case 'remove':
      return trips.filter((t) => t.id !== action.tripId);
    case 'toggleDone':
      return updateTrip(trips, action.tripId, (t) => ({ ...t, doneIds: toggle(t.doneIds, action.taskId) }));
    case 'hide':
      return updateTrip(trips, action.tripId, (t) => ({ ...t, hiddenIds: [...t.hiddenIds, action.taskId] }));
    case 'restoreHidden':
      return updateTrip(trips, action.tripId, (t) => ({ ...t, hiddenIds: [] }));
    case 'addTask':
      return updateTrip(trips, action.tripId, (t) => ({ ...t, customTasks: [...t.customTasks, action.task] }));
    case 'removeTask':
      return updateTrip(trips, action.tripId, (t) => ({ ...t, customTasks: t.customTasks.filter((x) => x.id !== action.taskId) }));
    case 'upsertSpot':
      return updateTrip(trips, action.tripId, (t) => ({
        ...t,
        spots: t.spots.some((s) => s.id === action.spot.id)
          ? t.spots.map((s) => (s.id === action.spot.id ? action.spot : s))
          : [...t.spots, action.spot],
      }));
    case 'dismissPlace':
      return updateTrip(trips, action.tripId, (t) => ({ ...t, dismissedPlaces: [...t.dismissedPlaces, action.key] }));
    case 'restorePlaces':
      return updateTrip(trips, action.tripId, (t) => ({ ...t, dismissedPlaces: [] }));
    case 'removeSpot':
      return updateTrip(trips, action.tripId, (t) => ({ ...t, spots: t.spots.filter((s) => s.id !== action.spotId) }));
  }
}

export type TripDispatch = (action: Action) => void;

export function useTrips(): { trips: Trip[]; dispatch: TripDispatch; saved: boolean } {
  const [trips, dispatch] = useReducer(reducer, undefined, () => loadTrips() ?? [sampleTrip()]);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    setSaved(saveTrips(trips));
  }, [trips]);
  return { trips, dispatch, saved };
}
