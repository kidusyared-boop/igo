import type { Budget, Diet, Mobility } from '../../types';
import { BUDGETS, DIETS } from '../planner/preferences';

interface PreferencePickerProps {
  budget: Budget;
  diets: Diet[];
  mobility: Mobility;
  withKids: boolean;
  onBudget: (budget: Budget) => void;
  onDiets: (diets: Diet[]) => void;
  onMobility: (mobility: Mobility) => void;
  onKids: (withKids: boolean) => void;
}

export function PreferencePicker({ budget, diets, mobility, withKids, onBudget, onDiets, onMobility, onKids }: PreferencePickerProps) {
  const toggle = (d: Diet) => onDiets(diets.includes(d) ? diets.filter((x) => x !== d) : [...diets, d]);
  return (
    <>
      <div className="field">
        <span className="label">Budget</span>
        <div className="segmented" role="group" aria-label="Budget">
          {BUDGETS.map((b) => (
            <button key={b.value} type="button" aria-pressed={b.value === budget} onClick={() => onBudget(b.value)}>
              {b.label}
            </button>
          ))}
        </div>
        <span className="hint">{BUDGETS.find((b) => b.value === budget)?.hint}</span>
      </div>
      <div className="field">
        <span className="label">How do you eat?</span>
        <span className="hint">igo only suggests restaurants that serve this, and adds tips for ordering.</span>
        <div className="interest-grid" role="group" aria-label="Diet">
          {DIETS.map((d) => (
            <button key={d.value} type="button" className="interest" aria-pressed={diets.includes(d.value)} onClick={() => toggle(d.value)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <label className="check" htmlFor="trip-mobility">
        <input id="trip-mobility" type="checkbox" checked={mobility === 'limited'} onChange={(e) => onMobility(e.target.checked ? 'limited' : 'full')} />
        Keep it easy on my body: no steep climbs or long hikes
      </label>
      <label className="check" htmlFor="trip-kids">
        <input id="trip-kids" type="checkbox" checked={withKids} onChange={(e) => onKids(e.target.checked)} />
        I'm traveling with young children
      </label>
    </>
  );
}
