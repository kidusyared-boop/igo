import { useCallback, useMemo, useState } from 'react';
import { usePlaceChecks } from '../../hooks/usePlaceChecks';
import { closedPlaces } from '../../services/placeChecks';
import type { Task, Trip } from '../../types';
import type { TripDispatch } from '../../hooks/useTrips';
import { findCity, findCountry } from '../../data/countries';
import { generatePlan } from '../planner/generatePlan';
import { addDays, todayIso } from '../../utils/dates';
import { buildIcs } from '../../services/ics';
import { saveTextFile } from '../../services/saveFile';
import { DayStrip } from '../days/DayStrip';
import { DayView } from '../days/DayView';
import { PreTripView } from '../days/PreTripView';
import { SpotsView } from '../spots/SpotsView';
import { CountryBrief } from '../country/CountryBrief';
import { TabBar, type TripTab } from './TabBar';
import { TripMenu } from './TripMenu';
import { BackIcon, MoreIcon } from '../../components/ui/Icons';
import { useT, type TFunction } from '../../i18n';

/** Short labels for the "Planned for" line, translated. */
function profileLabels(trip: Trip, t: TFunction): string[] {
  const labels = [t('chips.pace', { pace: t(`pace.${trip.pace}`).toLowerCase() }), t('chips.budget', { budget: t(`budget.${trip.budget}`).toLowerCase() })];
  labels.push(...trip.diets.map((d) => t(`diet.${d}`).toLowerCase()));
  if (trip.mobility === 'limited') labels.push(t('chips.easyAccess'));
  if (trip.withKids) labels.push(t('chips.withKids'));
  if (trip.diaspora) labels.push(t(trip.familyTime ? 'chips.visitingFamily' : 'chips.visitingHome'));
  return labels;
}

interface TripViewProps {
  trip: Trip;
  dispatch: TripDispatch;
  onBack: () => void;
  /** Show the plan just built, not the prep list. */
  justCreated?: boolean;
  onEdit: () => void;
  notify: (message: string) => void;
}

export function TripView({ trip, dispatch, onBack, onEdit, notify, justCreated = false }: TripViewProps) {
  const t = useT();
  const { checks } = usePlaceChecks();
  const closed = useMemo(() => closedPlaces(checks), [checks]);
  const plan = useMemo(() => generatePlan(trip, closed), [trip, closed]);
  const country = findCountry(trip.countryCode);
  const city = findCity(trip.countryCode, trip.cityId);
  const today = todayIso();
  const [tab, setTab] = useState<TripTab>(today < trip.startDate && !justCreated ? 'before' : 'days');
  const [selected, setSelected] = useState(today >= trip.startDate && today <= trip.endDate ? today : trip.startDate);
  const [menuOpen, setMenuOpen] = useState(false);
  const doneIds = useMemo(() => new Set(trip.doneIds), [trip.doneIds]);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  if (!country || !city) {
    return <div className="empty"><p>{t('trip.unsupported')}</p><button className="btn" onClick={onBack}>{t('trip.back')}</button></div>;
  }

  const dayIndex = Math.max(0, plan.days.findIndex((d) => d.date === selected));
  const day = plan.days[dayIndex];
  const id = trip.id;
  const toggle = (taskId: string) => dispatch({ type: 'toggleDone', tripId: id, taskId });
  const add = (task: Task) => dispatch({ type: 'addTask', tripId: id, task });
  const remove = (task: Task) =>
    task.source === 'user' ? dispatch({ type: 'removeTask', tripId: id, taskId: task.id }) : dispatch({ type: 'hide', tripId: id, taskId: task.id });

  async function exportIcs() {
    try {
      const result = await saveTextFile(`${trip.name.replace(/[^\w-]+/g, '-')}.ics`, buildIcs(trip, plan, city!.timeZone), 'text/calendar');
      if (result === 'downloaded') notify(t('toast.calendar'));
    } catch {
      notify(t('toast.calendarFailed'));
    }
  }

  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('trip.allTrips')}><BackIcon /></button>
        <h1>{trip.name}</h1>
        <button type="button" className="icon-btn" aria-label={t('trip.menu')} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><MoreIcon /></button>
      </header>
      {menuOpen && (
        <TripMenu
          title={trip.name}
          hiddenCount={trip.hiddenIds.length}
          onClose={closeMenu}
          onEdit={onEdit}
          onExport={exportIcs}
          onRestore={() => dispatch({ type: 'restoreHidden', tripId: id })}
          onDelete={() => { dispatch({ type: 'remove', tripId: id }); onBack(); }}
        />
      )}
      {tab === 'days' && day && (
        <>
          <div className="profile-line">
            <div className="profile-chips">
              <span>{t('chips.plannedFor')}</span>
              {trip.interests.length === 0 && <span className="tag">{t('chips.popular')}</span>}
              {trip.interests.map((i) => <span key={i} className="tag">{t(`interest.${i}`).toLowerCase()}</span>)}
              {profileLabels(trip, t).map((l) => <span key={l} className="tag">{l}</span>)}
            </div>
            <button type="button" className="btn small ghost" onClick={onEdit}>{t('common.change')}</button>
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
      <TabBar tab={tab} onChange={(next) => { setTab(next); window.scrollTo(0, 0); }} />
    </>
  );
}
