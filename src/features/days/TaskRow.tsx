import type { Task } from '../../types';
import { useT } from '../../i18n';
import { LinkText } from '../../components/ui/LinkText';
import { PencilIcon } from '../../components/ui/Icons';
import { Directions } from '../places/Directions';

interface TaskRowProps {
  task: Task;
  done: boolean;
  /** Converts a time to the local clock, e.g. Ethiopian time. */
  localClock?: (hhmm: string) => string;
  onToggle: () => void;
  /** Opens the sheet to change, move or remove the task. */
  onOpen: () => void;
  /** Leave out the time column, as in the prep list where nothing has a time. */
  timeless?: boolean;
}

export function TaskRow({ task, done, localClock, onToggle, onOpen, timeless = false }: TaskRowProps) {
  const t = useT();
  const checkId = `chk-${task.id}`;
  return (
    <li className={`task${done ? ' done' : ''}${timeless ? ' untimed' : ''}`}>
      {!timeless && (
        <span className="time">
          {task.time ?? '—'}
          {task.time && localClock && <small title={t('task.localTime')}>{localClock(task.time)}</small>}
        </span>
      )}
      <input id={checkId} type="checkbox" checked={done} onChange={onToggle} />
      <label htmlFor={checkId} className="body">
        <span className={`cat cat-${task.category}`}>{t(`category.${task.category}`)}</span>
        <span className="title">{task.title}</span>
        {task.detail && <span className="detail"><LinkText text={task.detail} /></span>}
        {task.map && <Directions query={task.map} place={task.title} />}
      </label>
      <button type="button" className="icon-btn" onClick={onOpen} aria-label={t('task.editNamed', { title: task.title })} title={t('common.edit')}>
        <PencilIcon />
      </button>
    </li>
  );
}
