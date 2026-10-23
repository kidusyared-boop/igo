import { useState } from 'react';
import type { Booking, Trip, TripPlan } from '../../types';
import { findCity } from '../../data/countries';
import { formatDay } from '../../utils/dates';
import { routeCities } from '../planner/route';
import { useT } from '../../i18n';
import { BookingForm } from './BookingForm';
import { mapLink, routeText, sortBookings, telLink, timeText } from './bookings';

interface BookingsViewProps {
  trip: Trip;
  plan: TripPlan;
  onSave: (booking: Booking) => void;
  onRemove: (bookingId: string) => void;
}

export function BookingsView({ trip, plan, onSave, onRemove }: BookingsViewProps) {
  const t = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const cities = [...new Set(routeCities(trip).map((l) => l.cityId))].map((id) => findCity(trip.countryCode, id)).filter((c) => c !== undefined);
  const cityName = (id?: string) => (id ? findCity(trip.countryCode, id)?.name : undefined);
  const bookings = sortBookings(trip.bookings ?? []);

  return (
    <div className="section">
      <h2>{t('bookings.title')}</h2>
      <p className="muted" style={{ margin: 0 }}>{t(bookings.length ? 'bookings.intro' : 'bookings.empty')}</p>

      {bookings.length > 0 && (
        <div className="stack-sm">
          {bookings.map((b) =>
            editing === b.id ? (
              <BookingForm key={b.id} days={plan.days} cities={cities} initial={b} onSave={(next) => { onSave(next); setEditing(null); }} onCancel={() => setEditing(null)} />
            ) : (
              <div key={b.id} className="spot booking">
                <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
                  <span className="eyebrow">{t(`booking.kind.${b.kind}`)}</span>
                  <strong>{b.name}</strong>
                  {routeText(b) && <span className="meta">{routeText(b)}</span>}
                  {(b.date || b.time || b.arriveTime || b.cityId) && (
                    <span className="meta">
                      {[b.date && (b.endDate ? `${formatDay(b.date)} – ${formatDay(b.endDate)}` : formatDay(b.date)), timeText(b), cityName(b.cityId)].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {b.ref && <span className="booking-ref">{t('booking.refShown', { ref: b.ref })}</span>}
                  {b.address && <a className="booking-link" href={mapLink(b.address)} target="_blank" rel="noreferrer">{b.address}</a>}
                  {b.phone && <a className="booking-link" href={telLink(b.phone)}>{t('booking.call', { phone: b.phone })}</a>}
                  {b.notes && <span className="meta booking-notes">{b.notes}</span>}
                </div>
                <div className="row" style={{ alignItems: 'start' }}>
                  {confirming === b.id ? (
                    <>
                      <button type="button" className="btn small danger" onClick={() => { onRemove(b.id); setConfirming(null); }}>{t('common.delete')}</button>
                      <button type="button" className="btn small ghost" onClick={() => setConfirming(null)}>{t('common.cancel')}</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn small" onClick={() => setEditing(b.id)}>{t('common.edit')}</button>
                      <button type="button" className="icon-btn" aria-label={t('booking.remove', { name: b.name })} onClick={() => setConfirming(b.id)}>×</button>
                    </>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <div className="stack-sm">
        <span className="eyebrow">{t('bookings.addTitle')}</span>
        <BookingForm days={plan.days} cities={cities} onSave={onSave} />
      </div>
    </div>
  );
}
