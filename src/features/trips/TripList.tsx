import type { Trip } from '../../types';
import { findCity, findCountry } from '../../data/countries';
import { daysBetween, formatDay } from '../../utils/dates';
import { useT } from '../../i18n';

interface TripListProps {
  trips: Trip[];
  onOpen: (id: string) => void;
  onNew: () => void;
}

export function TripList({ trips, onOpen, onNew }: TripListProps) {
  const t = useT();
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <div className="section">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{t('list.title')}</h2>
        <button type="button" className="btn primary" onClick={onNew}>{t('list.new')}</button>
      </div>
      {sorted.length === 0 && (
        <div className="empty">
          <p>{t('list.empty')}</p>
        </div>
      )}
      <div className="stack-sm">
        {sorted.map((trip) => {
          const country = findCountry(trip.countryCode);
          const city = findCity(trip.countryCode, trip.cityId);
          const days = daysBetween(trip.startDate, trip.endDate) + 1;
          return (
            <button key={trip.id} type="button" className="trip-card" onClick={() => onOpen(trip.id)}>
              <div className="stack-sm" style={{ gap: 4 }}>
                <div className="row">
                  <h3>{trip.name}</h3>
                  {trip.id.startsWith('example') && <span className="example-tag">{t('list.example')}</span>}
                </div>
                <span className="muted">
                  {city?.name}, {country?.name} · {formatDay(trip.startDate)} · {t(days === 1 ? 'list.day' : 'list.days', { n: days })}
                </span>
              </div>
              <span className="code" aria-hidden="true">{trip.countryCode}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
