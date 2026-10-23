import { useCallback, useMemo, useState } from 'react';
import { usePlaceChecks } from '../../hooks/usePlaceChecks';
import { closedPlaces } from '../../services/placeChecks';
import type { Task, Trip } from '../../types';
import type { TripDispatch } from '../../hooks/useTrips';
import { findCity, findCountry } from '../../data/countries';
import { generatePlan } from '../planner/generatePlan';
import { addDays, formatDay, todayIso } from '../../utils/dates';
import { buildIcs } from '../../services/ics';
import { saveTextFile } from '../../services/saveFile';
import { addTripToPhoneCalendar, removeTripFromPhoneCalendar } from '../../services/phoneCalendar';
import { ReminderOffer } from '../reminders/ReminderControls';
import { DayStrip } from '../days/DayStrip';
import { DayView } from '../days/DayView';
import { PreTripView } from '../days/PreTripView';
import { TaskSheet } from '../days/TaskSheet';
import { allowedDays, hiddenByTraveler, partnerOf, routeStop, spotOf } from '../planner/taskEdits';
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
  const [editing, setEditing] = useState<Task | null>(null);
  const doneIds = useMemo(() => new Set(trip.doneIds), [trip.doneIds]);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeEditor = useCallback(() => setEditing(null), []);

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
  const cityName = (cityId: string) => findCity(trip.countryCode, cityId)?.name ?? city.name;
  const editSpot = editing ? spotOf(editing, trip, plan.pickedSpots.map((p) => p.spot)) : undefined;
  const editStop = editing ? routeStop(trip, editing) : undefined;
  const allowed = editing ? new Set([editing.date, ...allowedDays(trip, editing, plan.days, editSpot)]) : new Set<string>();
  const dayOptions = plan.days.filter((d) => allowed.has(d.date)).map((d) => ({ date: d.date, label: `${formatDay(d.date)} · ${cityName(d.cityId)}` }));
  const linkHint = editStop
    ? t('edit.routeHint', { city: cityName(editStop.cityId) })
    : editSpot
      ? t('edit.placeHint', { place: editSpot.name })
      : undefined;

  function saveEdit(original: Task, edited: Task) {
    const partner = partnerOf(original, plan.days.find((d) => d.date === original.date)?.tasks ?? []);
    dispatch({ type: 'editTask', tripId: id, original, edited, spot: editSpot, partner });
    setEditing(null);
    if (edited.date === original.date && !editStop) return;
    if (editStop && edited.date === editStop.date) return;
    notify(editStop ? t('toast.routeMoved', { city: cityName(editStop.cityId), day: formatDay(edited.date) }) : t('toast.taskMoved', { day: formatDay(edited.date) }));
  }

  async function exportIcs() {
    try {
      const result = await saveTextFile(`${trip.name.replace(/[^\w-]+/g, '-')}.ics`, buildIcs(trip, plan, city!.timeZone), 'text/calendar');
      if (result === 'downloaded') notify(t('toast.calendar'));
    } catch {
      notify(t('toast.calendarFailed'));
    }
  }

  async function addToCalendar() {
    try {
      const result = await addTripToPhoneCalendar(trip, plan, city!.timeZone);
      if (result.status === 'denied') notify(t('toast.phoneCalendarDenied'));
      else notify(t(result.status === 'added' ? 'toast.phoneCalendarAdded' : 'toast.phoneCalendarUpdated', { n: result.count }));
    } catch {
      notify(t('toast.phoneCalendarFailed'));
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
          hiddenCount={hiddenByTraveler(trip).length}
          onClose={closeMenu}
          onEdit={onEdit}
          onExport={exportIcs}
          onAddToCalendar={addToCalendar}
          onRestore={() => dispatch({ type: 'restoreHidden', tripId: id })}
          onDelete={() => { void removeTripFromPhoneCalendar(id); dispatch({ type: 'remove', tripId: id }); onBack(); }}
          notify={notify}
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
          <ReminderOffer notify={notify} />
          <DayStrip days={plan.days} selected={day.date} doneIds={doneIds} onSelect={setSelected} />
          <DayView
            day={day}
            index={dayIndex}
            cityName={findCity(trip.countryCode, day.cityId)?.name ?? city.name}
            localClock={country.localClock}
            localDate={country.localDate?.(day.date)}
            doneIds={doneIds} onToggle={toggle} onOpen={setEditing} onAdd={add} />
        </>
      )}
      {tab === 'before' && (
        <PreTripView tasks={plan.preTrip} startDate={trip.startDate} doneIds={doneIds} onToggle={toggle} onOpen={setEditing} onAdd={add} addDate={addDays(trip.startDate, -1)} />
      )}
      {editing && (
        <TaskSheet
          key={editing.id}
          task={editing}
          days={editing.date < trip.startDate ? undefined : dayOptions}
          latest={addDays(trip.startDate, -1)}
          linkHint={linkHint}
          onSave={(edited) => saveEdit(editing, edited)}
          onRemove={() => { remove(editing); setEditing(null); }}
          onReset={() => { dispatch({ type: 'resetTask', tripId: id, taskId: editing.id }); setEditing(null); }}
          onClose={closeEditor}
        />
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
