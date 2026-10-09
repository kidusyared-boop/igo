import type { SuggestedSpot } from '../../types';

/**
 * Places per destination, tagged by the kind of traveler they suit.
 * The planner picks from these using each trip's interests and pace.
 * Opening hours and prices are left out on purpose: they change too often.
 */
export const PLACES: Record<string, SuggestedSpot[]> = {
  addis: [
    { name: 'Merkato', light: 'any', tags: ['city', 'markets', 'culture'], note: 'One of Africa\'s biggest open markets. Go with a local, keep bags in front, ask before filming people.' },
    { name: 'National Museum (Lucy)', light: 'any', tags: ['city', 'history'], note: 'The 3.2-million-year-old Lucy skeleton. Allow 90 minutes; no flash.' },
    { name: 'Ethnological Museum, Addis Ababa University', light: 'any', tags: ['city', 'history', 'culture'], note: 'Inside Haile Selassie\'s former palace, including his bedroom.' },
    { name: 'Red Terror Martyrs\' Memorial Museum', light: 'any', tags: ['city', 'history'], note: 'The Derg years, told by survivors. Heavy but important.' },
    { name: 'Holy Trinity Cathedral', light: 'sunrise', tags: ['city', 'religion', 'history'], note: 'Haile Selassie\'s tomb. Dress modestly; morning prayers are calm.' },
    { name: 'Entoto Park viewpoint', light: 'sunset', tags: ['countryside', 'hiking'], note: 'Eucalyptus hills above the city at about 3,000 m. Cold after dark.' },
    { name: 'Tomoca Coffee, Piassa', light: 'any', tags: ['city', 'coffee'], note: 'Standing-room espresso bar open since 1953. Buy beans to take home.' },
    { name: 'Traditional coffee ceremony', light: 'any', tags: ['coffee', 'culture'], note: 'Roasting, the jebena pot and three rounds of coffee. Ask your hotel or guide to arrange one.' },
    { name: 'Lunch: beyaynetu at a local restaurant', light: 'lunch', tags: ['food'], note: 'A mixed platter of vegan stews on injera. Ask your driver for their favorite place.' },
    { name: 'Dinner and dancing at Yod Abyssinia', light: 'dinner', tags: ['food', 'culture', 'nightlife'], note: 'Cultural restaurant with eskista dancing from every region. Book ahead.' },
    { name: 'Fendika Azmari Bet', light: 'night', tags: ['nightlife', 'culture'], note: 'Live azmari music and dance; Ethiopia\'s best-known traditional music house.' },
    { name: 'Shiro Meda textile market', light: 'any', tags: ['markets', 'culture'], note: 'Handwoven scarves and the white netela shawl. Bargain politely.' },
    { name: 'Day trip to the Bishoftu crater lakes', light: 'any', tags: ['countryside', 'hiking'], note: 'Volcanic lakes about an hour south-east. Lunch by the water.' },
  ],
  lalibela: [
    { name: 'Bete Giyorgis from above', light: 'sunrise', tags: ['history', 'religion'], note: 'The cross-shaped church cut down into the rock. First light from the rim.' },
    { name: 'Northern church cluster', light: 'any', tags: ['history', 'religion'], note: 'Six rock-hewn churches. Licensed guide required; shoes off inside.' },
    { name: 'Southern church cluster and the dark tunnel', light: 'any', tags: ['history', 'religion', 'adventure'], note: 'Walk the pitch-black passage between churches.' },
    { name: 'Asheton Maryam monastery hike', light: 'sunrise', tags: ['countryside', 'hiking', 'religion'], note: 'Steep 2-hour climb to a cliff monastery. Start in the dark.' },
    { name: 'Yemrehanna Kristos church', light: 'any', tags: ['countryside', 'history', 'religion'], note: 'Older than the Lalibela churches, built inside a cave. About an hour\'s drive.' },
    { name: 'Saturday market', light: 'any', tags: ['markets', 'culture'], note: 'Farmers come in from the hills with grain, spices and livestock.' },
    { name: 'Sunset dinner at Ben Abeba', light: 'dinner', tags: ['food'], note: 'Spiral-shaped restaurant with views over the valley.' },
  ],
  gondar: [
    { name: 'Fasil Ghebbi royal enclosure', light: 'any', tags: ['city', 'history'], note: 'Castles built from the 1600s; allow 2 hours.' },
    { name: 'Debre Berhan Selassie church', light: 'any', tags: ['history', 'religion'], note: 'Ceiling covered in painted angel faces. Dim; no flash.' },
    { name: 'Fasilides Bath', light: 'any', tags: ['history'], note: 'Filled with water only for Timkat.' },
    { name: 'Kuskuam palace ruins', light: 'sunset', tags: ['history', 'countryside'], note: 'Empress Mentewab\'s palace on a hill outside town.' },
    { name: 'Dinner at Four Sisters', light: 'dinner', tags: ['food', 'culture'], note: 'Family-run restaurant with traditional food and live music.' },
    { name: 'Gondar piazza coffee stop', light: 'any', tags: ['city', 'coffee'], note: 'Italian-era buildings and macchiato for small change.' },
  ],
  'bahir-dar': [
    { name: 'Lake Tana island monasteries', light: 'sunrise', tags: ['religion', 'history', 'countryside'], note: 'Morning boat to Zege peninsula; some monasteries admit men only.' },
    { name: 'Blue Nile Falls', light: 'any', tags: ['countryside', 'hiking'], note: 'Fullest in the rainy season, July to October.' },
    { name: 'Bezawit Hill', light: 'sunset', tags: ['countryside'], note: 'Where the Blue Nile leaves the lake.' },
    { name: 'Lakeside lunch with fresh fish', light: 'lunch', tags: ['food'], note: 'Tilapia from Lake Tana, often fried whole.' },
    { name: 'Bahir Dar market', light: 'any', tags: ['city', 'markets'], note: 'Papyrus tankwa boats, baskets and spices.' },
  ],
  simien: [
    { name: 'Gelada baboons on the escarpment', light: 'sunrise', tags: ['wildlife', 'countryside'], note: 'They climb up the cliffs in the morning. Stay 5 m away.' },
    { name: 'Imet Gogo viewpoint', light: 'sunset', tags: ['hiking', 'countryside'], note: 'One of the great views in Africa, at 3,926 m.' },
    { name: 'Chennek camp and walia ibex', light: 'sunrise', tags: ['wildlife', 'hiking'], note: 'Endemic ibex on the cliffs near camp.' },
    { name: 'Ras Dashen summit trek', light: 'any', tags: ['hiking', 'adventure'], note: 'Ethiopia\'s highest peak, 4,550 m. Multi-day; book with an operator.' },
    { name: 'Jinbar waterfall', light: 'any', tags: ['countryside', 'hiking'], note: 'Drops hundreds of meters into the gorge.' },
  ],
  axum: [
    { name: 'Northern Stelae Park', light: 'sunset', tags: ['history'], note: 'Long shadows on the obelisks.' },
    { name: 'Church of Our Lady Mary of Zion', light: 'any', tags: ['religion', 'history'], note: 'Said to hold the Ark of the Covenant. The old church admits men only.' },
    { name: 'Dungur palace ruins', light: 'any', tags: ['history'], note: 'Known locally as the Queen of Sheba\'s palace.' },
    { name: 'Yeha temple', light: 'any', tags: ['history', 'countryside'], note: 'Pre-Aksumite temple, about an hour away.' },
  ],
  harar: [
    { name: 'Jugol old town alleys', light: 'sunrise', tags: ['city', 'history', 'culture'], note: 'Painted houses and 82 mosques. Hire a local guide.' },
    { name: 'Hyena feeding outside the walls', light: 'night', tags: ['wildlife', 'adventure', 'culture'], note: 'Feed wild hyenas by hand. Agree the fee first.' },
    { name: 'Arthur Rimbaud House', light: 'any', tags: ['history', 'city'], note: 'Merchant house with photos of old Harar.' },
    { name: 'Shoa Gate market', light: 'any', tags: ['markets', 'city'], note: 'Spices, baskets and khat trading.' },
    { name: 'Harari coffee and traditional home visit', light: 'any', tags: ['coffee', 'culture'], note: 'Harari homes have walls of decorated baskets.' },
    { name: 'Lunch in the old town', light: 'lunch', tags: ['food'], note: 'Try hulbat and Harari-style dishes.' },
  ],
  'arba-minch': [
    { name: 'Lake Chamo crocodile market', light: 'sunrise', tags: ['wildlife', 'countryside'], note: 'Boat trip past huge crocodiles and hippos.' },
    { name: 'Dorze village, Chencha', light: 'any', tags: ['culture', 'countryside'], note: 'Beehive-shaped bamboo houses and cotton weaving.' },
    { name: 'Nechisar National Park', light: 'any', tags: ['wildlife', 'countryside'], note: 'Zebras and gazelles on the plains between the lakes.' },
    { name: 'Bridge of God viewpoint', light: 'sunset', tags: ['countryside'], note: 'The land bridge between Lake Abaya and Lake Chamo.' },
    { name: 'Dinner with a lake view', light: 'dinner', tags: ['food'], note: 'Several lodges on the escarpment serve fish from the lakes.' },
  ],
  jinka: [
    { name: 'Mursi village, Mago National Park', light: 'any', tags: ['culture', 'countryside'], note: 'Go with a guide and agree photo fees before you start.' },
    { name: 'South Omo Research Center and Museum', light: 'any', tags: ['history', 'culture'], note: 'Background on the Omo peoples before you visit villages.' },
    { name: 'Key Afer Thursday market', light: 'any', tags: ['markets', 'culture'], note: 'Banna, Tsemay and Ari people trading.' },
    { name: 'Turmi Monday market', light: 'any', tags: ['markets', 'culture'], note: 'Hamer market. Bull-jumping ceremonies happen nearby in season.' },
  ],
  danakil: [
    { name: 'Dallol sulfur springs', light: 'sunrise', tags: ['adventure', 'countryside'], note: 'Neon yellow and green pools. Go at dawn before the heat.' },
    { name: 'Erta Ale lava lake', light: 'night', tags: ['adventure', 'hiking'], note: 'Night hike to the crater rim.' },
    { name: 'Salt caravans at Lake Asale', light: 'sunset', tags: ['culture', 'countryside'], note: 'Afar miners cutting salt and loading camels.' },
  ],
};
