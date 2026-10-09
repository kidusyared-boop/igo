import type { Task } from '../../types';

interface TaskRowProps {
  task: Task;
  done: boolean;
  /** Converts a time to the local clock, e.g. Ethiopian time. */
  localClock?: (hhmm: string) => string;
  onToggle: () => void;
  onRemove: () => void;
}

const CATEGORY_LABEL: Record<Task['category'], string> = {
  prep: 'Prep', logistics: 'Logistics', shoot: 'Shoot', edit: 'Edit', post: 'Post', explore: 'Explore', food: 'Food', rest: 'Rest',
};

export function TaskRow({ task, done, localClock, onToggle, onRemove }: TaskRowProps) {
  const checkId = `chk-${task.id}`;
  return (
    <li className={`task${done ? ' done' : ''}`}>
      <span className="time">
        {task.time ?? '—'}
        {task.time && localClock && <small title="Ethiopian time">{localClock(task.time)}</small>}
      </span>
      <input id={checkId} type="checkbox" checked={done} onChange={onToggle} />
      <label htmlFor={checkId} className="body">
        <span className={`cat cat-${task.category}`}>{CATEGORY_LABEL[task.category]}</span>
        <span className="title">{task.title}</span>
        {task.detail && <span className="detail">{task.detail}</span>}
      </label>
      <button
        type="button"
        className="icon-btn"
        onClick={onRemove}
        aria-label={task.source === 'user' ? `Delete ${task.title}` : `Hide ${task.title}`}
        title={task.source === 'user' ? 'Delete' : 'Hide'}
      >
        ×
      </button>
    </li>
  );
}
