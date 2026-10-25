import { mapLink } from '../../utils/links';
import { PinIcon } from '../../components/ui/Icons';
import { useT } from '../../i18n';

/** A link that opens Google Maps on the place, which hands over to the Maps app on phones. */
export function Directions({ query, place }: { query: string; place: string }) {
  const t = useT();
  return (
    <a className="directions" href={mapLink(query)} target="_blank" rel="noreferrer" aria-label={t('map.directionsTo', { place })}>
      <PinIcon />
      {t('map.directions')}
    </a>
  );
}
