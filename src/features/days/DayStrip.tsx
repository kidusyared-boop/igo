import type { DayPlan } from '../../types';

interface DayStripProps {
  days: DayPlan[];
  selected: string;
  doneIds: Set<string>;
  onSelect: (date: string) => void;
}

export function DayStrip({ days, selected, doneIds, onSelect }: DayStripProps) {
  return (
    <div className="day-strip" role="tablist" aria-label="Trip days">
      {days.map((d) => {
        const done = d.tasks.filter((t) => doneIds.has(t.id)).length;
        const pct = d.tasks.length ? Math.round((done / d.tasks.length) * 100) : 0;
        const dt = new Date(`${d.date}T12:00:00Z`);
        return (
          <button key={d.date} type="button" role="tab" className="day-pill" aria-pressed={d.date === selected} aria-selected={d.date === selected} onClick={() => onSelect(d.date)}>
            <span className="dow">{dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>
            <span className="num">{dt.getUTCDate()}</span>
            <span className="bar" aria-label={`${pct}% done`}><i style={{ width: `${pct}%` }} /></span>
          </button>
        );
      })}
    </div>
  );
}
