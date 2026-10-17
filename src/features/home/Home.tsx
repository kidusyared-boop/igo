import { useEffect, useMemo, useState } from 'react';
import type { Trip } from '../../types';
import type { SyncState } from '../../hooks/useSync';
import { supabase } from '../../services/supabase';
import { generatePlan } from '../planner/generatePlan';
import { AccountPanel } from '../account/AccountPanel';
import { TripCard, routeLine } from '../trips/TripCard';
import { TickIcon, UserIcon } from '../../components/ui/Icons';
import { daysBetween, formatDay, todayIso } from '../../utils/dates';
import { useT } from '../../i18n';
import { homeTodos, isExample, nextTrip, tripTiming } from './homeState';
import heroUrl from '../../assets/home-hero.svg';

interface HomeProps {
  trips: Trip[];
  sync: SyncState;
  onSyncNow: () => void;
  /** Set for people on the reviewers list. */
  onReview?: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onToggle: (tripId: string, taskId: string) => void;
}

/**
 * The opening screen. With a trip of your own coming up it counts down to it and lists
 * what to do this week; without one it says what igo does and offers to start a trip.
 */
export function Home({ trips, sync, onSyncNow, onReview, onOpen, onNew, onToggle }: HomeProps) {
  const t = useT();
  const today = todayIso();
  const [accountOpen, setAccountOpen] = useState(false);
  const next = nextTrip(trips, today);
  const others = [...trips].filter((trip) => trip !== next).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const canSync = Boolean(supabase) && sync.status !== 'off';

  return (
    <div className="home">
      <section className={`home-hero${next ? ' with-trip' : ''}`} style={{ backgroundImage: `url("${heroUrl}")` }}>
        <div className="home-top">
          <span className="brand">i<span>go</span></span>
          {canSync && (
            <button type="button" className="home-account" aria-label={t('home.account')} onClick={() => setAccountOpen(true)}>
              <UserIcon />
            </button>
          )}
        </div>
        {next ? <Countdown trip={next} today={today} onOpen={onOpen} /> : <Pitch onNew={onNew} />}
      </section>

      {next && <TripToday trip={next} today={today} onOpen={onOpen} onToggle={onToggle} />}

      {others.length > 0 && (
        <div className="section">
          <h2 className="home-h">{t(next ? 'home.otherTrips' : others.every(isExample) ? 'home.tryExample' : 'list.title')}</h2>
          <div className="stack-sm" style={{ gap: 10 }}>
            {others.map((trip) => <TripCard key={trip.id} trip={trip} onOpen={onOpen} />)}
          </div>
        </div>
      )}

      <p className="home-foot">
        {sync.status === 'syncing' || sync.status === 'synced' || sync.status === 'error' ? (
          <>{t('home.syncedAs', { email: sync.email })} <button type="button" className="link-btn" onClick={() => setAccountOpen(true)}>{t('home.manage')}</button></>
        ) : (
          <>{t('account.deviceOnly')} {canSync && <button type="button" className="link-btn" onClick={() => setAccountOpen(true)}>{t('account.signInToSync')}</button>}</>
        )}
      </p>

      {next && (
        <button type="button" className="fab" onClick={onNew}>
          <span aria-hidden="true">+</span>
          {t('list.new')}
        </button>
      )}

      {accountOpen && <AccountSheet sync={sync} onSyncNow={onSyncNow} onReview={onReview} onClose={() => setAccountOpen(false)} />}
    </div>
  );
}

function Pitch({ onNew }: { onNew: () => void }) {
  const t = useT();
  return (
    <div className="home-hero-body">
      <span className="eyebrow">{t('home.eyebrow')}</span>
      <h1>{t('home.title')}</h1>
      <ul className="home-points">
        <li><TickIcon />{t('home.point1')}</li>
        <li><TickIcon />{t('home.point2')}</li>
        <li><TickIcon />{t('home.point3')}</li>
      </ul>
      <button type="button" className="btn primary home-start" onClick={onNew}>
        <span aria-hidden="true">+</span> {t('home.start')}
      </button>
    </div>
  );
}

function Countdown({ trip, today, onOpen }: { trip: Trip; today: string; onOpen: (id: string) => void }) {
  const t = useT();
  const timing = tripTiming(trip, today);
  const length = daysBetween(trip.startDate, trip.endDate) + 1;
  return (
    <button type="button" className="home-hero-body home-countdown" onClick={() => onOpen(trip.id)}>
      <span className="eyebrow">{t(timing.kind === 'ahead' ? 'home.nextTrip' : 'home.onTrip')}</span>
      <span className="home-trip-name">{trip.name}</span>
      <span className="home-count">
        <b>{timing.kind === 'ahead' ? timing.days : timing.day}</b>
        <span>
          {timing.kind === 'ahead'
            ? t(timing.days === 1 ? 'home.dayToGo' : 'home.daysToGo')
            : t('home.dayOf', { n: timing.of })}
        </span>
      </span>
      <span className="home-meta">
        {formatDay(trip.startDate)} · {t(length === 1 ? 'list.day' : 'list.days', { n: length })} · {routeLine(trip)}
      </span>
    </button>
  );
}

function TripToday({ trip, today, onOpen, onToggle }: { trip: Trip; today: string; onOpen: (id: string) => void; onToggle: (tripId: string, taskId: string) => void }) {
  const t = useT();
  const plan = useMemo(() => generatePlan(trip), [trip]);
  const todos = homeTodos(trip, plan, today);
  const share = todos.total ? Math.round((todos.done / todos.total) * 100) : 0;
  return (
    <>
      {todos.when === 'week' && todos.total > 0 && (
        <div className="home-progress">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{t('home.beforeYouGo')}</span>
            <span className="mono">{t('home.doneOf', { done: todos.done, total: todos.total })}</span>
          </div>
          <div className="bar" role="progressbar" aria-label={t('home.beforeYouGo')} aria-valuenow={share} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${share}%` }} />
          </div>
        </div>
      )}
      <div className="section">
        <h2 className="home-h">{t(todos.when === 'week' ? 'home.thisWeek' : 'home.today')}</h2>
        {todos.tasks.length > 0 ? (
          <div className="panel home-todos">
            {todos.tasks.map((task) => (
              <label key={task.id} className="check">
                <input type="checkbox" checked={false} onChange={() => onToggle(trip.id, task.id)} />
                <span>{task.time && <span className="mono muted">{task.time} </span>}{task.title}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="muted home-none">{t(todos.when === 'week' ? 'home.nothingThisWeek' : 'home.nothingToday')}</p>
        )}
        <button type="button" className="btn ghost small home-plan" onClick={() => onOpen(trip.id)}>{t('home.fullPlan')} ›</button>
      </div>
    </>
  );
}

function AccountSheet({ sync, onSyncNow, onReview, onClose }: { sync: SyncState; onSyncNow: () => void; onReview?: () => void; onClose: () => void }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('home.account')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h3>{t('home.account')}</h3>
        <p className="muted home-sheet-note">{t('home.syncWhy')}</p>
        <AccountPanel sync={sync} onSyncNow={onSyncNow} onReview={onReview} onClose={onClose} />
      </div>
    </div>
  );
}
