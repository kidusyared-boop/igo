import type { DayPlan, Task } from '../../types';
import { AddTaskForm } from './AddTaskForm';
import { DayTicket } from './DayTicket';
import { TaskRow } from './TaskRow';

interface DayViewProps {
  day: DayPlan;
  index: number;
  cityName: string;
  localClock?: (hhmm: string) => string;
  localDate?: string;
  doneIds: Set<string>;
  onToggle: (taskId: string) => void;
  onRemove: (task: Task) => void;
  onAdd: (task: Task) => void;
}

export function DayView({ day, index, cityName, localClock, localDate, doneIds, onToggle, onRemove, onAdd }: DayViewProps) {
  const done = day.tasks.filter((t) => doneIds.has(t.id)).length;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <DayTicket day={day} index={index} cityName={cityName} done={done} localDate={localDate} />
      <ul className="task-list">
        {day.tasks.map((t) => (
          <TaskRow key={t.id} task={t} localClock={localClock} done={doneIds.has(t.id)} onToggle={() => onToggle(t.id)} onRemove={() => onRemove(t)} />
        ))}
      </ul>
      <AddTaskForm date={day.date} formId={`add-${day.date}`} onAdd={onAdd} />
    </div>
  );
}
