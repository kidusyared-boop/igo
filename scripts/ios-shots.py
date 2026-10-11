"""Drive igo on an iPhone simulator and save a screenshot of each main screen.

Usage: python3 scripts/ios-shots.py OUT_DIR
Needs a booted simulator with igo installed, plus idb (fb-idb and idb-companion).
"""
import json
import subprocess
import sys
import time

OUT = sys.argv[1]
APP = 'app.igo.ethiopia'


def run(*args: str) -> str:
    return subprocess.run(args, capture_output=True, text=True, check=False).stdout


def booted() -> str:
    devices = json.loads(run('xcrun', 'simctl', 'list', 'devices', 'booted', '-j'))['devices']
    return next(d['udid'] for group in devices.values() for d in group if d['state'] == 'Booted')


UDID = booted()


def idb(*args: str) -> str:
    return run('idb', *args, '--udid', UDID)


def shot(name: str) -> None:
    run('xcrun', 'simctl', 'io', UDID, 'screenshot', f'{OUT}/{name}.png')
    print('shot', name, flush=True)


def elements() -> list[dict]:
    raw = idb('ui', 'describe-all', '--json').strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Some idb versions print one JSON object per line.
        data = [json.loads(line) for line in raw.splitlines() if line.startswith('{')]
    return data if isinstance(data, list) else [data]


def tap(label: str) -> bool:
    """Tap the first element whose accessibility label starts with `label`."""
    seen: list[str] = []
    for _ in range(8):
        for e in elements():
            text = (e.get('AXLabel') or '').strip()
            seen.append(text)
            if text.lower().startswith(label.lower()):
                f = e['frame']
                idb('ui', 'tap', str(round(f['x'] + f['width'] / 2)), str(round(f['y'] + f['height'] / 2)))
                time.sleep(1.5)
                return True
        time.sleep(1)
    print(f'NOT FOUND: {label!r}; saw {sorted(set(seen))[:60]}', flush=True)
    return False


def swipe_up() -> None:
    idb('ui', 'swipe', '200', '700', '200', '200', '--duration', '0.3')
    time.sleep(1)


def launch() -> None:
    run('xcrun', 'simctl', 'terminate', UDID, APP)
    run('xcrun', 'simctl', 'launch', UDID, APP)
    time.sleep(6)


launch()
shot('01-first-launch')
tap('New trip')
shot('02-new-trip-form')
tap('Content creator')
swipe_up()
shot('03-form-scrolled')
tap('Build my plan')
shot('04-day-1')
swipe_up()
shot('05-day-1-scrolled')
for i, tab in enumerate(['Before you go', 'Places', 'Country']):
    tap(tab)
    shot(f'0{6 + i}-{tab.lower().replace(" ", "-")}')
tap('Trip options')
shot('09-trip-menu')
# Tapping above the sheet closes it.
idb('ui', 'tap', '200', '150')
time.sleep(1)
tap('All trips')
shot('10-trip-list')
run('xcrun', 'simctl', 'ui', UDID, 'appearance', 'dark')
launch()
shot('11-dark')
