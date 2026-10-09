import type { EntryDoc } from '../../types';
import { ENTRY_DOCS } from '../planner/diaspora';
import { useT } from '../../i18n';

interface DiasporaPickerProps {
  diaspora: boolean;
  entryDoc: EntryDoc;
  familyTime: boolean;
  onDiaspora: (diaspora: boolean) => void;
  onEntryDoc: (entryDoc: EntryDoc) => void;
  onFamilyTime: (familyTime: boolean) => void;
}

export function DiasporaPicker({ diaspora, entryDoc, familyTime, onDiaspora, onEntryDoc, onFamilyTime }: DiasporaPickerProps) {
  const t = useT();
  return (
    <>
      <label className="check" htmlFor="trip-diaspora">
        <input id="trip-diaspora" type="checkbox" checked={diaspora} onChange={(e) => onDiaspora(e.target.checked)} />
        {t('diaspora.check')}
      </label>
      {diaspora && (
        <>
          <div className="field">
            <span className="label">{t('diaspora.entry')}</span>
            <div className="segmented" role="group" aria-label={t('diaspora.entry')}>
              {ENTRY_DOCS.map((d) => (
                <button key={d.value} type="button" aria-pressed={d.value === entryDoc} onClick={() => onEntryDoc(d.value)}>
                  {t(`entryDoc.${d.value}`)}
                </button>
              ))}
            </div>
            <span className="hint">{t(`entryDoc.${entryDoc}.hint`)}</span>
          </div>
          <label className="check" htmlFor="trip-family">
            <input id="trip-family" type="checkbox" checked={familyTime} onChange={(e) => onFamilyTime(e.target.checked)} />
            {t('diaspora.family')}
          </label>
        </>
      )}
    </>
  );
}
