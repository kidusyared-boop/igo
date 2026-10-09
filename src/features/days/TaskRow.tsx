import type { Task } from '../../types';
import { useT } from '../../i18n';

interface TaskRowProps {
  task: Task;
  done: boolean;
  /** Converts a time to the local clock, e.g. Ethiopian time. */
  localClock?: (hhmm: string) => string;
  onToggle: () => void;
  onRemove: () => void;
}

export function TaskRow({ task, done, localClock, onToggle, onRemove }: TaskRowProps) {
  const t = useT();
  const checkId = `chk-${task.id}`;
  return (
    <li className={`task${done ? ' done' : ''}`}>
      <span className="time">
        {task.time ?? '—'}
        {task.time && localClock && <small title={t('task.localTime')}>{localClock(task.time)}</small>}
      </span>
      <input id={checkId} type="checkbox" checked={done} onChange={onToggle} />
      <label htmlFor={checkId} className="body">
        <span className={`cat cat-${task.category}`}>{t(`category.${task.category}`)}</span>
        <span className="title">{task.title}</span>
        {task.detail && <span className="detail">{task.detail}</span>}
      </label>
      <button
        type="button"
        className="icon-btn"
        onClick={onRemove}
        aria-label={t(task.source === 'user' ? 'task.deleteNamed' : 'task.hideNamed', { title: task.title })}
        title={t(task.source === 'user' ? 'common.delete' : 'common.hide')}
      >
        ×
      </button>
    </li>
  );
}
