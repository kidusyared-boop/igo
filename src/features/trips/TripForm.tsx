import { useState, type FormEvent } from 'react';
import type { Trip, TravelMode } from '../../types';
import { COUNTRIES, findCountry } from '../../data/countries';
import { AUDIENCE_TIME_ZONES } from '../../data/timeZones';
import { Field } from '../../components/ui/Field';
import { Segmented } from '../../components/ui/Segmented';
import { MAX_TRIP_DAYS, validateTrip } from './tripDraft';
import { RouteEditor } from './RouteEditor';
import { InterestPicker } from './InterestPicker';
import { PreferencePicker } from './PreferencePicker';
import { DiasporaPicker } from './DiasporaPicker';
import { addDays, daysBetween, formatDay } from '../../utils/dates';
import { BackIcon } from '../../components/ui/Icons';
import { useT, type TKey } from '../../i18n';

interface TripFormProps {
  initial: Trip;
  isNew: boolean;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
}

const MODES: TravelMode[] = ['traveler', 'creator'];

export function TripForm({ initial, isNew, onSave, onCancel }: TripFormProps) {
  const t = useT();
  const [trip, setTrip] = useState<Trip>(initial);
  const [error, setError] = useState<TKey | null>(null);
  const country = findCountry(trip.countryCode);
  const set = <K extends keyof Trip>(key: K, value: Trip[K]) => setTrip((prev) => ({ ...prev, [key]: value }));

  const zones = AUDIENCE_TIME_ZONES.some((z) => z.value === trip.audienceTimeZone)
    ? AUDIENCE_TIME_ZONES
    : [{ value: trip.audienceTimeZone, label: t('form.thisDevice', { zone: trip.audienceTimeZone }) }, ...AUDIENCE_TIME_ZONES];

  function changeCountry(code: string) {
    const next = findCountry(code);
    setTrip((prev) => ({ ...prev, countryCode: code, cityId: next?.cities[0]?.id ?? '', stops: [] }));
  }

  // A new start date moves the whole trip, stops and flight home included; the end date can then be changed on its own.
  function changeStart(value: string) {
    setTrip((prev) => {
      // Half-typed years on a desktop keyboard (0002-11-10) would fling the trip centuries away.
      const whole = (d: string) => /^(19|20)\d\d-\d\d-\d\d$/.test(d);
      const shift = whole(prev.startDate) && whole(value) ? daysBetween(prev.startDate, value) : 0;
      if (!shift) return { ...prev, startDate: value };
      return { ...prev, startDate: value, endDate: addDays(prev.endDate, shift), stops: prev.stops.map((s) => ({ ...s, date: addDays(s.date, shift) })) };
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validateTrip(trip);
    setError(problem);
    if (problem) return;
    const city = country?.cities.find((c) => c.id === trip.cityId);
    onSave({ ...trip, name: trip.name.trim() || `${city?.name ?? 'Trip'}, ${formatDay(trip.startDate).split(', ')[1] ?? trip.startDate}` });
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label={t('common.cancel')}><BackIcon /></button>
        <h1>{t(isNew ? 'form.new' : 'form.edit')}</h1>
      </header>
      <div className="form-card">
        <Field id="trip-name" label={t('form.name')} hint={t('form.nameHint')}>
          <input id="trip-name" className="input" value={trip.name} onChange={(e) => set('name', e.target.value)} placeholder={t('form.namePlaceholder')} />
        </Field>
        <div className="grid-2">
          {COUNTRIES.length > 1 && (
            <Field id="trip-country" label={t('form.country')}>
              <select id="trip-country" className="select" value={trip.countryCode} onChange={(e) => changeCountry(e.target.value)}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <Field id="trip-city" label={t('form.firstCity')}>
            <select id="trip-city" className="select" value={trip.cityId} onChange={(e) => set('cityId', e.target.value)}>
              {country?.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="trip-start" label={t('form.firstDay')}>
            <input id="trip-start" type="date" className="input" value={trip.startDate} onChange={(e) => changeStart(e.target.value)} />
          </Field>
          <Field id="trip-end" label={t('form.lastDay')}>
            <input id="trip-end" type="date" className="input" value={trip.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </Field>
          <Field id="trip-arrive" label={t('form.landing')}>
            <input id="trip-arrive" type="time" className="input" value={trip.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} />
          </Field>
          <Field id="trip-depart" label={t('form.flightOut')}>
            <input id="trip-depart" type="time" className="input" value={trip.departureTime} onChange={(e) => set('departureTime', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="form-card">
        <Segmented label={t('form.planFor')} value={trip.mode} options={MODES.map((m) => ({ value: m, label: t(`mode.${m}`) }))} onChange={(v) => set('mode', v)} />
        {trip.mode === 'creator' && (
          <>
            <Field id="trip-audience" label={t('form.audience')} hint={t('form.audienceHint')}>
              <select id="trip-audience" className="select" value={trip.audienceTimeZone} onChange={(e) => set('audienceTimeZone', e.target.value)}>
                {zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
              </select>
            </Field>
            <label className="check" htmlFor="trip-drone">
              <input id="trip-drone" type="checkbox" checked={trip.flyingDrone} onChange={(e) => set('flyingDrone', e.target.checked)} />
              {t('form.drone')}
            </label>
          </>
        )}
      </div>
      <div className="form-card">
        <RouteEditor
          cities={country?.cities ?? []}
          firstCityId={trip.cityId}
          startDate={trip.startDate}
          endDate={trip.endDate}
          stops={trip.stops}
          onChange={(stops) => set('stops', stops)}
        />
      </div>
      <div className="form-card">
        <InterestPicker
          interests={trip.interests}
          pace={trip.pace}
          onInterests={(interests) => set('interests', interests)}
          onPace={(pace) => set('pace', pace)}
        />
      </div>
      <div className="form-card">
        <PreferencePicker
          budget={trip.budget}
          diets={trip.diets}
          mobility={trip.mobility}
          withKids={trip.withKids}
          onBudget={(budget) => set('budget', budget)}
          onDiets={(diets) => set('diets', diets)}
          onMobility={(mobility) => set('mobility', mobility)}
          onKids={(withKids) => set('withKids', withKids)}
        />
        <DiasporaPicker
          diaspora={trip.diaspora}
          entryDoc={trip.entryDoc}
          familyTime={trip.familyTime}
          onDiaspora={(diaspora) => setTrip((prev) => ({ ...prev, diaspora, entryDoc: diaspora && prev.entryDoc === 'visa' ? 'origin-id' : prev.entryDoc }))}
          onEntryDoc={(entryDoc) => set('entryDoc', entryDoc)}
          onFamilyTime={(familyTime) => set('familyTime', familyTime)}
        />
      </div>
      <div className="form-actions">
        {error && <p className="error" role="alert">{t(error, { max: MAX_TRIP_DAYS })}</p>}
        <button type="button" className="btn ghost" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="submit" className="btn primary">{t(isNew ? 'form.build' : 'form.save')}</button>
      </div>
    </form>
  );
}
