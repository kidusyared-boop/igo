import { useEffect, useLayoutEffect, useState } from 'react';
import type { Trip } from './types';
import { useTrips } from './hooks/useTrips';
import { useSync } from './hooks/useSync';
import { Home } from './features/home/Home';
import { TripForm } from './features/trips/TripForm';
import { followDates } from './features/planner/followDates';
import { TripView } from './features/trips/TripView';
import { blankTrip } from './features/trips/tripDraft';
import { LanguageSwitch } from './components/ui/LanguageSwitch';
import { useT } from './i18n';
import { ReviewView } from './features/review/ReviewView';
import { isReviewer } from './services/placeChecks';
import { useBackButton } from './hooks/useBackButton';
import { useReminders } from './hooks/useReminders';
import { useStatusBar } from './hooks/useStatusBar';
import { ErrorBoundary } from './components/ErrorBoundary';

type Screen = { name: 'list' } | { name: 'review' } | { name: 'trip'; id: string } | { name: 'form'; trip: Trip; isNew: boolean };

/** Where the back button goes from each screen; null means this is the first screen. */
export function parentScreen(screen: Screen): Screen | null {
  switch (screen.name) {
    case 'list':
      return null;
    case 'form':
      return screen.isNew ? { name: 'list' } : { name: 'trip', id: screen.trip.id };
    default:
      return { name: 'list' };
  }
}

export function App() {
  const { trips, tombstones, dispatch, saved } = useTrips();
  const sync = useSync(trips, tombstones, dispatch);
  const t = useT();
  // The example trip waits on the list, where it is labeled, instead of opening as if it were yours.
  const [screen, setScreen] = useState<Screen>(() =>
    trips.length === 1 && trips[0] && !trips[0].id.startsWith('example') ? { name: 'trip', id: trips[0].id } : { name: 'list' },
  );
  const [fresh, setFresh] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState(false);
  const signedInAs = 'email' in sync.state ? sync.state.email : null;

  useBackButton(() => {
    const parent = parentScreen(screen);
    if (parent) setScreen(parent);
    return parent !== null;
  });

  // A tapped reminder opens its trip, unless that would throw away a form being filled in.
  useReminders(trips, (id) => setScreen((s) => (s.name === 'form' ? s : { name: 'trip', id })));

  useEffect(() => {
    if (!signedInAs) return setReviewer(false);
    let live = true;
    void isReviewer().then((yes) => live && setReviewer(yes));
    return () => {
      live = false;
    };
  }, [signedInAs]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Every new screen starts at the top, not where the last one was scrolled to.
  // The braces matter: some phones' WebViews return a value from scrollTo, and React
  // would later call that value as this effect's cleanup and crash on the next tap.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const openTrip = screen.name === 'trip' ? trips.find((t) => t.id === screen.id) : undefined;
  const onHome = screen.name === 'list' || (screen.name === 'trip' && !openTrip);
  useStatusBar(onHome);

  const home = (
    <Home
      trips={trips}
      sync={sync.state}
      onSyncNow={() => void sync.syncNow()}
      onReview={reviewer ? () => setScreen({ name: 'review' }) : undefined}
      onOpen={(id) => setScreen({ name: 'trip', id })}
      onNew={() => setScreen({ name: 'form', trip: blankTrip(), isNew: true })}
      onToggle={(tripId, taskId) => dispatch({ type: 'toggleDone', tripId, taskId })}
    />
  );

  return (
    <div className="app">
      {screen.name === 'review' && (
        <header className="topbar">
          <span className="brand">i<span>go</span></span>
          <span className="eyebrow tagline">{t('app.tagline')}</span>
          <LanguageSwitch />
        </header>
      )}
      <ErrorBoundary
        resetKey={screen.name === 'trip' ? `trip:${screen.id}` : screen.name}
        fallback={(error, reset) => (
          <section className="panel crash" role="alert">
            <h2>{t('crash.title')}</h2>
            <p>{t('crash.body')}</p>
            <pre className="crash-detail">{error.message}</pre>
            <button type="button" className="btn primary" onClick={() => { setScreen({ name: 'list' }); reset(); }}>{t('crash.back')}</button>
          </section>
        )}
      >
      {screen.name === 'review' && <ReviewView onBack={() => setScreen({ name: 'list' })} notify={setToast} />}
      {onHome && home}
      {screen.name === 'form' && (
        <TripForm
          initial={screen.trip}
          isNew={screen.isNew}
          onCancel={() => setScreen(parentScreen(screen) ?? { name: 'list' })}
          onSave={(edited) => { const trip = screen.isNew ? edited : followDates(screen.trip, edited); dispatch({ type: 'upsert', trip }); if (screen.isNew) setFresh(trip.id); setScreen({ name: 'trip', id: trip.id }); }}
        />
      )}
      {screen.name === 'trip' && openTrip && (
        <TripView
          key={openTrip.id}
          trip={openTrip}
          justCreated={fresh === openTrip.id}
          dispatch={dispatch}
          onBack={() => setScreen({ name: 'list' })}
          onEdit={() => setScreen({ name: 'form', trip: openTrip, isNew: false })}
          notify={setToast}
        />
      )}
      </ErrorBoundary>
      {!saved && <p className="notice">{t('app.notSaving')}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
