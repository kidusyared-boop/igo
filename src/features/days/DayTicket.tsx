import type { DayPlan } from '../../types';
import { formatDay, shiftTime } from '../../utils/dates';

interface DayTicketProps {
  day: DayPlan;
  index: number;
  cityName: string;
  done: number;
  localDate?: string;
}

const KIND: Record<DayPlan['kind'], string> = { arrival: 'Arrival', full: 'Full day', departure: 'Departure', single: 'Day trip' };
const NOTE_LABEL: Record<DayPlan['notes'][number]['kind'], string> = { holiday: 'Holiday', fasting: 'Fasting', safety: 'Safety', move: 'Travel' };

export function DayTicket({ day, index, cityName, done, localDate }: DayTicketProps) {
  return (
    <>
      <div className="ticket">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="eyebrow">Day {index + 1} · {day.movedFrom ? 'Travel day' : KIND[day.kind]} · {cityName}</span>
          <h2>{formatDay(day.date)}</h2>
          {localDate && <span className="local">{localDate}</span>}
        </div>
        <div className="progress mono">
          {done}/{day.tasks.length}
          <small>done</small>
        </div>
        <div className="sun">
          <div><span className="eyebrow">Sunrise</span><b>{day.sun?.sunrise ?? '--:--'}</b></div>
          <div><span className="eyebrow">Sunset</span><b>{day.sun?.sunset ?? '--:--'}</b></div>
          <div><span className="eyebrow">Golden hour</span><b>{day.sun ? shiftTime(day.sun.sunset, -60) : '--:--'}</b></div>
        </div>
      </div>
      {day.notes.length > 0 && (
        <div className="notes">
          {day.notes.map((n) => (
            <div key={n.text} className={`note note-${n.kind}`}>
              <b>{NOTE_LABEL[n.kind]}</b>
              <span>{n.text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
