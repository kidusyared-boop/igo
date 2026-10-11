import { useEffect, useLayoutEffect, useState } from 'react';
import type { Trip } from './types';
import { useTrips } from './hooks/useTrips';
import { useSync } from './hooks/useSync';
import { AccountPanel } from './features/account/AccountPanel';
import { TripList } from './features/trips/TripList';
import { TripForm } from './features/trips/TripForm';
import { TripView } from './features/trips/TripView';
import { blankTrip } from './features/trips/tripDraft';
import { LanguageSwitch } from './components/ui/LanguageSwitch';
import { useT } from './i18n';
import { ReviewView } from './features/review/ReviewView';
import { isReviewer } from './services/placeChecks';

type Screen = { name: 'list' } | { name: 'review' } | { name: 'trip'; id: string } | { name: 'form'; trip: Trip; isNew: boolean };

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
  useLayoutEffect(() => window.scrollTo(0, 0), [screen]);

  const openTrip = screen.name === 'trip' ? trips.find((t) => t.id === screen.id) : undefined;

  return (
    <div className="app">
      {screen.name !== 'trip' && screen.name !== 'form' && (
        <header className="topbar">
          <span className="brand">i<span>go</span></span>
          <span className="eyebrow tagline">{t('app.tagline')}</span>
          <LanguageSwitch />
        </header>
      )}
      {screen.name === 'list' && <AccountPanel sync={sync.state} onSyncNow={() => void sync.syncNow()} onReview={reviewer ? () => setScreen({ name: 'review' }) : undefined} />}
      {screen.name === 'review' && <ReviewView onBack={() => setScreen({ name: 'list' })} notify={setToast} />}
      {screen.name === 'list' && (
        <TripList trips={trips} onOpen={(id) => setScreen({ name: 'trip', id })} onNew={() => setScreen({ name: 'form', trip: blankTrip(), isNew: true })} />
      )}
      {screen.name === 'form' && (
        <TripForm
          initial={screen.trip}
          isNew={screen.isNew}
          onCancel={() => setScreen(screen.isNew ? { name: 'list' } : { name: 'trip', id: screen.trip.id })}
          onSave={(trip) => { dispatch({ type: 'upsert', trip }); if (screen.isNew) setFresh(trip.id); setScreen({ name: 'trip', id: trip.id }); }}
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
      {screen.name === 'trip' && !openTrip && <TripList trips={trips} onOpen={(id) => setScreen({ name: 'trip', id })} onNew={() => setScreen({ name: 'form', trip: blankTrip(), isNew: true })} />}
      {!saved && <p className="notice">{t('app.notSaving')}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
