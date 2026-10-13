"""Print the centre of the first on-screen element whose text or description starts with a label.

Usage: python3 scripts/android-find.py UI_DUMP.xml LABEL
Reads a `uiautomator dump`; exits 1 when nothing matches.
"""
import re
import sys
import xml.etree.ElementTree as ET

def norm(s: str) -> str:
    # Drops leading icons like the + on New trip.
    return re.sub(r'^[^\w]+', '', ' '.join(s.split())).lower()

want = norm(sys.argv[2])
for node in ET.parse(sys.argv[1]).iter('node'):
    for attr in ('text', 'content-desc'):
        if norm(node.get(attr, '')).startswith(want):
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds', '')))
            if x2 > x1 and y2 > y1:
                print((x1 + x2) // 2, (y1 + y2) // 2)
                sys.exit(0)
sys.exit(1)
