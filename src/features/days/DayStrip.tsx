import type { DayPlan } from '../../types';
import { useT } from '../../i18n';

interface DayStripProps {
  days: DayPlan[];
  selected: string;
  doneIds: Set<string>;
  onSelect: (date: string) => void;
}

export function DayStrip({ days, selected, doneIds, onSelect }: DayStripProps) {
  const t = useT();
  return (
    <div className="day-strip" role="tablist" aria-label={t('days.strip')}>
      {days.map((d) => {
        const done = d.tasks.filter((task) => doneIds.has(task.id)).length;
        const pct = d.tasks.length ? Math.round((done / d.tasks.length) * 100) : 0;
        const dt = new Date(`${d.date}T12:00:00Z`);
        return (
          <button key={d.date} type="button" role="tab" className="day-pill" aria-pressed={d.date === selected} aria-selected={d.date === selected} onClick={() => onSelect(d.date)}>
            <span className="dow">{dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>
            <span className="num">{dt.getUTCDate()}</span>
            <span className="bar" aria-label={t('days.pctDone', { pct })}><i style={{ width: `${pct}%` }} /></span>
          </button>
        );
      })}
    </div>
  );
}
