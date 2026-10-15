import type { Trip } from '../../types';
import { findCity } from '../../data/countries';
import { daysBetween, formatDay } from '../../utils/dates';
import { useT } from '../../i18n';

/** "Addis Ababa → Harar → Addis Ababa" from the first city and the stops in date order. */
export function routeLine(trip: Trip): string {
  const ids = [trip.cityId, ...[...trip.stops].sort((a, b) => a.date.localeCompare(b.date)).map((s) => s.cityId)];
  return ids.map((id) => findCity(trip.countryCode, id)?.name ?? id).join(' → ');
}

/** One trip in a list: date tile, name, route and length. */
export function TripCard({ trip, onOpen }: { trip: Trip; onOpen: (id: string) => void }) {
  const t = useT();
  const days = daysBetween(trip.startDate, trip.endDate) + 1;
  const start = new Date(`${trip.startDate}T12:00:00Z`);
  return (
    <button type="button" className="trip-card" onClick={() => onOpen(trip.id)}>
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
}
