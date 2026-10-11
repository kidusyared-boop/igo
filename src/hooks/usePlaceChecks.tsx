import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchPlaceChecks, loadCachedChecks, type PlaceCheck } from '../services/placeChecks';

interface PlaceChecksValue {
  checks: Map<string, PlaceCheck>;
  refresh: () => Promise<void>;
}

const PlaceChecksContext = createContext<PlaceChecksValue>({ checks: new Map(), refresh: async () => {} });

export function PlaceChecksProvider({ children }: { children: ReactNode }) {
  const [checks, setChecks] = useState<Map<string, PlaceCheck>>(loadCachedChecks);
  const refresh = useCallback(async () => setChecks(await fetchPlaceChecks()), []);
  useEffect(() => {
    void refresh();
    const onOnline = () => void refresh();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refresh]);
  return <PlaceChecksContext.Provider value={{ checks, refresh }}>{children}</PlaceChecksContext.Provider>;
}

export function usePlaceChecks(): PlaceChecksValue {
  return useContext(PlaceChecksContext);
}
