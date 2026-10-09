import type { Task } from '../../types';
import { daysBetween, formatDay } from '../../utils/dates';
import { AddTaskForm } from './AddTaskForm';
import { TaskRow } from './TaskRow';

interface PreTripViewProps {
  tasks: Task[];
  startDate: string;
  doneIds: Set<string>;
  onToggle: (taskId: string) => void;
  onRemove: (task: Task) => void;
  onAdd: (task: Task) => void;
  addDate: string;
}

export function PreTripView({ tasks, startDate, doneIds, onToggle, onRemove, onAdd, addDate }: PreTripViewProps) {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);
  const done = tasks.filter((t) => doneIds.has(t.id)).length;

  return (
    <div className="section">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Before you go</h2>
        <span className="mono muted">{done}/{tasks.length} done</span>
      </div>
      {[...groups.entries()].map(([date, list]) => (
        <div key={date}>
          <div className="date-head">{formatDay(date)} · {daysBetween(date, startDate)} days before</div>
          <ul className="task-list">
            {list.map((t) => (
              <TaskRow key={t.id} task={t} done={doneIds.has(t.id)} onToggle={() => onToggle(t.id)} onRemove={() => onRemove(t)} />
            ))}
          </ul>
        </div>
      ))}
      <AddTaskForm date={addDate} formId="add-pre" onAdd={onAdd} />
    </div>
  );
}
