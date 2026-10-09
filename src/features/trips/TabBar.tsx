import type { ReactNode } from 'react';
import { CountryIcon, DaysIcon, PrepIcon, SpotsIcon } from '../../components/ui/Icons';

export type TripTab = 'days' | 'before' | 'spots' | 'country';

const TABS: { id: TripTab; label: string; icon: ReactNode }[] = [
  { id: 'days', label: 'Days', icon: <DaysIcon /> },
  { id: 'before', label: 'Before you go', icon: <PrepIcon /> },
  { id: 'spots', label: 'Places', icon: <SpotsIcon /> },
  { id: 'country', label: 'Country', icon: <CountryIcon /> },
];

export function TabBar({ tab, onChange }: { tab: TripTab; onChange: (t: TripTab) => void }) {
  return (
    <nav className="tabbar" aria-label="Trip sections">
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-current={t.id === tab ? 'page' : undefined} onClick={() => onChange(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
