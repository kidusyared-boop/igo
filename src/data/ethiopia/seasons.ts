import type { Season } from '../../types';

/**
 * Weather that changes plans, by city. The highlands get their main rains from June to
 * September; the far south has its rains in April and May and again in October and
 * November; the Danakil is dangerously hot from May to September. Months are typical,
 * not exact: rains start and end a few weeks either side from year to year.
 */
const highlandRains = (where: string, extra = ''): Season => ({
  key: 'main-rains',
  kind: 'rain',
  months: [6, 7, 8, 9],
  name: 'the main rains',
  note: `Main rains: mornings are often clear, but most afternoons bring heavy showers${extra}. igo plans outdoor places in the morning.`,
  prep: `Your days in ${where} fall in the main rains (June to September), wettest in July and August. Mornings are often clear and the country is green, but most afternoons bring heavy rain${extra}. Pack a rain jacket and shoes that can get wet, and leave slack in case a flight or road is delayed.`,
  mornings: true,
});

export const SEASONS: Record<string, Season[]> = {
  addis: [highlandRains('Addis Ababa', ' and streets flood quickly')],
  lalibela: [highlandRains('Lalibela', ' and unpaved roads turn to mud')],
  gondar: [highlandRains('Gondar')],
  'bahir-dar': [highlandRains('Bahir Dar')],
  axum: [highlandRains('Axum', ' and unpaved roads turn to mud')],
  harar: [{ ...highlandRains('Harar'), months: [7, 8, 9] }],
  hawassa: [highlandRains('Hawassa')],
  simien: [
    {
      key: 'main-rains',
      kind: 'rain',
      months: [6, 7, 8, 9],
      name: 'the main rains',
      note: 'Main rains: cloud often hides the escarpment by midday, trails get slippery and nights are cold and wet. igo plans walks for the morning.',
      prep: 'Your days in the Simien Mountains fall in the main rains (June to September). July and August are wettest: views are often lost in cloud and trails are muddy. Bring waterproofs and warm layers, and ask your operator whether multi-day treks are running.',
      mornings: true,
    },
  ],
  'arba-minch': [
    {
      key: 'long-rains',
      kind: 'rain',
      months: [4, 5],
      name: 'the long rains',
      note: 'Long rains: heavy afternoon storms, and park tracks in Nechisar can close. igo plans outdoor places in the morning.',
      prep: 'Your days in Arba Minch fall in the long rains (April and May). Storms come most afternoons and the tracks in Nechisar National Park can close. Ask your driver each morning what is open.',
      mornings: true,
    },
    {
      key: 'short-rains',
      kind: 'rain',
      months: [10, 11],
      name: 'the short rains',
      note: 'Short rains: showers on some afternoons. igo plans outdoor places in the morning.',
      prep: 'Your days in Arba Minch fall in the short rains (October and November). Showers come on some afternoons; pack a rain jacket.',
      mornings: true,
    },
  ],
  jinka: [
    {
      key: 'long-rains',
      kind: 'rain',
      months: [4, 5],
      name: 'the long rains',
      note: 'Long rains: dirt roads to the villages turn to deep mud and some close, so igo leaves out the long village day trips. Ask your guide each morning which roads are open.',
      prep: 'Your days in the Omo Valley fall in the long rains (April and May). Roads to Mursi, Hamer and Karo villages can become impassable, so igo leaves those day trips out. Book a 4x4 with an experienced driver and keep spare days, or move this stop to June to September or December to March, the usual seasons.',
      mornings: true,
      roughRoads: true,
    },
    {
      key: 'short-rains',
      kind: 'rain',
      months: [10, 11],
      name: 'the short rains',
      note: 'Short rains: afternoon showers make dirt roads slow and muddy. Leave early for village trips.',
      prep: 'Your days in the Omo Valley fall in the short rains (October and November). Afternoon showers make dirt roads slow, so village trips leave early. Book a 4x4 and allow extra time on the road.',
      mornings: true,
    },
  ],
  danakil: [
    {
      key: 'heat',
      kind: 'heat',
      months: [5, 6, 7, 8, 9],
      name: 'the hottest months',
      note: 'Extreme heat: days often pass 45 °C. Outdoor places are planned for dawn, the morning, dusk or night; rest in the shade from late morning and drink more than you think you need.',
      prep: 'Your days in the Danakil fall in its hottest months (May to September), when afternoons can pass 50 °C. Many operators cut back or stop tours then: check yours is running and ask how they handle water, shade and breakdowns. November to March is the usual season.',
      mornings: true,
    },
  ],
};
