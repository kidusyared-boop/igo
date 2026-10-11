import type { Trip } from '../../types';
import { findCity } from '../../data/countries';
import { PlaneIcon } from '../../components/ui/Icons';
import { daysBetween, formatDay } from '../../utils/dates';
import { useT } from '../../i18n';

interface TripListProps {
  trips: Trip[];
  onOpen: (id: string) => void;
  onNew: () => void;
}

/** "Addis Ababa → Harar → Addis Ababa" from the first city and the stops in date order. */
function routeLine(trip: Trip): string {
  const ids = [trip.cityId, ...[...trip.stops].sort((a, b) => a.date.localeCompare(b.date)).map((s) => s.cityId)];
  return ids.map((id) => findCity(trip.countryCode, id)?.name ?? id).join(' → ');
}

export function TripList({ trips, onOpen, onNew }: TripListProps) {
  const t = useT();
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <div className="section">
      <div className="list-head">
        <h2>{t('list.title')}</h2>
      </div>
      {sorted.length === 0 && (
        <div className="empty-hero">
          <PlaneIcon />
          <p>{t('list.empty')}</p>
          <button type="button" className="btn primary" onClick={onNew}>{t('list.new')}</button>
        </div>
      )}
      <div className="stack-sm" style={{ gap: 10 }}>
        {sorted.map((trip) => {
          const days = daysBetween(trip.startDate, trip.endDate) + 1;
          const start = new Date(`${trip.startDate}T12:00:00Z`);
          return (
            <button key={trip.id} type="button" className="trip-card" onClick={() => onOpen(trip.id)}>
              <span className="when" aria-hidden="true">
                <small>{start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</small>
                <b>{start.getUTCDate()}</b>
              </span>
              <span className="info">
                {trip.id.startsWith('example') && <span className="example-tag">{t('list.example')}</span>}
                <h3>{trip.name}</h3>
                <span className="route">{routeLine(trip)}</span>
                <span className="meta">{formatDay(trip.startDate)} · {t(days === 1 ? 'list.day' : 'list.days', { n: days })}</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>
      {sorted.length > 0 && (
        <button type="button" className="fab" onClick={onNew}>
          <span aria-hidden="true">+</span>
          {t('list.new')}
        </button>
      )}
    </div>
  );
}
