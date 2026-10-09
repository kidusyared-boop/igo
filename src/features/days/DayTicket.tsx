import type { DayPlan } from '../../types';
import { formatDay, shiftTime } from '../../utils/dates';
import { useT } from '../../i18n';

interface DayTicketProps {
  day: DayPlan;
  index: number;
  cityName: string;
  done: number;
  localDate?: string;
}

export function DayTicket({ day, index, cityName, done, localDate }: DayTicketProps) {
  const t = useT();
  return (
    <>
      <div className="ticket">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="eyebrow">{t('day.number', { n: index + 1 })} · {day.movedFrom ? t('day.travel') : t(`dayKind.${day.kind}`)} · {cityName}</span>
          <h2>{formatDay(day.date)}</h2>
          {localDate && <span className="local">{localDate}</span>}
        </div>
        <div className="progress mono">
          {done}/{day.tasks.length}
          <small>{t('day.done')}</small>
        </div>
        <div className="sun">
          <div><span className="eyebrow">{t('sun.sunrise')}</span><b>{day.sun?.sunrise ?? '--:--'}</b></div>
          <div><span className="eyebrow">{t('sun.sunset')}</span><b>{day.sun?.sunset ?? '--:--'}</b></div>
          <div><span className="eyebrow">{t('sun.golden')}</span><b>{day.sun ? shiftTime(day.sun.sunset, -60) : '--:--'}</b></div>
        </div>
      </div>
      {day.notes.length > 0 && (
        <div className="notes">
          {day.notes.map((n) => (
            <div key={n.text} className={`note note-${n.kind}`}>
              <b>{t(`note.${n.kind}`)}</b>
              <span>{n.text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
