import type { Interest, Pace } from '../../types';
import { INTERESTS, PACES } from '../planner/personalize';
import { useT } from '../../i18n';

interface InterestPickerProps {
  interests: Interest[];
  pace: Pace;
  onInterests: (interests: Interest[]) => void;
  onPace: (pace: Pace) => void;
}

export function InterestPicker({ interests, pace, onInterests, onPace }: InterestPickerProps) {
  const t = useT();
  const toggle = (i: Interest) => onInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i]);
  return (
    <>
      <div className="field">
        <span className="label">{t('interests.label')}</span>
        <span className="hint">{t('interests.hint')}</span>
        <div className="interest-grid" role="group" aria-label={t('interests.group')}>
          {INTERESTS.map((i) => (
            <button key={i.value} type="button" className="interest" aria-pressed={interests.includes(i.value)} onClick={() => toggle(i.value)}>
              {t(`interest.${i.value}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">{t('pace.label')}</span>
        <div className="segmented" role="group" aria-label={t('pace.label')}>
          {PACES.map((p) => (
            <button key={p.value} type="button" aria-pressed={p.value === pace} onClick={() => onPace(p.value)} title={t(`pace.${p.value}.hint`)}>
              {t(`pace.${p.value}`)}
            </button>
          ))}
        </div>
        <span className="hint">{t('pace.detail', { hint: t(`pace.${pace}.hint`) })}</span>
      </div>
    </>
  );
}
