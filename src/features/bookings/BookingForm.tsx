import { useState, type FormEvent } from 'react';
import type { Booking, City, DayPlan } from '../../types';
import { Field } from '../../components/ui/Field';
import { Segmented } from '../../components/ui/Segmented';
import { formatDay } from '../../utils/dates';
import { newId } from '../../utils/id';
import { useT } from '../../i18n';
import { BOOKING_KINDS, FIELDS, type BookingField } from './bookings';

interface BookingFormProps {
  days: DayPlan[];
  cities: City[];
  initial?: Booking;
  onSave: (booking: Booking) => void;
  onCancel?: () => void;
}

const blank = (cityId?: string): Booking => ({ id: newId('booking'), kind: 'stay', name: '', cityId });

/** Keeps only the fields this kind of booking uses, and drops empty ones so the saved trip stays small. */
function tidy(b: Booking): Booking {
  const out: Booking = { id: b.id, kind: b.kind, name: b.name.trim() };
  for (const key of FIELDS[b.kind]) {
    const value = b[key]?.trim();
    if (value) out[key] = value;
  }
  // A check-out before check-in is a slip of the finger: keep the check-in.
  if (out.endDate && out.date && out.endDate <= out.date) delete out.endDate;
  return out;
}

export function BookingForm({ days, cities, initial, onSave, onCancel }: BookingFormProps) {
  const t = useT();
  const [booking, setBooking] = useState<Booking>(initial ?? blank(cities[0]?.id));
  const set = (patch: Partial<Booking>) => setBooking({ ...booking, ...patch });
  const prefix = `booking-${booking.id}`;
  const shows = (field: BookingField) => FIELDS[booking.kind].includes(field);
  const travel = booking.kind === 'flight' || booking.kind === 'transport';
  const text = (field: 'ref' | 'address' | 'from' | 'to', label: string, extra: { placeholder?: string; autoCapitalize?: string } = {}) =>
    shows(field) && (
      <Field id={`${prefix}-${field}`} label={label}>
        <input id={`${prefix}-${field}`} className="input" value={booking[field] ?? ''} {...extra} onChange={(e) => set({ [field]: e.target.value })} />
      </Field>
    );
  const dayOptions = (after?: string) => days.filter((d) => !after || d.date > after).map((d) => <option key={d.date} value={d.date}>{t('day.number', { n: days.indexOf(d) + 1 })} · {formatDay(d.date)}</option>);

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
      {shows('cityId') && cities.length > 1 && (
        <Field id={`${prefix}-city`} label={t('booking.city')}>
          <select id={`${prefix}-city`} className="select" value={booking.cityId ?? ''} onChange={(e) => set({ cityId: e.target.value || undefined })}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {travel && (
        <div className="row booking-when">
          {text('from', t('booking.from'), { placeholder: t(booking.kind === 'flight' ? 'booking.fromPlaceholder.flight' : 'booking.fromPlaceholder.transport') })}
          {text('to', t('booking.to'), { placeholder: t(booking.kind === 'flight' ? 'booking.toPlaceholder.flight' : 'booking.toPlaceholder.transport') })}
        </div>
      )}
      <div className="row booking-when">
        <Field id={`${prefix}-date`} label={t(booking.kind === 'stay' ? 'booking.checkIn' : 'booking.date')}>
          <select id={`${prefix}-date`} className="select" value={booking.date ?? ''} onChange={(e) => set({ date: e.target.value || undefined })}>
            <option value="">{t('booking.noDate')}</option>
            {dayOptions()}
          </select>
        </Field>
        {shows('endDate') && (
          <Field id={`${prefix}-end`} label={t('booking.checkOut')}>
            <select id={`${prefix}-end`} className="select" value={booking.endDate ?? ''} onChange={(e) => set({ endDate: e.target.value || undefined })}>
              <option value="">{t('booking.noDate')}</option>
              {dayOptions(booking.date)}
            </select>
          </Field>
        )}
        {shows('time') && (
          <Field id={`${prefix}-time`} label={t(travel ? 'booking.departs' : 'booking.time')}>
            <input id={`${prefix}-time`} className="input" type="time" value={booking.time ?? ''} onChange={(e) => set({ time: e.target.value || undefined })} />
          </Field>
        )}
        {shows('arriveTime') && (
          <Field id={`${prefix}-arrive`} label={t('booking.arrives')}>
            <input id={`${prefix}-arrive`} className="input" type="time" value={booking.arriveTime ?? ''} onChange={(e) => set({ arriveTime: e.target.value || undefined })} />
          </Field>
        )}
      </div>
      {text('ref', t('booking.ref'), { autoCapitalize: 'characters' })}
      {text('address', t('booking.address'))}
      {shows('phone') && (
        <Field id={`${prefix}-phone`} label={t('booking.phone')}>
          <input id={`${prefix}-phone`} className="input" type="tel" value={booking.phone ?? ''} placeholder="+251 9…" onChange={(e) => set({ phone: e.target.value })} />
        </Field>
      )}
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
