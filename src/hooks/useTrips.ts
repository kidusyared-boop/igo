import { useEffect, useReducer, useState } from 'react';
import type { Spot, Task, Trip } from '../types';
import { loadTombstones, loadTrips, saveTombstones, saveTrips } from '../services/storage';
import type { Tombstone } from '../services/sync';
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
  | { type: 'restorePlaces'; tripId: string }
  | { type: 'merge'; trips: Trip[]; tombstones: Tombstone[] };

interface State {
  trips: Trip[];
  tombstones: Tombstone[];
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function updateTrip(trips: Trip[], id: string, fn: (t: Trip) => Trip): Trip[] {
  return trips.map((t) => (t.id === id ? fn(t) : t));
}

function edit(trips: Trip[], action: Exclude<Action, { type: 'merge' }>): Trip[] {
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

/** Every edit stamps the trip's updatedAt so synced copies can be merged; deletions leave a tombstone. */
function reducer(state: State, action: Action): State {
  if (action.type === 'merge') return { trips: action.trips, tombstones: action.tombstones };
  const now = new Date().toISOString();
  if (action.type === 'remove') {
    return {
      trips: edit(state.trips, action),
      tombstones: [...state.tombstones.filter((d) => d.id !== action.tripId), { id: action.tripId, deletedAt: now }],
    };
  }
  const id = action.type === 'upsert' ? action.trip.id : action.tripId;
  const trips = edit(state.trips, action).map((t) => (t.id === id ? { ...t, updatedAt: now } : t));
  return { trips, tombstones: state.tombstones.filter((d) => d.id !== id) };
}

export type TripDispatch = (action: Action) => void;

export function useTrips(): { trips: Trip[]; tombstones: Tombstone[]; dispatch: TripDispatch; saved: boolean } {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ trips: loadTrips() ?? [sampleTrip()], tombstones: loadTombstones() }));
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    setSaved(saveTrips(state.trips));
  }, [state.trips]);
  useEffect(() => {
    saveTombstones(state.tombstones);
  }, [state.tombstones]);
  return { trips: state.trips, tombstones: state.tombstones, dispatch, saved };
}
