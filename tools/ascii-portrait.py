from PIL import Image, ImageOps, ImageFilter, ImageDraw, ImageFont
import numpy as np, json, sys
COLS = int(sys.argv[1]) if len(sys.argv) > 1 else 72
im = Image.open('cut.png')
W, H = im.size
s = W / 500
box = (int(110*s), int(80*s), int(430*s), int(420*s))
im = im.crop(box)
cw, ch = im.size
ROWS = round(COLS * ch / cw)
rgba = np.asarray(im.resize((COLS*4, ROWS*4), Image.LANCZOS)).astype(float) / 255
a = rgba[..., 3]
lum = 0.2126*rgba[...,0] + 0.7152*rgba[...,1] + 0.0722*rgba[...,2]
# downsample to grid
def pool(x): return x.reshape(ROWS, 4, COLS, 4).mean(axis=(1, 3))
A = pool(a); L = pool(lum * a) / np.maximum(A, 1e-3)
from scipy.ndimage import gaussian_filter
Lb = gaussian_filter(np.where(A > 0.5, L, L[A > 0.5].mean()), 2.2)
L = L + 1.6 * (L - Lb)          # local contrast so eyes, brows, mouth and hair strands read
# contrast stretch inside the figure
m = A > 0.5
lo, hi = np.percentile(L[m], 3), np.percentile(L[m], 99)
V = np.clip((L - lo) / (hi - lo), 0, 1)
# local contrast: blend with a histogram-equalised version inside the figure
order = np.argsort(np.argsort(L[m])); eq = order / max(1, order.size - 1)
Ve = V.copy(); Ve[m] = eq
V = (0.45 * V + 0.55 * Ve) ** 1.25
V = 0.07 + 0.93 * V
# edge emphasis on the silhouette
from scipy.ndimage import binary_erosion
edge = m & ~binary_erosion(m)
V[edge] = np.maximum(V[edge], 0.45)
# Floyd–Steinberg to 4 levels
levels = np.array([0, 0.55, 1.0])
out = np.zeros((ROWS, COLS), int); E = V.copy()
for y in range(ROWS):
    for x in range(COLS):
        if not m[y, x]: E[y, x] = 0; continue
        old = E[y, x]; k = int(np.argmin(abs(levels - old))); out[y, x] = k
        err = old - levels[k]
        for dx, dy, w in ((1,0,7/16),(-1,1,3/16),(0,1,5/16),(1,1,1/16)):
            xx, yy = x+dx, y+dy
            if 0 <= xx < COLS and yy < ROWS and m[yy, xx]: E[yy, xx] += err*w
rows = [''.join(str(v) for v in r) for r in out]
json.dump({'cols': COLS, 'rows': rows}, open('grid.json', 'w'))
# preview
cell = 8
img = Image.new('RGB', (COLS*cell, ROWS*cell), (13, 15, 19))
d = ImageDraw.Draw(img)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 9) if __import__('os').path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf') else ImageFont.load_default()
for y, r in enumerate(rows):
    for x, c in enumerate(r):
        k = int(c)
        if k: 
            g = int(255 * levels[k]); d.text((x*cell+1, y*cell-1), '*', fill=(g, g, g), font=f)
img.save('grid_preview.png'); print(COLS, ROWS)
