import { useState, type FormEvent } from 'react';
import type { Task, TaskCategory } from '../../types';
import { newId } from '../../utils/id';

interface AddTaskFormProps {
  date: string;
  formId: string;
  onAdd: (task: Task) => void;
}

const CATEGORIES: TaskCategory[] = ['explore', 'food', 'logistics', 'shoot', 'edit', 'post', 'rest', 'prep'];

export function AddTaskForm({ date, formId, onAdd }: AddTaskFormProps) {
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
    <form className="add-task" onSubmit={submit} aria-label="Add a task">
      <input id={`${formId}-time`} aria-label="Time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
      <input id={`${formId}-title`} aria-label="Task" className="input" placeholder="Add a task" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="wide row">
        <select id={`${formId}-cat`} aria-label="Category" className="select" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c[0]?.toUpperCase() + c.slice(1)}</option>)}
        </select>
        <button type="submit" className="btn" disabled={!title.trim()}>Add</button>
      </div>
    </form>
  );
}
