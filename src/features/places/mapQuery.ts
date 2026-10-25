import type { City } from '../../types';

/**
 * What to search in Maps for catalogue places whose name is not the name on the map.
 * `false` marks places that are a kind of thing, not one spot ("a local tej bet"):
 * a search would pick a random match, so they get no link and the traveler asks locally.
 * Places not listed here are searched by their own name.
 */
export const MAP_QUERIES: Record<string, string | false> = {
  // Addis Ababa
  'Traditional coffee ceremony': false,
  'Lunch: beyaynetu at a local restaurant': false,
  'Breakfast or lunch at Kategna': 'Kategna Restaurant',
  'Kitfo lunch at a Gurage kitfo house': false,
  'Dinner along Bole Road': 'Bole Road',
  'Dinner and dancing at Yod Abyssinia': 'Yod Abyssinia',
  'Dinner show at 2000 Habesha': '2000 Habesha Cultural Restaurant',
  'Sunset drinks on a Bole rooftop': false,
  'Live jazz at African Jazz Village': 'African Jazz Village',
  'Day trip to the Bishoftu crater lakes': 'Bishoftu, Ethiopia',
  'Day trip to Adadi Mariam': 'Adadi Mariam, Ethiopia',
  'Day trip to Tiya stelae': 'Tiya stelae, Ethiopia',
  'Day trip to Wenchi crater lake': 'Wenchi crater lake, Ethiopia',
  'Day trip to Debre Libanos and the Portuguese bridge': 'Debre Libanos monastery, Ethiopia',
  'Day trip to Menagesha Suba forest': 'Menagesha Suba forest, Ethiopia',
  // Lalibela
  'Bete Giyorgis from above': 'Bete Giyorgis',
  'Northern church cluster': 'Bete Medhane Alem',
  'Southern church cluster and the dark tunnel': 'Bete Amanuel',
  'Asheton Maryam monastery hike': 'Asheton Maryam',
  'Hudad plateau hike': 'Hudad',
  'Saturday market': 'Lalibela market',
  'Coffee at the cafes by the market': false,
  'Lunch in the garden at Seven Olives': 'Seven Olives Hotel',
  'Local food at Unique Restaurant': 'Unique Restaurant',
  'Dinner at Ben Abeba': 'Ben Abeba',
  'Tej at a local tej bet': false,
  // Gondar
  'Gondar piazza coffee stop': 'Piazza',
  'Lake Tana from Gorgora': 'Gorgora, Ethiopia',
  'Lunch: Ethiopian dishes near the piazza': false,
  'Sunset at the Goha Hotel': 'Goha Hotel',
  'Dinner at Four Sisters': 'Four Sisters Restaurant',
  'Azmari music in Gondar': false,
  // Bahir Dar
  'Lake Tana island monasteries': 'Lake Tana boat port',
  'Hippos at the Blue Nile outlet': 'Blue Nile outlet',
  'Lakeshore walk': 'Lake Tana shore',
  'Cycling around town': false,
  'Lakeside coffee': false,
  'Lakeside lunch with fresh fish': false,
  'Azmari bet evening': false,
  // Simien Mountains
  'Gelada baboons on the escarpment': 'Sankaber',
  'Geech village and plateau': 'Geech',
  'Chennek camp and walia ibex': 'Chenek camp',
  'Ras Dashen summit trek': 'Ras Dashen, Ethiopia',
  'Lunch at Simien Lodge': 'Simien Lodge',
  'Dinner at Limalimo Lodge': 'Limalimo Lodge',
  // Axum
  'Lunch: Tigrayan dishes in town': false,
  // Harar
  'Jugol old town alleys': 'Jugol',
  'Harari basket weavers': false,
  'Harari coffee and traditional home visit': false,
  'Babile camel market': 'Babile, Ethiopia',
  'Valley of Marvels near Babile': 'Valley of Marvels, Babile, Ethiopia',
  'Lunch in the old town': false,
  'Dinner of Harari dishes': false,
  'Hyena feeding outside the walls': 'Hyena feeding',
  // Arba Minch
  'Konso terraces and Gesergio "New York"': 'Gesergio, Konso, Ethiopia',
  'Lake Chamo crocodile market': 'Lake Chamo',
  'Dorze village, Chencha': 'Dorze, Chencha, Ethiopia',
  'Gamo highlands and Chencha market': 'Chencha, Ethiopia',
  'Lunch of lake fish in town': false,
  'Bridge of God viewpoint': 'Bridge of God',
  'Dinner with a lake view': false,
  // Jinka and the Omo Valley
  'Ari village near Jinka': false,
  'Mursi village, Mago National Park': 'Mago National Park, Ethiopia',
  'Key Afer Thursday market': 'Key Afer, Ethiopia',
  'Weyto River area': 'Weyto, Ethiopia',
  'Dimeka market': 'Dimeka, Ethiopia',
  'Turmi Monday market': 'Turmi, Ethiopia',
  'Hamer bull-jumping ceremony': false,
  'Karo village, Korcho': 'Korcho, Ethiopia',
  'Dassanech village across the Omo': 'Omorate, Ethiopia',
  'Lunch in Jinka': false,
  // Danakil
  'Dallol sulfur springs': 'Dallol, Ethiopia',
  "Gaet'ale pond": "Gaet'ale pond, Ethiopia",
  'Salt caravans at Lake Asale': 'Lake Asale, Ethiopia',
  'Camp dinner at Hamed Ela': 'Hamed Ela, Ethiopia',
  'Lake Afrera salt lake': 'Lake Afrera, Ethiopia',
  'Erta Ale volcano': 'Erta Ale, Ethiopia',
  // Hawassa
  'Amora Gedel fish market': 'Amora Gedel',
  'Lake Hawassa lakeshore walk': 'Lake Hawassa',
  'Boat trip for hippos': 'Lake Hawassa',
  'Coffee in town': false,
  'Lakeside lunch at a resort': false,
  'Fish dinner in town': false,
  'Wondo Genet hot springs': 'Wondo Genet, Ethiopia',
  'Sidama coffee farm visit': false,
  'Aregash Lodge near Yirgalem': 'Aregash Lodge, Yirgalem, Ethiopia',
  'Fiche Chambalala festival': false,
};

/** "Simien Mountains (Debark)" → "Simien Mountains", the part Maps knows. */
const plainCity = (name: string) => name.replace(/\s*\(.*\)\s*$/, '');

/**
 * The Maps search for a place, or undefined when there is no one spot to find.
 * Adds the city and country unless the query already says where it is, so "Piazza" finds Gondar's, not Rome's.
 */
export function placeQuery(name: string, city: Pick<City, 'name'> | undefined, country = 'Ethiopia'): string | undefined {
  const known = MAP_QUERIES[name];
  if (known === false) return undefined;
  const query = (known ?? name).trim();
  if (!query) return undefined;
  if (query.includes(country)) return query;
  const where = city ? plainCity(city.name) : '';
  return [query, where && !query.toLowerCase().includes(where.toLowerCase()) ? where : '', country].filter(Boolean).join(', ');
}
