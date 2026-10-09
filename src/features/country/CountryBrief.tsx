import type { CountryPack, Trip } from '../../types';
import { routeCities } from '../planner/route';
import { useT, type TKey } from '../../i18n';

interface CountryBriefProps {
  country: CountryPack;
  trip: Trip;
}

export function CountryBrief({ country, trip }: CountryBriefProps) {
  const t = useT();
  const onRoute = new Set(routeCities(trip).map((l) => l.cityId));
  const cities = [...country.cities].sort((a, b) => Number(onRoute.has(b.id)) - Number(onRoute.has(a.id)));
  const facts: [TKey, string][] = [
    ['fact.entry', country.entry.summary],
    ['fact.money', `${country.currency.code}. ${country.currency.cashNote}`],
    ['fact.power', `${country.plugs}, ${country.voltage}`],
    ['fact.data', country.connectivity],
    ['fact.transport', country.rideApps],
    ['fact.emergency', country.emergency],
    ['fact.drones', country.drone.summary],
    ['fact.filming', country.filming],
    ['fact.tipping', country.tipping],
  ];
  const [before, after] = t('country.notice', { date: country.lastReviewed }).split('{link}');
  return (
    <div className="section">
      <h2>{t('country.brief', { country: country.name })}</h2>
      <p className="notice">
        {before}
        <a href={country.entry.officialUrl} target="_blank" rel="noreferrer">{t('country.visaSite')}</a>
        {after}
      </p>
      <dl className="facts panel">
        {facts.map(([k, v]) => (
          <div key={k}><dt>{t(k)}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <h2>{t('country.destinations')}</h2>
      <div className="city-list panel">
        {cities.map((c) => (
          <div key={c.id}>
            <div className="row">
              <strong>{c.name}</strong>
              {onRoute.has(c.id) && <span className="example-tag">{t('country.onRoute')}</span>}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {c.region}{c.altitudeM ? ` · ${t('country.altitude', { m: c.altitudeM.toLocaleString('en-US') })}` : ''} · {c.access}
            </span>
            {c.safety && <span style={{ fontSize: 13 }}>{c.safety}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
