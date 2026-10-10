import { useMemo, useState } from 'react';
import { COUNTRIES } from '../../data/countries';
import { usePlaceChecks } from '../../hooks/usePlaceChecks';
import { submitCheck, type Verdict } from '../../services/placeChecks';
import { placeKey } from '../planner/personalize';
import { formatDay } from '../../utils/dates';
import { useT, type TKey } from '../../i18n';

const LAST: Record<Verdict, TKey> = { ok: 'review.lastOk', fix: 'review.lastFix', gone: 'review.lastGone' };

interface ReviewViewProps {
  onBack: () => void;
  notify: (message: string) => void;
}

/** Where locals confirm, correct or flag catalogue places. Only people on the reviewers list can send. */
export function ReviewView({ onBack, notify }: ReviewViewProps) {
  const t = useT();
  const cities = COUNTRIES.flatMap((c) => c.cities);
  const [cityId, setCityId] = useState(cities[0]?.id ?? '');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { checks, refresh } = usePlaceChecks();

  const city = cities.find((c) => c.id === cityId);
  const places = useMemo(
    () => (city?.suggestedSpots ?? [])
      .map((p) => ({ place: p, key: placeKey(cityId, p.name) }))
      .filter(({ key }) => !onlyOpen || checks.get(key)?.verdict !== 'ok'),
    [city, cityId, onlyOpen, checks],
  );
  const done = (city?.suggestedSpots ?? []).filter((p) => checks.get(placeKey(cityId, p.name))?.verdict === 'ok').length;

  async function send(key: string, verdict: Verdict, text = '') {
    setBusy(key);
    const error = await submitCheck(key, verdict, text);
    setBusy(null);
    if (error) return notify(t('review.failed', { error }));
    setFixing(null);
    setNote('');
    await refresh();
    notify(t('review.saved'));
  }

  return (
    <div className="section stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{t('review.title')}</h2>
        <button type="button" className="btn small ghost" onClick={onBack}>{t('review.back')}</button>
      </div>
      <p className="muted" style={{ margin: 0 }}>{t('review.intro')}</p>
      <div className="grid-2">
        <label className="field" htmlFor="review-city">
          <span className="label">{t('review.city')}</span>
          <select id="review-city" className="select" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="check" htmlFor="review-open">
          <input id="review-open" type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          {t('review.onlyOpen')}
        </label>
      </div>
      <p className="meta">{t('review.progress', { done, total: city?.suggestedSpots.length ?? 0 })}</p>
      {places.length === 0 && <p className="muted">{t('review.allDone')}</p>}
      <div className="stack-sm">
        {places.map(({ place, key }) => {
          const check = checks.get(key);
          return (
            <div key={key} className="spot review-item">
              <div className="stack-sm" style={{ gap: 4, minWidth: 0 }}>
                <strong>{place.name}</strong>
                <span className="muted">{place.note}</span>
                {check && (
                  <span className="meta">
                    {t(LAST[check.verdict], { date: formatDay(check.checkedAt.slice(0, 10)) })}
                  </span>
                )}
                {fixing === key && (
                  <div className="stack-sm">
                    <label className="field" htmlFor={`fix-${key}`}>
                      <span className="label">{t('review.whatsWrong')}</span>
                      <textarea id={`fix-${key}`} className="input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                    </label>
                    <div className="row">
                      <button type="button" className="btn small primary" disabled={busy === key || !note.trim()} onClick={() => void send(key, 'fix', note)}>{t('review.sendFix')}</button>
                      <button type="button" className="btn small ghost" onClick={() => { setFixing(null); setNote(''); }}>{t('common.cancel')}</button>
                    </div>
                  </div>
                )}
              </div>
              {fixing !== key && (
                <div className="stack-sm" style={{ alignItems: 'stretch' }}>
                  <button type="button" className="btn small primary" disabled={busy === key} onClick={() => void send(key, 'ok')}>{t('review.ok')}</button>
                  <button type="button" className="btn small" disabled={busy === key} onClick={() => { setFixing(key); setNote(''); }}>{t('review.fix')}</button>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={busy === key}
                    onClick={() => { if (window.confirm(t('review.goneConfirm', { name: place.name }))) void send(key, 'gone'); }}
                  >
                    {t('review.gone')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
