import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchPlaceChecks, type PlaceCheck } from '../services/placeChecks';

interface PlaceChecksValue {
  checks: Map<string, PlaceCheck>;
  refresh: () => Promise<void>;
}

const PlaceChecksContext = createContext<PlaceChecksValue>({ checks: new Map(), refresh: async () => {} });

export function PlaceChecksProvider({ children }: { children: ReactNode }) {
  const [checks, setChecks] = useState<Map<string, PlaceCheck>>(new Map());
  const refresh = useCallback(async () => setChecks(await fetchPlaceChecks()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return <PlaceChecksContext.Provider value={{ checks, refresh }}>{children}</PlaceChecksContext.Provider>;
}

export function usePlaceChecks(): PlaceChecksValue {
  return useContext(PlaceChecksContext);
}
