import type { Task } from '../../types';
import { daysBetween, formatDay } from '../../utils/dates';
import { AddTaskForm } from './AddTaskForm';
import { TaskRow } from './TaskRow';
import { useT } from '../../i18n';

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
  const t = useT();
  const groups = new Map<string, Task[]>();
  for (const task of tasks) groups.set(task.date, [...(groups.get(task.date) ?? []), task]);
  const done = tasks.filter((task) => doneIds.has(task.id)).length;

  return (
    <div className="section">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{t('pre.title')}</h2>
        <span className="mono muted">{t('pre.done', { done, total: tasks.length })}</span>
      </div>
      {[...groups.entries()].map(([date, list]) => (
        <div key={date}>
          <div className="date-head">{formatDay(date)} · {t('pre.daysBefore', { n: daysBetween(date, startDate) })}</div>
          <ul className="task-list">
            {list.map((task) => (
              <TaskRow key={task.id} task={task} done={doneIds.has(task.id)} onToggle={() => onToggle(task.id)} onRemove={() => onRemove(task)} />
            ))}
          </ul>
        </div>
      ))}
      <AddTaskForm date={addDate} formId="add-pre" onAdd={onAdd} />
    </div>
  );
}
