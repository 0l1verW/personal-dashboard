"""Erzeugt die Training-Icons (www/icons/training-{64,180,192,512}.png): Himbeer-Verlauf, weiße Hantel.
Aufruf: python3 quellcode/training/mkicons.py dashboard/www/icons"""
import sys, os
from PIL import Image, ImageDraw
out = sys.argv[1] if len(sys.argv) > 1 else '.'
S = 1024
def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
A, B = (0xC2, 0x25, 0x5C), (0xE6, 0x49, 0x80)
img = Image.new('RGB', (S, S))
px = img.load()
for y in range(S):
    for x in range(S):
        px[x, y] = lerp(A, B, (x + y) / (2 * S - 2))
d = ImageDraw.Draw(img)
W = (255, 255, 255)
c = S // 2
r = lambda x0, y0, x1, y1, rad: d.rounded_rectangle((x0, y0, x1, y1), radius=rad, fill=W)
r(300, c - 34, 724, c + 34, 20)                 # Stange
for sx in (-1, 1):
    x = c + sx * 212
    r(x - 40, c - 190, x + 40, c + 190, 30)       # große Scheibe
    x2 = c + sx * 292
    r(x2 - 32, c - 120, x2 + 32, c + 120, 26)     # kleine Scheibe
for n in (64, 180, 192, 512):
    img.resize((n, n), Image.LANCZOS).save(os.path.join(out, f'training-{n}.png'), optimize=True)
print('ok')
