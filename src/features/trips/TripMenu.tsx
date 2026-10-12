import { useEffect, useState } from 'react';
import { LanguageSwitch } from '../../components/ui/LanguageSwitch';
import { useT } from '../../i18n';
import { ReminderMenuItem } from '../reminders/ReminderControls';

interface TripMenuProps {
  title: string;
  hiddenCount: number;
  onClose: () => void;
  onEdit: () => void;
  onExport: () => void;
  onRestore: () => void;
  onDelete: () => void;
  notify: (message: string) => void;
}

/** Trip actions in a bottom sheet. Tapping outside it or pressing Escape closes it. */
export function TripMenu({ title, hiddenCount, onClose, onEdit, onExport, onRestore, onDelete, notify }: TripMenuProps) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const then = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h3>{title}</h3>
        {!confirming && (
          <div className="menu-list">
            <button type="button" className="menu-item" onClick={onEdit}>{t('form.edit')}</button>
            <button type="button" className="menu-item" onClick={then(onExport)}>{t('menu.export')}</button>
            <ReminderMenuItem notify={notify} after={onClose} />
            {hiddenCount > 0 && <button type="button" className="menu-item" onClick={then(onRestore)}>{t('menu.showHidden', { n: hiddenCount })}</button>}
            <button type="button" className="menu-item danger" onClick={() => setConfirming(true)}>{t('menu.delete')}</button>
          </div>
        )}
        {confirming && (
          <div className="menu-confirm">
            <span>{t('menu.confirm')}</span>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setConfirming(false)}>{t('menu.keep')}</button>
              <button type="button" className="btn danger" onClick={onDelete}>{t('common.delete')}</button>
            </div>
          </div>
        )}
        <LanguageSwitch />
      </div>
    </div>
  );
}
