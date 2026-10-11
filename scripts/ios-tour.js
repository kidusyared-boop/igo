// Walks through igo on the iPhone simulator for the screenshot check.
// Only the iPhone check adds this file to its build (see .github/workflows/ios.yml);
// the app itself never loads it. scripts/ios-shots.sh moves the tour on one step
// by switching the simulator to dark mode and back, then takes the screenshot.
(() => {
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

  // Step 1 is the screen the app opens on; each later step runs on one signal.
  const steps = [
    () => tap('New trip'),
    () => tap('Content creator'),
    down,
    () => tap('Build my plan'),
    down,
    () => { tap('Before you go'); top(); },
    () => { tap('Places'); top(); },
    () => { tap('Country'); top(); },
    () => tap('Trip options'),
    () => { closeSheet(); tap('All trips'); },
  ];
  let next = 0;
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  dark.addEventListener('change', () => {
    if (dark.matches || next >= steps.length) return;
    steps[next++]();
    if (next === steps.length) {
      try { localStorage.setItem(DONE, '1'); } catch { /* the check still has its shots */ }
    }
  });
})();
