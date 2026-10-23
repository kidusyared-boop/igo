import { useEffect, useState, type FormEvent } from 'react';
import type { Task, TaskCategory } from '../../types';
import { Field } from '../../components/ui/Field';
import { followsFlight } from '../planner/taskEdits';
import { CATEGORIES } from './AddTaskForm';
import { useT } from '../../i18n';

interface TaskSheetProps {
  task: Task;
  /** Trip days the task can move to. Left out for prep tasks, which take any date before `latest`. */
  days?: { date: string; label: string }[];
  /** Last date a prep task can be due. */
  latest?: string;
  onSave: (edited: Task) => void;
  onRemove: () => void;
  onReset: () => void;
  onClose: () => void;
}

/** Change a task's wording, time, day, notes or category, or take it off the plan. */
export function TaskSheet({ task, days, latest, onSave, onRemove, onReset, onClose }: TaskSheetProps) {
  const t = useT();
  const [title, setTitle] = useState(task.title);
  const [time, setTime] = useState(task.time ?? '');
  const [date, setDate] = useState(task.date);
  const [detail, setDetail] = useState(task.detail ?? '');
  const [category, setCategory] = useState<TaskCategory>(task.category);
  const locked = followsFlight(task);
  const prep = !days;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const clean = title.trim();
  const dateOk = prep ? Boolean(date) && (!latest || date <= latest) : true;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!clean || !dateOk) return;
    onSave({
      id: task.id,
      source: task.source,
      ...(task.replaces ? { replaces: task.replaces } : {}),
      title: clean,
      date,
      category,
      ...(!prep && time ? { time } : {}),
      ...(detail.trim() ? { detail: detail.trim() } : {}),
    });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet task-sheet" role="dialog" aria-modal="true" aria-label={t('edit.title')} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-handle" aria-hidden="true" />
        <h3>{t('edit.title')}</h3>
        <Field id="edit-title" label={t('task.task')}>
          <input id="edit-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {prep ? (
          <Field id="edit-date" label={t('edit.due')}>
            <input id="edit-date" type="date" className="input" value={date} max={latest} onChange={(e) => setDate(e.target.value)} />
          </Field>
        ) : (
          <div className="task-sheet-when">
            <Field id="edit-day" label={t('edit.day')}>
              <select id="edit-day" className="select" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)}>
                {days.map((d) => <option key={d.date} value={d.date}>{d.label}</option>)}
              </select>
            </Field>
            <Field id="edit-time" label={t('task.time')}>
              <input id="edit-time" type="time" className="input" value={time} disabled={locked} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
        )}
        {locked && <p className="hint">{t('edit.flightHint')}</p>}
        {!prep && !locked && !time && <p className="hint">{t('edit.noTime')}</p>}
        <Field id="edit-detail" label={t('edit.notes')}>
          <textarea id="edit-detail" className="textarea" value={detail} onChange={(e) => setDetail(e.target.value)} />
        </Field>
        <Field id="edit-cat" label={t('task.category')}>
          <select id="edit-cat" className="select" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
          </select>
        </Field>
        <div className="row task-sheet-actions">
          <button type="button" className="btn ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn primary" disabled={!clean || !dateOk}>{t('edit.save')}</button>
        </div>
        <div className="menu-list">
          {task.replaces && <button type="button" className="menu-item" onClick={onReset}>{t('edit.reset')}</button>}
          <button type="button" className="menu-item danger" onClick={onRemove}>
            {t(task.source === 'user' ? 'edit.delete' : 'edit.hide')}
          </button>
        </div>
      </form>
    </div>
  );
}
