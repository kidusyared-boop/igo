import type { CountryPack } from '../../types';
import { formatEthiopian, toEthiopianClock } from '../../utils/ethiopian';
import { ethiopianDayNotes } from './holidays';
import { PLACES } from './places';

const AMHARA_SAFETY =
  'Amhara region: armed conflict since 2023 and several governments advise against travel. Check your government\'s advice and local news the day before; flying in and out is usually safer than road travel.';
const TIGRAY_SAFETY =
  'Tigray region: tense after the 2020 to 2022 war. Check travel advice before booking; internet and access can be cut with little notice.';
const SOUTH_NOTE = 'Lowland area with malaria risk: use repellent and ask a doctor about prophylaxis.';

export const ETHIOPIA: CountryPack = {
  code: 'ET',
  name: 'Ethiopia',
  lastReviewed: '2026-10',
  currency: {
    code: 'ETB',
    cashNote: 'The birr has floated since July 2024. Bring clean US dollar notes printed after 2013 and exchange at banks or the airport. Cards work mainly at large hotels in Addis. Leftover birr is hard to change back.',
  },
  plugs: 'Type C / E / F / L',
  voltage: '220 V',
  emergency: 'Police 991, ambulance 907, fire 939. Save your embassy\'s number too.',
  connectivity: 'Buy an Ethio Telecom or Safaricom SIM at Bole airport with your passport. Mobile internet can be shut off in some regions, so download offline maps and keep backups on a drive.',
  rideApps: 'Ride, Feres and Yango in Addis Ababa. Elsewhere agree the price before a bajaj (tuk-tuk) ride or use a driver your hotel arranges.',
  entry: {
    summary: 'Most visitors need an e-Visa from the official site before flying. Passport must be valid 6 months.',
    officialUrl: 'https://www.evisa.gov.et/',
    preArrivalForm: { name: 'Ethiopia e-Visa', daysBefore: 14, url: 'https://www.evisa.gov.et/' },
  },
  drone: {
    summary: 'Drones need an import permit from the Ethiopian Civil Aviation Authority plus security clearance. Without both they are confiscated at Bole customs.',
    registrationRequired: true,
  },
  filming: 'Paid or sponsored filming needs a permit from the Ethiopian Media Authority. Never film military, police, government buildings, bridges or airports. In churches, take shoes off, use no flash and ask priests first; women cover their hair. In the Omo Valley people charge per photo, so agree the price before you shoot.',
  tipping: 'Expected for guides, drivers and scouts. 5 to 10 percent in restaurants. Carry small notes.',
  localClock: toEthiopianClock,
  localDate: formatEthiopian,
  dayNotes: ethiopianDayNotes,
  extraPrep: [
    { daysBefore: 45, key: 'route-safety', title: 'Check your government\'s travel advice for every region on your route', detail: 'Parts of Amhara, Tigray, Oromia and the border areas carry "do not travel" advice from several governments, and travel insurance can be void there.' },
    { daysBefore: 30, key: 'health', title: 'Check vaccinations and malaria needs', detail: 'A yellow fever certificate is required if you arrive from a country with yellow fever risk. Lowlands (Omo Valley, Arba Minch, the Danakil) have malaria; Addis Ababa does not.' },
    { daysBefore: 21, key: 'domestic-flights', title: 'Book Ethiopian Airlines domestic flights', detail: 'Domestic fares are often much cheaper when your international ticket is on Ethiopian Airlines. Flights sell out around Timkat and Genna.' },
    { daysBefore: 21, key: 'guides', title: 'Book licensed local guides where you need them', detail: 'Lalibela churches, the Simien Mountains (a park scout is required) and the Omo Valley. The Danakil is only done with a tour operator.' },
    { daysBefore: 14, key: 'media-permit', title: 'Apply for a filming permit if this trip is paid or sponsored', detail: 'Ethiopian Media Authority. Allow several weeks.', creatorOnly: true },
    { daysBefore: 3, key: 'usd', title: 'Get clean US dollar notes printed after 2013', detail: 'Torn or old notes are often refused.' },
    { daysBefore: 1, key: 'power', title: 'Pack power banks and a head torch', detail: 'Power cuts are common, even in Addis Ababa.' },
  ],
  arrivalTasks: [
    { key: 'clock', title: 'Learn the Ethiopian clock before you book anything', detail: 'Locals count hours from 6 am, so "2 o\'clock in the morning" means 08:00. Confirm pickups as "international time".' },
  ],
  cities: [
    {
      id: 'addis', name: 'Addis Ababa', region: 'Addis Ababa', lat: 9.03, lon: 38.74, timeZone: 'Africa/Addis_Ababa', altitudeM: 2355,
      access: 'International hub at Bole airport.',
      suggestedSpots: PLACES['addis'] ?? [],
    },
    {
      id: 'lalibela', name: 'Lalibela', region: 'Amhara', lat: 12.0317, lon: 39.0476, timeZone: 'Africa/Addis_Ababa', altitudeM: 2500,
      access: 'Ethiopian Airlines flight from Addis, about 1 hour.', safety: AMHARA_SAFETY,
      suggestedSpots: PLACES['lalibela'] ?? [],
    },
    {
      id: 'gondar', name: 'Gondar', region: 'Amhara', lat: 12.603, lon: 37.4521, timeZone: 'Africa/Addis_Ababa', altitudeM: 2133,
      access: 'Ethiopian Airlines flight from Addis, about 1 hour.', safety: AMHARA_SAFETY,
      suggestedSpots: PLACES['gondar'] ?? [],
    },
    {
      id: 'bahir-dar', name: 'Bahir Dar', region: 'Amhara', lat: 11.5742, lon: 37.3614, timeZone: 'Africa/Addis_Ababa', altitudeM: 1800,
      access: 'Ethiopian Airlines flight from Addis, about 1 hour.', safety: AMHARA_SAFETY,
      suggestedSpots: PLACES['bahir-dar'] ?? [],
    },
    {
      id: 'simien', name: 'Simien Mountains (Debark)', region: 'Amhara', lat: 13.1333, lon: 37.9, timeZone: 'Africa/Addis_Ababa', altitudeM: 2850,
      access: 'Fly to Gondar, then about 2.5 hours by road to Debark park headquarters.', safety: AMHARA_SAFETY,
      suggestedSpots: PLACES['simien'] ?? [],
    },
    {
      id: 'axum', name: 'Axum', region: 'Tigray', lat: 14.1211, lon: 38.723, timeZone: 'Africa/Addis_Ababa', altitudeM: 2130,
      access: 'Ethiopian Airlines flight from Addis, about 1.5 hours.', safety: TIGRAY_SAFETY,
      suggestedSpots: PLACES['axum'] ?? [],
    },
    {
      id: 'harar', name: 'Harar', region: 'Harari', lat: 9.312, lon: 42.118, timeZone: 'Africa/Addis_Ababa', altitudeM: 1885,
      access: 'Fly to Dire Dawa, then about 1 hour by road.',
      suggestedSpots: PLACES['harar'] ?? [],
    },
    {
      id: 'arba-minch', name: 'Arba Minch', region: 'South Ethiopia', lat: 6.0333, lon: 37.55, timeZone: 'Africa/Addis_Ababa', altitudeM: 1285,
      access: 'Ethiopian Airlines flight from Addis, about 1 hour.', safety: SOUTH_NOTE,
      suggestedSpots: PLACES['arba-minch'] ?? [],
    },
    {
      id: 'jinka', name: 'Jinka (Omo Valley)', region: 'South Ethiopia', lat: 5.786, lon: 36.565, timeZone: 'Africa/Addis_Ababa', altitudeM: 1400,
      access: 'Flight from Addis to Jinka, or 2 days by road via Arba Minch.', safety: SOUTH_NOTE,
      suggestedSpots: PLACES['jinka'] ?? [],
    },
    {
      id: 'danakil', name: 'Danakil Depression (via Semera)', region: 'Afar', lat: 11.792, lon: 41.006, timeZone: 'Africa/Addis_Ababa', altitudeM: 430,
      access: 'Fly to Semera, then a multi-day tour with an operator and escort.',
      safety: 'Afar region: tours only, with an operator and escort. Daytime heat passes 45 °C; check advice for the Afar and Tigray border.',
      suggestedSpots: PLACES['danakil'] ?? [],
    },
  ],
};
