import { useState, type FormEvent } from 'react';
import type { Task, TaskCategory } from '../../types';
import { newId } from '../../utils/id';
import { useT } from '../../i18n';

interface AddTaskFormProps {
  date: string;
  formId: string;
  onAdd: (task: Task) => void;
}

const CATEGORIES: TaskCategory[] = ['explore', 'food', 'logistics', 'shoot', 'edit', 'post', 'rest', 'prep'];

export function AddTaskForm({ date, formId, onAdd }: AddTaskFormProps) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<TaskCategory>('explore');

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onAdd({ id: newId('task'), date, title: clean, time: time || undefined, category, source: 'user' });
    setTitle('');
    setTime('');
  }

  return (
    <form className="add-task" onSubmit={submit} aria-label={t('task.add')}>
      <input id={`${formId}-time`} aria-label={t('task.time')} type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
      <input id={`${formId}-title`} aria-label={t('task.task')} className="input" placeholder={t('task.add')} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="wide row">
        <select id={`${formId}-cat`} aria-label={t('task.category')} className="select" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
        </select>
        <button type="submit" className="btn" disabled={!title.trim()}>{t('common.add')}</button>
      </div>
    </form>
  );
}
