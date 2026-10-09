# igo: MVP scope (Ethiopia first)

## Decision

igo launches **for trips to Ethiopia only** and expands to other countries later. The code keeps country packs separate, so adding a country means writing and reviewing one data file.

## Why Ethiopia-only can work

General planners (Wanderlog, GetYourGuide, Visit A City, Culture Trip) cover Ethiopia thinly and treat it like any other country. Ethiopia has problems those apps do not solve:

- **A different calendar and clock.** The Ethiopian calendar is about 7 to 8 years behind, and locals count hours from 6 am, so "2 o'clock" can mean 08:00. Visitors miss pickups and bookings because of this.
- **Holidays and fasting change your day.** Timkat, Meskel and Genna bring huge crowds and closures. On fasting days (Wednesdays, Fridays and the 55 days of Lent) most menus are vegan.
- **Region-by-region safety.** Much of the classic historic route (Lalibela, Gondar, Bahir Dar, the Simien Mountains) is in Amhara, where several governments advise against travel. Planning a route needs that information on every day spent there.
- **Logistics that trip people up.** e-Visa, cash and the floating birr, clean USD notes, SIM registration, power cuts, internet shutdowns, domestic flights on Ethiopian Airlines, required scouts and guides.
- **Strict filming rules.** Drone import permits, media permits for paid work, church etiquette, and per-photo fees in the Omo Valley.

## Risks you should weigh

1. **Market size.** Ethiopia gets far fewer leisure visitors than the countries the competitors focus on, and conflict has cut tourism to the north. An Ethiopia-only app has a small paying audience unless it also serves the **diaspora**, which is probably the bigger group (open question in the thread).
2. **Safety liability.** If the app plans a route through a "do not travel" area, it must warn clearly. It does now, but the warnings need regular review.
3. **Data accuracy.** Visa, drone, currency and safety rules change quickly. Every fact needs a source and a review date before launch.

## MVP (built)

0. **Personal plans.** Each trip has the traveler's interests (city life, countryside, restaurants and food, coffee, historic sites, churches and monasteries, local culture, markets, music and nightlife, hiking, wildlife, adventure) and pace (relaxed, balanced or packed). igo picks places from a tagged catalogue of 58 places to match, keeps city-only travelers out of the countryside, adds restaurants only for food lovers, says why each place was picked, and lets the traveler remove a pick with "Not for me".
1. Trip setup: first city, then a **route** of later cities with travel days; landing and departure times; creator or traveler mode; audience time zone; drone yes or no.
2. **Ethiopia pack**: 10 destinations (Addis Ababa, Lalibela, Gondar, Bahir Dar, Simien Mountains, Axum, Harar, Arba Minch, Jinka/Omo Valley, Danakil) with region, altitude, how to get there, safety notes and suggested spots.
3. Generated daily to-dos:
   - Before you go: e-Visa, travel advice per region, vaccinations and malaria, domestic flights, guides and scouts, media permit (creators), clean USD notes, power banks, and booking every leg of the route.
   - Arrival: immigration, SIM, cash, transfer, altitude warning, learning the Ethiopian clock.
   - Travel days: checkout, transfer and check-in, with journey B-roll for creators.
   - Shoot days: spots placed in their best light, in the right city, with backup, editing and a posting slot at 7 pm audience time.
   - Departure: final backup, spending leftover birr, leaving for the airport.
4. Each day shows the **Ethiopian date**, every task shows **Ethiopian time**, and the day lists **holidays, fasting and safety** notes.
5. **Preferences**: budget (tight, mid-range, comfortable), diet (vegetarian, vegan, halal, Orthodox fasting), easy access and travel with young children. They filter the 149-place catalogue across 11 destinations (Hawassa added) and add tasks such as ordering yetsom, asking for "ye Islam" meat, ground-floor rooms, child seats and a midday break for kids.
6. **Diaspora mode** for Ethiopians and people of Ethiopian origin visiting home. They choose how they enter (Origin ID, Ethiopian passport or visa), and Origin ID or passport holders skip the e-Visa steps. They get prep for money transfers and diaspora accounts, customs allowances for gifts, baggage weight and an old Ethio Telecom number. Optional family afternoons (15:00 to 19:00) are kept free of places, and holidays get a "holiday at home" task.
7. **Accounts and sync (Supabase)**. igo is local-first: trips always save on the device. Signing in with email and password syncs trips across devices; the newest edit of each trip wins, and deletions spread too. The example trip is never uploaded. Setup: run `supabase/migrations/0001_trips.sql` once in the Supabase SQL editor, and put the project URL and publishable key in `.env.local` (see `.env.example`).
8. Your own tasks, hiding generated tasks, calendar export (.ics), works offline on a phone.

## Not in the MVP

- Local checks of the catalogue. All 149 places show "Not yet checked by a local" until someone in each city reviews them.

- Amharic. The interface translation exists in `src/i18n/am.ts` but is switched off (`AMHARIC_ENABLED` in `src/i18n/index.tsx`) so the app ships in English only. It needs native review, and generated plans are not translated.
- Live safety feeds, bookings, paid APIs.
- Other countries (drafts exist in `app/src/data/laterCountries.ts`).
