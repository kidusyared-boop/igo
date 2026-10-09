import { useState } from 'react';
import { LanguageSwitch } from '../../components/ui/LanguageSwitch';
import { useT } from '../../i18n';

interface TripMenuProps {
  hiddenCount: number;
  onEdit: () => void;
  onExport: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

export function TripMenu({ hiddenCount, onEdit, onExport, onRestore, onDelete }: TripMenuProps) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="panel">
      <div className="row">
        <button type="button" className="btn small" onClick={onEdit}>{t('form.edit')}</button>
        <button type="button" className="btn small" onClick={onExport}>{t('menu.export')}</button>
        {hiddenCount > 0 && <button type="button" className="btn small" onClick={onRestore}>{t('menu.showHidden', { n: hiddenCount })}</button>}
        {!confirming && <button type="button" className="btn small danger" onClick={() => setConfirming(true)}>{t('menu.delete')}</button>}
      </div>
      {confirming && (
        <div className="row">
          <span>{t('menu.confirm')}</span>
          <button type="button" className="btn small danger" onClick={onDelete}>{t('common.delete')}</button>
          <button type="button" className="btn small ghost" onClick={() => setConfirming(false)}>{t('menu.keep')}</button>
        </div>
      )}
      <LanguageSwitch />
    </div>
  );
}
