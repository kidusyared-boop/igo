import type { ReactNode } from 'react';
import { CountryIcon, DaysIcon, PrepIcon, SpotsIcon } from '../../components/ui/Icons';
import { useT } from '../../i18n';

export type TripTab = 'days' | 'before' | 'spots' | 'country';

const TABS: { id: TripTab; icon: ReactNode }[] = [
  { id: 'days', icon: <DaysIcon /> },
  { id: 'before', icon: <PrepIcon /> },
  { id: 'spots', icon: <SpotsIcon /> },
  { id: 'country', icon: <CountryIcon /> },
];

export function TabBar({ tab, onChange }: { tab: TripTab; onChange: (t: TripTab) => void }) {
  const t = useT();
  return (
    <nav className="tabbar" aria-label={t('tabs.label')}>
      <div className="tabbar-inner">
        {TABS.map((item) => (
          <button key={item.id} type="button" aria-current={item.id === tab ? 'page' : undefined} onClick={() => onChange(item.id)}>
            {item.icon}
            {t(`tabs.${item.id}`)}
          </button>
        ))}
      </div>
    </nav>
  );
}
