import { preferenceLabels } from '../planner/preferences';
import { useMemo, useState } from 'react';
import type { Task, Trip } from '../../types';
import type { TripDispatch } from '../../hooks/useTrips';
import { findCity, findCountry } from '../../data/countries';
import { generatePlan } from '../planner/generatePlan';
import { addDays, todayIso } from '../../utils/dates';
import { buildIcs, downloadText } from '../../services/ics';
import { DayStrip } from '../days/DayStrip';
import { DayView } from '../days/DayView';
import { PreTripView } from '../days/PreTripView';
import { SpotsView } from '../spots/SpotsView';
import { CountryBrief } from '../country/CountryBrief';
import { TabBar, type TripTab } from './TabBar';
import { TripMenu } from './TripMenu';
import { interestLabel } from '../planner/personalize';

interface TripViewProps {
  trip: Trip;
  dispatch: TripDispatch;
  onBack: () => void;
  onEdit: () => void;
  notify: (message: string) => void;
}

export function TripView({ trip, dispatch, onBack, onEdit, notify }: TripViewProps) {
  const plan = useMemo(() => generatePlan(trip), [trip]);
  const country = findCountry(trip.countryCode);
  const city = findCity(trip.countryCode, trip.cityId);
  const today = todayIso();
  const [tab, setTab] = useState<TripTab>(today < trip.startDate ? 'before' : 'days');
  const [selected, setSelected] = useState(today >= trip.startDate && today <= trip.endDate ? today : trip.startDate);
  const [menuOpen, setMenuOpen] = useState(false);
  const doneIds = useMemo(() => new Set(trip.doneIds), [trip.doneIds]);

  if (!country || !city) {
    return <div className="empty"><p>This trip's country is no longer supported.</p><button className="btn" onClick={onBack}>Back to trips</button></div>;
  }

  const dayIndex = Math.max(0, plan.days.findIndex((d) => d.date === selected));
  const day = plan.days[dayIndex];
  const id = trip.id;
  const toggle = (taskId: string) => dispatch({ type: 'toggleDone', tripId: id, taskId });
  const add = (task: Task) => dispatch({ type: 'addTask', tripId: id, task });
  const remove = (task: Task) =>
    task.source === 'user' ? dispatch({ type: 'removeTask', tripId: id, taskId: task.id }) : dispatch({ type: 'hide', tripId: id, taskId: task.id });

  function exportIcs() {
    try {
      downloadText(`${trip.name.replace(/[^\w-]+/g, '-')}.ics`, buildIcs(trip, plan, city!.timeZone), 'text/calendar');
      notify('Calendar file downloaded');
    } catch {
      notify('Could not create the calendar file on this device.');
    }
  }

  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="All trips">‹</button>
        <h1>{trip.name}</h1>
        <button type="button" className="btn small" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>Trip</button>
      </header>
      {menuOpen && (
        <div style={{ paddingTop: 12 }}>
          <TripMenu
            hiddenCount={trip.hiddenIds.length}
            onEdit={onEdit}
            onExport={exportIcs}
            onRestore={() => dispatch({ type: 'restoreHidden', tripId: id })}
            onDelete={() => { dispatch({ type: 'remove', tripId: id }); onBack(); }}
          />
        </div>
      )}
      {tab === 'days' && day && (
        <>
          <div className="profile-line">
            <span>Planned for</span>
            {trip.interests.length === 0 && <span className="tag">popular places</span>}
            {trip.interests.map((i) => <span key={i} className="tag">{interestLabel(i)}</span>)}
            <span className="tag">{trip.pace} pace</span>
            {preferenceLabels(trip).map((l) => <span key={l} className="tag">{l}</span>)}
            <button type="button" className="btn small ghost" onClick={onEdit}>Change</button>
          </div>
          <DayStrip days={plan.days} selected={day.date} doneIds={doneIds} onSelect={setSelected} />
          <DayView
            day={day}
            index={dayIndex}
            cityName={findCity(trip.countryCode, day.cityId)?.name ?? city.name}
            localClock={country.localClock}
            localDate={country.localDate?.(day.date)}
            doneIds={doneIds} onToggle={toggle} onRemove={remove} onAdd={add} />
        </>
      )}
      {tab === 'before' && (
        <PreTripView tasks={plan.preTrip} startDate={trip.startDate} doneIds={doneIds} onToggle={toggle} onRemove={remove} onAdd={add} addDate={addDays(trip.startDate, -1)} />
      )}
      {tab === 'spots' && (
        <SpotsView
          trip={trip}
          plan={plan}
          onSave={(spot) => dispatch({ type: 'upsertSpot', tripId: id, spot })}
          onRemove={(spotId) => dispatch({ type: 'removeSpot', tripId: id, spotId })}
          onDismiss={(key) => dispatch({ type: 'dismissPlace', tripId: id, key })}
          onRestore={() => dispatch({ type: 'restorePlaces', tripId: id })}
        />
      )}
      {tab === 'country' && <CountryBrief country={country} trip={trip} />}
      <TabBar tab={tab} onChange={setTab} />
    </>
  );
}
