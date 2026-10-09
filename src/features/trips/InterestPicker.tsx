import type { Interest, Pace } from '../../types';
import { INTERESTS, PACES } from '../planner/personalize';

interface InterestPickerProps {
  interests: Interest[];
  pace: Pace;
  onInterests: (interests: Interest[]) => void;
  onPace: (pace: Pace) => void;
}

export function InterestPicker({ interests, pace, onInterests, onPace }: InterestPickerProps) {
  const toggle = (i: Interest) => onInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i]);
  return (
    <>
      <div className="field">
        <span className="label">What do you enjoy?</span>
        <span className="hint">igo picks places and restaurants that match. Choose city life without countryside to stay in town.</span>
        <div className="interest-grid" role="group" aria-label="Interests">
          {INTERESTS.map((i) => (
            <button key={i.value} type="button" className="interest" aria-pressed={interests.includes(i.value)} onClick={() => toggle(i.value)}>
              {i.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Pace</span>
        <div className="segmented" role="group" aria-label="Pace">
          {PACES.map((p) => (
            <button key={p.value} type="button" aria-pressed={p.value === pace} onClick={() => onPace(p.value)} title={p.hint}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="hint">{PACES.find((p) => p.value === pace)?.hint} on full days, fewer on travel days.</span>
      </div>
    </>
  );
}
