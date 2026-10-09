import { useState, type FormEvent } from 'react';
import type { Trip, TravelMode } from '../../types';
import { COUNTRIES, findCountry } from '../../data/countries';
import { AUDIENCE_TIME_ZONES } from '../../data/timeZones';
import { Field } from '../../components/ui/Field';
import { Segmented } from '../../components/ui/Segmented';
import { validateTrip } from './tripDraft';
import { RouteEditor } from './RouteEditor';
import { InterestPicker } from './InterestPicker';
import { PreferencePicker } from './PreferencePicker';
import { DiasporaPicker } from './DiasporaPicker';
import { formatDay } from '../../utils/dates';

interface TripFormProps {
  initial: Trip;
  isNew: boolean;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
}

const MODES: { value: TravelMode; label: string }[] = [
  { value: 'traveler', label: 'Traveler' },
  { value: 'creator', label: 'Content creator' },
];

export function TripForm({ initial, isNew, onSave, onCancel }: TripFormProps) {
  const [trip, setTrip] = useState<Trip>(initial);
  const [error, setError] = useState<string | null>(null);
  const country = findCountry(trip.countryCode);
  const set = <K extends keyof Trip>(key: K, value: Trip[K]) => setTrip((t) => ({ ...t, [key]: value }));

  const zones = AUDIENCE_TIME_ZONES.some((z) => z.value === trip.audienceTimeZone)
    ? AUDIENCE_TIME_ZONES
    : [{ value: trip.audienceTimeZone, label: `${trip.audienceTimeZone} (this device)` }, ...AUDIENCE_TIME_ZONES];

  function changeCountry(code: string) {
    const next = findCountry(code);
    setTrip((t) => ({ ...t, countryCode: code, cityId: next?.cities[0]?.id ?? '', stops: [] }));
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
    <form className="form section" onSubmit={submit} noValidate>
      <h2>{isNew ? 'New trip' : 'Edit trip'}</h2>
      <Field id="trip-name" label="Trip name" hint="Leave empty to use the city and date.">
        <input id="trip-name" className="input" value={trip.name} onChange={(e) => set('name', e.target.value)} placeholder="Timkat in Gondar" />
      </Field>
      <div className="grid-2">
        {COUNTRIES.length > 1 && (
          <Field id="trip-country" label="Country">
            <select id="trip-country" className="select" value={trip.countryCode} onChange={(e) => changeCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <Field id="trip-city" label="First city">
          <select id="trip-city" className="select" value={trip.cityId} onChange={(e) => set('cityId', e.target.value)}>
            {country?.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="trip-start" label="First day">
          <input id="trip-start" type="date" className="input" value={trip.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </Field>
        <Field id="trip-end" label="Last day">
          <input id="trip-end" type="date" className="input" value={trip.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </Field>
        <Field id="trip-arrive" label="Landing time (local)">
          <input id="trip-arrive" type="time" className="input" value={trip.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} />
        </Field>
        <Field id="trip-depart" label="Flight out (local)">
          <input id="trip-depart" type="time" className="input" value={trip.departureTime} onChange={(e) => set('departureTime', e.target.value)} />
        </Field>
      </div>
      <RouteEditor
        cities={country?.cities ?? []}
        firstCityId={trip.cityId}
        startDate={trip.startDate}
        endDate={trip.endDate}
        stops={trip.stops}
        onChange={(stops) => set('stops', stops)}
      />
      <InterestPicker
        interests={trip.interests}
        pace={trip.pace}
        onInterests={(interests) => set('interests', interests)}
        onPace={(pace) => set('pace', pace)}
      />
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
        onDiaspora={(diaspora) => setTrip((t) => ({ ...t, diaspora, entryDoc: diaspora && t.entryDoc === 'visa' ? 'origin-id' : t.entryDoc }))}
        onEntryDoc={(entryDoc) => set('entryDoc', entryDoc)}
        onFamilyTime={(familyTime) => set('familyTime', familyTime)}
      />
      <Segmented label="Plan for" value={trip.mode} options={MODES} onChange={(v) => set('mode', v)} />
      {trip.mode === 'creator' && (
        <>
          <Field id="trip-audience" label="Where most of your audience lives" hint="Posts are scheduled for 19:00 in this time zone.">
            <select id="trip-audience" className="select" value={trip.audienceTimeZone} onChange={(e) => set('audienceTimeZone', e.target.value)}>
              {zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
          </Field>
          <label className="check" htmlFor="trip-drone">
            <input id="trip-drone" type="checkbox" checked={trip.flyingDrone} onChange={(e) => set('flyingDrone', e.target.checked)} />
            I'm bringing a drone
          </label>
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button type="submit" className="btn primary">{isNew ? 'Build my plan' : 'Save changes'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
