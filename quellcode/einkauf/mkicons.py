"""Erzeugt die Einkaufs-Icons (www/icons/einkauf-{64,180,192,512}.png): Bernstein-Verlauf, weißer Einkaufskorb.
Aufruf: python3 quellcode/einkauf/mkicons.py dashboard/www/icons"""
import sys, os
from PIL import Image, ImageDraw
out = sys.argv[1] if len(sys.argv) > 1 else '.'
S = 1024
def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
A, B = (0xB8, 0x6A, 0x05), (0xE5, 0x9E, 0x1F)
img = Image.new('RGB', (S, S)); px = img.load()
for y in range(S):
    for x in range(S): px[x, y] = lerp(A, B, (x + y) / (2 * S - 2))
d = ImageDraw.Draw(img); W = (255, 255, 255)
# Henkel
d.arc((322, 200, 702, 620), 180, 360, fill=W, width=56)
# Korb (Trapez) mit Rand
d.rounded_rectangle((232, 410, 792, 486), radius=30, fill=W)
d.polygon([(272, 470), (752, 470), (692, 800), (332, 800)], fill=W)
# Streifen im Korb
for x in (420, 512, 604):
    d.rounded_rectangle((x - 20, 548, x + 20, 742), radius=20, fill=A)
for n in (64, 180, 192, 512):
    img.resize((n, n), Image.LANCZOS).save(os.path.join(out, f'einkauf-{n}.png'), optimize=True)
print('ok')
