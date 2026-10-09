import { useState, type FormEvent } from 'react';
import type { City, DayPlan, Light, Spot } from '../../types';
import { Field } from '../../components/ui/Field';
import { Segmented } from '../../components/ui/Segmented';
import { formatDay } from '../../utils/dates';
import { newId } from '../../utils/id';

export const LIGHTS: { value: Light; label: string }[] = [
  { value: 'sunrise', label: 'Sunrise' },
  { value: 'any', label: 'Daytime' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'night', label: 'Night' },
];

interface SpotFormProps {
  days: DayPlan[];
  cities: City[];
  initial?: Spot;
  onSave: (spot: Spot) => void;
  onCancel?: () => void;
}

export function SpotForm({ days, cities, initial, onSave, onCancel }: SpotFormProps) {
  const [spot, setSpot] = useState<Spot>(initial ?? { id: newId('spot'), name: '', light: 'sunset', shotList: '', cityId: cities[0]?.id });
  const prefix = `spot-${spot.id}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!spot.name.trim()) return;
    onSave({ ...spot, name: spot.name.trim() });
    if (!initial) setSpot({ id: newId('spot'), name: '', light: spot.light, shotList: '', cityId: spot.cityId });
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <Field id={`${prefix}-name`} label="Place">
        <input id={`${prefix}-name`} className="input" value={spot.name} placeholder="Restaurant, market, viewpoint" onChange={(e) => setSpot({ ...spot, name: e.target.value })} />
      </Field>
      {cities.length > 1 && (
        <Field id={`${prefix}-city`} label="City">
          <select id={`${prefix}-city`} className="select" value={spot.cityId ?? ''} onChange={(e) => setSpot({ ...spot, cityId: e.target.value || undefined, date: undefined })}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <Segmented label="Best time" value={spot.light} options={LIGHTS} onChange={(light) => setSpot({ ...spot, light })} />
      <Field id={`${prefix}-shots`} label="Notes or shot list">
        <textarea id={`${prefix}-shots`} className="textarea" value={spot.shotList} placeholder="Hook shot, wide, details, me in frame" onChange={(e) => setSpot({ ...spot, shotList: e.target.value })} />
      </Field>
      <Field id={`${prefix}-day`} label="Day">
        <select id={`${prefix}-day`} className="select" value={spot.date ?? ''} onChange={(e) => setSpot({ ...spot, date: e.target.value || undefined })}>
          <option value="">Let igo choose</option>
          {days.filter((d) => !spot.cityId || d.cityId === spot.cityId).map((d) => <option key={d.date} value={d.date}>Day {days.indexOf(d) + 1} · {formatDay(d.date)}</option>)}
        </select>
      </Field>
      <div className="row">
        <button type="submit" className="btn primary" disabled={!spot.name.trim()}>{initial ? 'Save place' : 'Add place'}</button>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
