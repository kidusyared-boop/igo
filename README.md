# igo

Daily to-do planner for trips to Ethiopia (other countries later), with a creator mode for shoot, edit and posting tasks. See docs/SCOPE.md for what is in and out of the MVP.

## Run it

```
npm install
npm run dev      # http://localhost:5173
npm test         # planner, sun-time and time zone tests
npm run build    # production build in dist/, installable as a PWA
```

## Where things live

- `src/data/ethiopia/`: the Ethiopia pack (10 destinations, entry, money, safety, drones, filming) and holiday and fasting rules.
- `src/data/countries.ts`: which countries the app offers. Drafted packs for later expansion are in `laterCountries.ts`.
- `src/utils/ethiopian.ts`: Ethiopian calendar and clock.
- `src/features/planner/`: pure plan generator. `generatePlan(trip)` turns a trip into pre-trip tasks and timed daily tasks.
- `src/utils/solar.ts`: offline sunrise and sunset (NOAA equations).
- `src/utils/timezone.ts`: time zone conversion with `Intl`, no library.
- `src/services/`: localStorage persistence and .ics calendar export.

Data stays on the device (localStorage). There is no backend yet.
