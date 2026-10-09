import type { Budget, Diet, Mobility } from '../../types';
import { BUDGETS, DIETS } from '../planner/preferences';
import { useT } from '../../i18n';

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
  const t = useT();
  const toggle = (d: Diet) => onDiets(diets.includes(d) ? diets.filter((x) => x !== d) : [...diets, d]);
  return (
    <>
      <div className="field">
        <span className="label">{t('budget.label')}</span>
        <div className="segmented" role="group" aria-label={t('budget.label')}>
          {BUDGETS.map((b) => (
            <button key={b.value} type="button" aria-pressed={b.value === budget} onClick={() => onBudget(b.value)}>
              {t(`budget.${b.value}`)}
            </button>
          ))}
        </div>
        <span className="hint">{t(`budget.${budget}.hint`)}</span>
      </div>
      <div className="field">
        <span className="label">{t('diet.label')}</span>
        <span className="hint">{t('diet.hint')}</span>
        <div className="interest-grid" role="group" aria-label={t('diet.group')}>
          {DIETS.map((d) => (
            <button key={d.value} type="button" className="interest" aria-pressed={diets.includes(d.value)} onClick={() => toggle(d.value)}>
              {t(`diet.${d.value}`)}
            </button>
          ))}
        </div>
      </div>
      <label className="check" htmlFor="trip-mobility">
        <input id="trip-mobility" type="checkbox" checked={mobility === 'limited'} onChange={(e) => onMobility(e.target.checked ? 'limited' : 'full')} />
        {t('prefs.mobility')}
      </label>
      <label className="check" htmlFor="trip-kids">
        <input id="trip-kids" type="checkbox" checked={withKids} onChange={(e) => onKids(e.target.checked)} />
        {t('prefs.kids')}
      </label>
    </>
  );
}
