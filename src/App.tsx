import { useEffect, useState } from 'react';
import type { Trip } from './types';
import { useTrips } from './hooks/useTrips';
import { useSync } from './hooks/useSync';
import { AccountPanel } from './features/account/AccountPanel';
import { TripList } from './features/trips/TripList';
import { TripForm } from './features/trips/TripForm';
import { TripView } from './features/trips/TripView';
import { blankTrip } from './features/trips/tripDraft';

type Screen = { name: 'list' } | { name: 'trip'; id: string } | { name: 'form'; trip: Trip; isNew: boolean };

export function App() {
  const { trips, tombstones, dispatch, saved } = useTrips();
  const sync = useSync(trips, tombstones, dispatch);
  const [screen, setScreen] = useState<Screen>(() => (trips.length === 1 && trips[0] ? { name: 'trip', id: trips[0].id } : { name: 'list' }));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const openTrip = screen.name === 'trip' ? trips.find((t) => t.id === screen.id) : undefined;

  return (
    <div className="app">
      {screen.name !== 'trip' && (
        <header className="topbar">
          <span className="brand">i<span>go</span></span>
          <span className="eyebrow" style={{ marginLeft: 'auto' }}>Daily plans for Ethiopia trips</span>
        </header>
      )}
      {screen.name === 'list' && <AccountPanel sync={sync.state} onSyncNow={() => void sync.syncNow()} />}
      {screen.name === 'list' && (
        <TripList trips={trips} onOpen={(id) => setScreen({ name: 'trip', id })} onNew={() => setScreen({ name: 'form', trip: blankTrip(), isNew: true })} />
      )}
      {screen.name === 'form' && (
        <TripForm
          initial={screen.trip}
          isNew={screen.isNew}
          onCancel={() => setScreen(screen.isNew ? { name: 'list' } : { name: 'trip', id: screen.trip.id })}
          onSave={(trip) => { dispatch({ type: 'upsert', trip }); setScreen({ name: 'trip', id: trip.id }); }}
        />
      )}
      {screen.name === 'trip' && openTrip && (
        <TripView
          key={openTrip.id}
          trip={openTrip}
          dispatch={dispatch}
          onBack={() => setScreen({ name: 'list' })}
          onEdit={() => setScreen({ name: 'form', trip: openTrip, isNew: false })}
          notify={setToast}
        />
      )}
      {screen.name === 'trip' && !openTrip && <TripList trips={trips} onOpen={(id) => setScreen({ name: 'trip', id })} onNew={() => setScreen({ name: 'form', trip: blankTrip(), isNew: true })} />}
      {!saved && <p className="notice">This browser is not saving data. Your changes last until you close the page.</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
