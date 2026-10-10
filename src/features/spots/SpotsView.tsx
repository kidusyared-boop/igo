import { useState } from 'react';
import type { Spot, Trip, TripPlan } from '../../types';
import { findCity } from '../../data/countries';
import { formatDay } from '../../utils/dates';
import { newId } from '../../utils/id';
import { routeCities } from '../planner/route';
import { placeKey } from '../planner/personalize';
import { SpotForm } from './SpotForm';
import { useT } from '../../i18n';
import { usePlaceChecks } from '../../hooks/usePlaceChecks';

interface SpotsViewProps {
  trip: Trip;
  plan: TripPlan;
  onSave: (spot: Spot) => void;
  onRemove: (spotId: string) => void;
  onDismiss: (key: string) => void;
  onRestore: () => void;
}

export function SpotsView({ trip, plan, onSave, onRemove, onDismiss, onRestore }: SpotsViewProps) {
  const t = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const { checks } = usePlaceChecks();
  const placed = new Map<string, string>();
  for (const day of plan.days) {
    for (const task of day.tasks) {
      const match = /^auto:[\d-]+:spot-(.+)$/.exec(task.id);
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
      <h2>{t('spots.title')}</h2>

      <div className="stack-sm">
        <span className="eyebrow">{t('spots.picked')}</span>
        {plan.pickedSpots.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>{t('spots.pickedEmpty')}</p>
        )}
        {plan.pickedSpots.map(({ spot, date }) => (
          <div key={spot.id} className="spot">
            <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
              <strong>{spot.name}</strong>
              <span className="meta">{cityName(spot.cityId)} · {t(`light.${spot.light}`)} · {formatDay(date)}</span>
              {spot.pickedFor && spot.pickedFor.length > 0 && <span className="why">{t('spots.because', { list: spot.pickedFor.map((i) => t(`interest.${i}`).toLowerCase()).join(t('list.sep')) })}</span>}
              {(() => {
                const check = checks.get(placeKey(spot.cityId ?? trip.cityId, spot.name));
                if (check?.verdict === 'ok') return <span className="meta checked">{t('spots.checked', { date: formatDay(check.checkedAt.slice(0, 10)) })}</span>;
                if (check?.verdict === 'fix') return <span className="meta">{t('spots.flagged')}</span>;
                return <span className="meta">{spot.checked ? t('spots.checked', { date: formatDay(spot.checked) }) : t('spots.unchecked')}</span>;
              })()}
            </div>
            <div className="row" style={{ alignItems: 'start' }}>
              <button type="button" className="btn small" onClick={() => onDismiss(placeKey(spot.cityId ?? trip.cityId, spot.name))}>{t('spots.notForMe')}</button>
            </div>
          </div>
        ))}
        {dismissed.size > 0 && (
          <div><button type="button" className="btn small ghost" onClick={onRestore}>{t(dismissed.size === 1 ? 'spots.restoreOne' : 'spots.restoreMany', { n: dismissed.size })}</button></div>
        )}
      </div>

      <div className="stack-sm">
        <span className="eyebrow">{t('spots.yours')}</span>
        {trip.spots.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('spots.yoursEmpty')}</p>}
        {trip.spots.map((spot) =>
          editing === spot.id ? (
            <SpotForm key={spot.id} days={plan.days} cities={cities} initial={spot} onSave={(s) => { onSave(s); setEditing(null); }} onCancel={() => setEditing(null)} />
          ) : (
            <div key={spot.id} className="spot">
              <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
                <strong>{spot.name}</strong>
                <span className="meta">
                  {cityName(spot.cityId)} · {t(`light.${spot.light}`)} · {unscheduled.has(spot.id) ? t('spots.noFit') : placed.get(spot.id) ? formatDay(placed.get(spot.id) ?? '') : t('spots.hidden')}
                  {spot.date ? ` ${t('spots.pinned')}` : ''}
                </span>
                {spot.shotList && <span className="meta">{spot.shotList}</span>}
              </div>
              <div className="row" style={{ alignItems: 'start' }}>
                <button type="button" className="btn small" onClick={() => setEditing(spot.id)}>{t('common.edit')}</button>
                <button type="button" className="icon-btn" aria-label={t('spots.remove', { name: spot.name })} onClick={() => onRemove(spot.id)}>×</button>
              </div>
            </div>
          ),
        )}
        {plan.unscheduledSpots.length > 0 && (
          <p className="notice">{t('spots.unscheduled', { n: plan.unscheduledSpots.length })}</p>
        )}
      </div>

      {cities.map((city) => {
        const more = city.suggestedSpots.filter((s) => !shown.has(s.name.toLowerCase()) && !dismissed.has(placeKey(city.id, s.name)));
        if (more.length === 0) return null;
        return (
          <div key={city.id} className="stack-sm">
            <span className="eyebrow">{t('spots.more', { city: city.name })}</span>
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
