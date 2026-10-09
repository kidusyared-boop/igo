import { useState } from 'react';
import type { Spot, Trip, TripPlan } from '../../types';
import { findCity } from '../../data/countries';
import { formatDay } from '../../utils/dates';
import { newId } from '../../utils/id';
import { routeCities } from '../planner/route';
import { interestLabel, placeKey } from '../planner/personalize';
import { LIGHTS, SpotForm } from './SpotForm';

interface SpotsViewProps {
  trip: Trip;
  plan: TripPlan;
  onSave: (spot: Spot) => void;
  onRemove: (spotId: string) => void;
  onDismiss: (key: string) => void;
  onRestore: () => void;
}

const lightLabel = (light: Spot['light']) => LIGHTS.find((l) => l.value === light)?.label ?? light;

export function SpotsView({ trip, plan, onSave, onRemove, onDismiss, onRestore }: SpotsViewProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const placed = new Map<string, string>();
  for (const day of plan.days) {
    for (const t of day.tasks) {
      const match = /^auto:[\d-]+:spot-(.+)$/.exec(t.id);
      if (match?.[1]) placed.set(match[1], day.date);
    }
  }
  const unscheduled = new Set(plan.unscheduledSpots.map((s) => s.id));
  const cityIds = [...new Set(routeCities(trip).map((l) => l.cityId))];
  const cities = cityIds.map((id) => findCity(trip.countryCode, id)).filter((c) => c !== undefined);
  const cityName = (id?: string) => findCity(trip.countryCode, id ?? trip.cityId)?.name ?? '';
  const shown = new Set([...trip.spots, ...plan.pickedSpots.map((p) => p.spot)].map((s) => s.name.toLowerCase()));
  const dismissed = new Set(trip.dismissedPlaces);

  return (
    <div className="section">
      <h2>Places</h2>

      <div className="stack-sm">
        <span className="eyebrow">Picked for you</span>
        {plan.pickedSpots.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>Nothing matches your interests yet. Edit the trip and choose a few more.</p>
        )}
        {plan.pickedSpots.map(({ spot, date }) => (
          <div key={spot.id} className="spot">
            <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
              <strong>{spot.name}</strong>
              <span className="meta">{cityName(spot.cityId)} · {lightLabel(spot.light)} · {formatDay(date)}</span>
              {spot.pickedFor && spot.pickedFor.length > 0 && <span className="why">Because you like {spot.pickedFor.map(interestLabel).join(', ')}</span>}
              <span className="meta">{spot.checked ? `Checked by a local on ${formatDay(spot.checked)}` : 'Not yet checked by a local'}</span>
            </div>
            <div className="row" style={{ alignItems: 'start' }}>
              <button type="button" className="btn small" onClick={() => onDismiss(placeKey(spot.cityId ?? trip.cityId, spot.name))}>Not for me</button>
            </div>
          </div>
        ))}
        {dismissed.size > 0 && (
          <div><button type="button" className="btn small ghost" onClick={onRestore}>Bring back {dismissed.size} removed {dismissed.size === 1 ? 'place' : 'places'}</button></div>
        )}
      </div>

      <div className="stack-sm">
        <span className="eyebrow">Your places</span>
        {trip.spots.length === 0 && <p className="muted" style={{ margin: 0 }}>Add a place you already know you want, and igo fits it into the right day.</p>}
        {trip.spots.map((spot) =>
          editing === spot.id ? (
            <SpotForm key={spot.id} days={plan.days} cities={cities} initial={spot} onSave={(s) => { onSave(s); setEditing(null); }} onCancel={() => setEditing(null)} />
          ) : (
            <div key={spot.id} className="spot">
              <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
                <strong>{spot.name}</strong>
                <span className="meta">
                  {cityName(spot.cityId)} · {lightLabel(spot.light)} · {unscheduled.has(spot.id) ? 'Does not fit' : placed.get(spot.id) ? formatDay(placed.get(spot.id) ?? '') : 'Hidden'}
                  {spot.date ? ' (pinned)' : ''}
                </span>
                {spot.shotList && <span className="meta">{spot.shotList}</span>}
              </div>
              <div className="row" style={{ alignItems: 'start' }}>
                <button type="button" className="btn small" onClick={() => setEditing(spot.id)}>Edit</button>
                <button type="button" className="icon-btn" aria-label={`Remove ${spot.name}`} onClick={() => onRemove(spot.id)}>×</button>
              </div>
            </div>
          ),
        )}
        {plan.unscheduledSpots.length > 0 && (
          <p className="notice">{plan.unscheduledSpots.length} of your places don't fit in the time you picked. Change the time of day, pin a day, or add a day to the trip.</p>
        )}
      </div>

      {cities.map((city) => {
        const more = city.suggestedSpots.filter((s) => !shown.has(s.name.toLowerCase()) && !dismissed.has(placeKey(city.id, s.name)));
        if (more.length === 0) return null;
        return (
          <div key={city.id} className="stack-sm">
            <span className="eyebrow">More in {city.name}</span>
            <div className="suggest">
              {more.map((s) => (
                <button key={s.name} type="button" className="chip" title={s.note} onClick={() => onSave({ id: newId('spot'), cityId: city.id, name: s.name, light: s.light, shotList: s.note })}>
                  + {s.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <SpotForm days={plan.days} cities={cities} onSave={onSave} />
    </div>
  );
}
