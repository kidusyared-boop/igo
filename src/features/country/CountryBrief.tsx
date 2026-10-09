import type { CountryPack, Trip } from '../../types';
import { routeCities } from '../planner/route';

interface CountryBriefProps {
  country: CountryPack;
  trip: Trip;
}

export function CountryBrief({ country, trip }: CountryBriefProps) {
  const onRoute = new Set(routeCities(trip).map((l) => l.cityId));
  const cities = [...country.cities].sort((a, b) => Number(onRoute.has(b.id)) - Number(onRoute.has(a.id)));
  const facts: [string, string][] = [
    ['Entry', country.entry.summary],
    ['Money', `${country.currency.code}. ${country.currency.cashNote}`],
    ['Power', `${country.plugs}, ${country.voltage}`],
    ['Data', country.connectivity],
    ['Getting around', country.rideApps],
    ['Emergency', country.emergency],
    ['Drones', country.drone.summary],
    ['Filming', country.filming],
    ['Tipping', country.tipping],
  ];
  return (
    <div className="section">
      <h2>{country.name} brief</h2>
      <p className="notice">
        Reviewed {country.lastReviewed}. Entry, safety and drone rules change often. Confirm on the{' '}
        <a href={country.entry.officialUrl} target="_blank" rel="noreferrer">official e-Visa site</a> and your government's travel advice before you fly.
      </p>
      <dl className="facts panel">
        {facts.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <h2>Destinations</h2>
      <div className="city-list panel">
        {cities.map((c) => (
          <div key={c.id}>
            <div className="row">
              <strong>{c.name}</strong>
              {onRoute.has(c.id) && <span className="example-tag">On your route</span>}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {c.region}{c.altitudeM ? ` · ${c.altitudeM.toLocaleString('en-US')} m` : ''} · {c.access}
            </span>
            {c.safety && <span style={{ fontSize: 13 }}>{c.safety}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
