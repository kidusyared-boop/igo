// Walks through igo on the iPhone simulator for the screenshot check.
// Only the iPhone check adds this file to its build (see .github/workflows/ios.yml);
// the app itself never loads it. Each step runs STEP_MS apart, and
// scripts/ios-shots.sh takes a screenshot halfway through each step.
(() => {
  const START_MS = 4000;
  const STEP_MS = 10000;
  const DONE = 'igo-tour-done';
  try {
    if (localStorage.getItem(DONE)) return;
  } catch {
    return;
  }

  // Drops leading icons like the + on New trip.
  const norm = (s) => (s || '').replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase();
  const tap = (label) => {
    const want = norm(label);
    const els = [...document.querySelectorAll('button, a, label, [role="tab"], [role="button"], [role="radio"]')];
    const hit = els.find((el) => norm(el.getAttribute('aria-label')).startsWith(want) || norm(el.textContent).startsWith(want));
    if (hit) hit.click();
    else console.warn('ios-tour: not found', label);
  };
  const top = () => window.scrollTo(0, 0);
  const down = () => window.scrollBy(0, Math.round(window.innerHeight * 0.7));
  const closeSheet = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  // Each step's screenshot name, and what to do at the start of the step.
  const steps = [
    ['01-trip-list', () => {}],
    ['02-new-trip-form', () => tap('New trip')],
    ['03-form-creator', () => tap('Content creator')],
    ['04-form-scrolled', down],
    ['05-day-1', () => tap('Build my plan')],
    ['06-day-1-scrolled', down],
    ['07-before-you-go', () => { tap('Before you go'); top(); }],
    ['08-places', () => { tap('Places'); top(); }],
    ['09-country', () => { tap('Country'); top(); }],
    ['10-trip-menu', () => tap('Trip options')],
    ['11-trip-list-after', () => { closeSheet(); tap('All trips'); }],
  ];
  steps.forEach(([, act], i) => setTimeout(act, START_MS + i * STEP_MS));
  setTimeout(() => {
    try { localStorage.setItem(DONE, '1'); } catch { /* the check still has its shots */ }
  }, START_MS + steps.length * STEP_MS);
  window.__igoTour = { START_MS, STEP_MS, names: steps.map(([n]) => n) };
})();
