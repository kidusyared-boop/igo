import type { City, Stop } from '../../types';
import { addDays } from '../../utils/dates';
import { newId } from '../../utils/id';
import { useT } from '../../i18n';

interface RouteEditorProps {
  cities: City[];
  firstCityId: string;
  startDate: string;
  endDate: string;
  stops: Stop[];
  onChange: (stops: Stop[]) => void;
}

export function RouteEditor({ cities, firstCityId, startDate, endDate, stops, onChange }: RouteEditorProps) {
  const t = useT();
  const sorted = [...stops].sort((a, b) => a.date.localeCompare(b.date));
  const update = (id: string, patch: Partial<Stop>) => onChange(stops.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  function addStop() {
    const last = sorted.at(-1);
    const date = addDays(last?.date ?? startDate, 2);
    const lastCity = last?.cityId ?? firstCityId;
    const next = cities.find((c) => c.id !== lastCity) ?? cities[0];
    if (!next) return;
    onChange([...stops, { id: newId('stop'), cityId: next.id, date: date > endDate ? endDate : date }]);
  }

  return (
    <div className="field">
      <span className="label">{t('route.label')}</span>
      <span className="hint">{t('route.hint')}</span>
      <div className="stack-sm">
        {sorted.map((stop, i) => (
          <div key={stop.id} className="route-row">
            <select id={`stop-city-${stop.id}`} aria-label={t('route.stopCity', { n: i + 1 })} className="select" value={stop.cityId} onChange={(e) => update(stop.id, { cityId: e.target.value })}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input id={`stop-date-${stop.id}`} aria-label={t('route.stopDate', { n: i + 1 })} type="date" className="input" min={addDays(startDate, 1)} max={endDate} value={stop.date} onChange={(e) => update(stop.id, { date: e.target.value })} />
            <button type="button" className="icon-btn" aria-label={t('route.remove', { n: i + 1 })} onClick={() => onChange(stops.filter((s) => s.id !== stop.id))}>×</button>
          </div>
        ))}
      </div>
      <div><button type="button" className="btn small" onClick={addStop}>{t('route.add')}</button></div>
    </div>
  );
}
