import type { EntryDoc } from '../../types';
import { ENTRY_DOCS } from '../planner/diaspora';

interface DiasporaPickerProps {
  diaspora: boolean;
  entryDoc: EntryDoc;
  familyTime: boolean;
  onDiaspora: (diaspora: boolean) => void;
  onEntryDoc: (entryDoc: EntryDoc) => void;
  onFamilyTime: (familyTime: boolean) => void;
}

export function DiasporaPicker({ diaspora, entryDoc, familyTime, onDiaspora, onEntryDoc, onFamilyTime }: DiasporaPickerProps) {
  return (
    <>
      <label className="check" htmlFor="trip-diaspora">
        <input id="trip-diaspora" type="checkbox" checked={diaspora} onChange={(e) => onDiaspora(e.target.checked)} />
        I'm Ethiopian or of Ethiopian origin, visiting home
      </label>
      {diaspora && (
        <>
          <div className="field">
            <span className="label">How you enter Ethiopia</span>
            <div className="segmented" role="group" aria-label="How you enter Ethiopia">
              {ENTRY_DOCS.map((d) => (
                <button key={d.value} type="button" aria-pressed={d.value === entryDoc} onClick={() => onEntryDoc(d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
            <span className="hint">{ENTRY_DOCS.find((d) => d.value === entryDoc)?.hint}</span>
          </div>
          <label className="check" htmlFor="trip-family">
            <input id="trip-family" type="checkbox" checked={familyTime} onChange={(e) => onFamilyTime(e.target.checked)} />
            Keep afternoons free for family
          </label>
        </>
      )}
    </>
  );
}
