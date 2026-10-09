import type { Trip } from '../../types';
import { findCity, findCountry } from '../../data/countries';
import { daysBetween, formatDay } from '../../utils/dates';

interface TripListProps {
  trips: Trip[];
  onOpen: (id: string) => void;
  onNew: () => void;
}

export function TripList({ trips, onOpen, onNew }: TripListProps) {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <div className="section">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Your trips</h2>
        <button type="button" className="btn primary" onClick={onNew}>New trip</button>
      </div>
      {sorted.length === 0 && (
        <div className="empty">
          <p>No trips yet. Add your next country and igo builds every day's to-do list.</p>
        </div>
      )}
      <div className="stack-sm">
        {sorted.map((t) => {
          const country = findCountry(t.countryCode);
          const city = findCity(t.countryCode, t.cityId);
          const days = daysBetween(t.startDate, t.endDate) + 1;
          return (
            <button key={t.id} type="button" className="trip-card" onClick={() => onOpen(t.id)}>
              <div className="stack-sm" style={{ gap: 4 }}>
                <div className="row">
                  <h3>{t.name}</h3>
                  {t.id.startsWith('example') && <span className="example-tag">Example</span>}
                </div>
                <span className="muted">
                  {city?.name}, {country?.name} · {formatDay(t.startDate)} · {days} {days === 1 ? 'day' : 'days'}
                </span>
              </div>
              <span className="code" aria-hidden="true">{t.countryCode}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
