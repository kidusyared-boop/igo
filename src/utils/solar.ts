import type { SunTimes } from '../types';
import { utcToZoned } from './timezone';

/**
 * Sunrise and sunset from the NOAA solar position equations, accurate to a
 * couple of minutes away from the poles. Runs offline, so no weather API.
 */
const RAD = Math.PI / 180;

function julianDay(isoDate: string): number {
  return Date.parse(`${isoDate}T12:00:00Z`) / 86_400_000 + 2440587.5;
}

/** Minutes after 00:00 UTC of sunrise or sunset, or null when the sun never crosses the horizon. */
function solarEventUtcMinutes(isoDate: string, lat: number, lon: number, rising: boolean): number | null {
  const n = Math.round(julianDay(isoDate) - 2451545.0 + 0.0008);
  const meanSolarNoon = n - lon / 360;
  const meanAnomaly = (357.5291 + 0.98560028 * meanSolarNoon) % 360;
  const center =
    1.9148 * Math.sin(meanAnomaly * RAD) +
    0.02 * Math.sin(2 * meanAnomaly * RAD) +
    0.0003 * Math.sin(3 * meanAnomaly * RAD);
  const eclipticLon = (meanAnomaly + center + 180 + 102.9372) % 360;
  const transit =
    2451545.0 + meanSolarNoon + 0.0053 * Math.sin(meanAnomaly * RAD) - 0.0069 * Math.sin(2 * eclipticLon * RAD);
  const sinDecl = Math.sin(eclipticLon * RAD) * Math.sin(23.4397 * RAD);
  const decl = Math.asin(sinDecl);
  const cosHour =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDecl) / (Math.cos(lat * RAD) * Math.cos(decl));
  if (cosHour < -1 || cosHour > 1) return null;
  const hourAngle = Math.acos(cosHour) / RAD;
  const eventJd = transit + (rising ? -hourAngle : hourAngle) / 360;
  const dayStartJd = julianDay(isoDate) - 0.5;
  return (eventJd - dayStartJd) * 1440;
}

function toLocal(isoDate: string, utcMinutes: number, timeZone: string): string {
  const instant = new Date(Date.parse(`${isoDate}T00:00:00Z`) + utcMinutes * 60_000);
  return utcToZoned(instant, timeZone).time;
}

export function sunTimes(isoDate: string, lat: number, lon: number, timeZone: string): SunTimes | null {
  const rise = solarEventUtcMinutes(isoDate, lat, lon, true);
  const set = solarEventUtcMinutes(isoDate, lat, lon, false);
  if (rise === null || set === null) return null;
  return { sunrise: toLocal(isoDate, rise, timeZone), sunset: toLocal(isoDate, set, timeZone) };
}
