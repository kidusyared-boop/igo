import { useState } from 'react';

interface TripMenuProps {
  hiddenCount: number;
  onEdit: () => void;
  onExport: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

export function TripMenu({ hiddenCount, onEdit, onExport, onRestore, onDelete }: TripMenuProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="panel">
      <div className="row">
        <button type="button" className="btn small" onClick={onEdit}>Edit trip</button>
        <button type="button" className="btn small" onClick={onExport}>Export to calendar (.ics)</button>
        {hiddenCount > 0 && <button type="button" className="btn small" onClick={onRestore}>Show {hiddenCount} hidden</button>}
        {!confirming && <button type="button" className="btn small danger" onClick={() => setConfirming(true)}>Delete trip</button>}
      </div>
      {confirming && (
        <div className="row">
          <span>Delete this trip and its checklist?</span>
          <button type="button" className="btn small danger" onClick={onDelete}>Delete</button>
          <button type="button" className="btn small ghost" onClick={() => setConfirming(false)}>Keep it</button>
        </div>
      )}
    </div>
  );
}
