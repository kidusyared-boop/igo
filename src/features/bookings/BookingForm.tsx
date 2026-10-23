import { useState, type FormEvent } from 'react';
import type { Booking, City, DayPlan } from '../../types';
import { Field } from '../../components/ui/Field';
import { Segmented } from '../../components/ui/Segmented';
import { formatDay } from '../../utils/dates';
import { newId } from '../../utils/id';
import { useT } from '../../i18n';
import { BOOKING_KINDS } from './bookings';

interface BookingFormProps {
  days: DayPlan[];
  cities: City[];
  initial?: Booking;
  onSave: (booking: Booking) => void;
  onCancel?: () => void;
}

const blank = (cityId?: string): Booking => ({ id: newId('booking'), kind: 'stay', name: '', cityId });

/** Drops empty optional fields so the saved trip stays small. */
function tidy(b: Booking): Booking {
  const out: Booking = { id: b.id, kind: b.kind, name: b.name.trim() };
  for (const key of ['cityId', 'date', 'time', 'ref', 'phone', 'address', 'notes'] as const) {
    const value = b[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}

export function BookingForm({ days, cities, initial, onSave, onCancel }: BookingFormProps) {
  const t = useT();
  const [booking, setBooking] = useState<Booking>(initial ?? blank(cities[0]?.id));
  const set = (patch: Partial<Booking>) => setBooking({ ...booking, ...patch });
  const prefix = `booking-${booking.id}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!booking.name.trim()) return;
    onSave(tidy(booking));
    if (!initial) setBooking({ ...blank(booking.cityId), kind: booking.kind });
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <Segmented label={t('booking.kind')} value={booking.kind} options={BOOKING_KINDS.map((k) => ({ value: k, label: t(`booking.kind.${k}`) }))} onChange={(kind) => set({ kind })} />
      <Field id={`${prefix}-name`} label={t(`booking.name.${booking.kind}`)}>
        <input id={`${prefix}-name`} className="input" value={booking.name} placeholder={t(`booking.placeholder.${booking.kind}`)} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      {cities.length > 1 && (
        <Field id={`${prefix}-city`} label={t('booking.city')}>
          <select id={`${prefix}-city`} className="select" value={booking.cityId ?? ''} onChange={(e) => set({ cityId: e.target.value || undefined })}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <div className="row booking-when">
        <Field id={`${prefix}-date`} label={t(booking.kind === 'stay' ? 'booking.checkIn' : 'booking.date')}>
          <select id={`${prefix}-date`} className="select" value={booking.date ?? ''} onChange={(e) => set({ date: e.target.value || undefined })}>
            <option value="">{t('booking.noDate')}</option>
            {days.map((d, i) => <option key={d.date} value={d.date}>{t('day.number', { n: i + 1 })} · {formatDay(d.date)}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-time`} label={t('booking.time')}>
          <input id={`${prefix}-time`} className="input" type="time" value={booking.time ?? ''} onChange={(e) => set({ time: e.target.value || undefined })} />
        </Field>
      </div>
      <Field id={`${prefix}-ref`} label={t('booking.ref')}>
        <input id={`${prefix}-ref`} className="input" value={booking.ref ?? ''} autoCapitalize="characters" onChange={(e) => set({ ref: e.target.value })} />
      </Field>
      <Field id={`${prefix}-address`} label={t('booking.address')}>
        <input id={`${prefix}-address`} className="input" value={booking.address ?? ''} onChange={(e) => set({ address: e.target.value })} />
      </Field>
      <Field id={`${prefix}-phone`} label={t('booking.phone')}>
        <input id={`${prefix}-phone`} className="input" type="tel" value={booking.phone ?? ''} placeholder="+251 9…" onChange={(e) => set({ phone: e.target.value })} />
      </Field>
      <Field id={`${prefix}-notes`} label={t('booking.notes')}>
        <textarea id={`${prefix}-notes`} className="textarea" value={booking.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
      <div className="row">
        <button type="submit" className="btn primary" disabled={!booking.name.trim()}>{t(initial ? 'booking.save' : 'booking.add')}</button>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>{t('common.cancel')}</button>}
      </div>
    </form>
  );
}
