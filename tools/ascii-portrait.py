"""Shape-based ASCII portrait, following https://alexharri.com/blog/ascii-rendering

1. Every printable ASCII character gets a 6D "shape vector": how much ink falls inside
   six staggered sampling circles covering its cell (left column lowered, right raised),
   normalised per component across the character set.
2. The image is split into a grid of character cells. Each cell gets a 6D sampling vector:
   the average lightness inside the same six circles.
3. Directional contrast: each internal circle is normalised against itself and the
   external circles (reaching into neighbouring cells) that affect it, then raised to an
   exponent. This sharpens edges and removes staircasing.
4. Global contrast: the vector is normalised by its own max, raised to an exponent and
   scaled back, so flat areas stay smooth while edges crisp up.
5. Each cell takes the character whose shape vector is nearest (Euclidean).

Usage: python3 tools/ascii-portrait.py cut.png [cols]   -> src/data/amber-ascii.json
`cut.png` is the photo with its background removed (transparent), e.g. via `rembg`.
"""
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff')
SRC = sys.argv[1] if len(sys.argv) > 1 else 'cut.png'
COLS = int(sys.argv[2]) if len(sys.argv) > 2 else 72
CROP = (110 / 500, 80 / 667, 430 / 500, 420 / 667)    # head & shoulders, as fractions of the photo
LINE = 1.0                                             # line-height in em; cell = 0.6em × 1em
DIR_EXP, GLOBAL_EXP = 1.5, 1.3

# ---- sampling circles (cell-relative: x in widths, y in heights), radius in cell widths
INTERNAL = [(0.30, 0.22), (0.70, 0.16), (0.30, 0.55), (0.70, 0.49), (0.30, 0.88), (0.70, 0.82)]
EXTERNAL = [(0.30, -0.12), (0.70, -0.18), (-0.25, 0.22), (1.25, 0.16), (-0.25, 0.55), (1.25, 0.49),
            (-0.25, 0.88), (1.25, 0.82), (0.30, 1.20), (0.70, 1.14)]
AFFECTING = [[0, 1, 2, 4], [0, 1, 3, 5], [2, 4, 6], [3, 5, 7], [4, 6, 8, 9], [5, 7, 8, 9]]
RADIUS = 0.36

def circle_offsets(cw, ch, centers, r):
    rr = r * cw
    out = []
    for cx, cy in centers:
        px, py = cx * cw, cy * ch
        pts = [(x, y) for y in range(int(py - rr), int(py + rr) + 1) for x in range(int(px - rr), int(px + rr) + 1)
               if (x + .5 - px) ** 2 + (y + .5 - py) ** 2 <= rr * rr]
        out.append(np.array(pts))
    return out

# ---- 1. shape vectors for every printable character
S = 120
font = ImageFont.truetype(FONT, S)
cw, ch = round(S * 0.6), round(S * LINE)
ascent = font.getmetrics()[0]
baseline = round(ch * 0.78)                   # where the baseline sits inside the cell
chars = [chr(c) for c in range(32, 127)]
offs = circle_offsets(cw, ch, INTERNAL, RADIUS)
shapes = []
for c in chars:
    im = Image.new('L', (cw, ch), 0)
    ImageDraw.Draw(im).text((0, baseline - ascent), c, font=font, fill=255)
    a = np.asarray(im) / 255
    v = []
    for o in offs:
        xs = np.clip(o[:, 0], 0, cw - 1); ys = np.clip(o[:, 1], 0, ch - 1)
        v.append(a[ys, xs].mean())
    shapes.append(v)
shapes = np.array(shapes)
shapes = shapes / shapes.max(axis=0)

# ---- 2. the image, as lightness on black (background removed)
src = Image.open(SRC).convert('RGBA')
W, H = src.size
src = src.crop((int(CROP[0] * W), int(CROP[1] * H), int(CROP[2] * W), int(CROP[3] * H)))
PX = 14                                          # image pixels per cell width
gw = COLS * PX
cell_h = PX * LINE / 0.6
ROWS = round(src.size[1] / src.size[0] * gw / cell_h)
gh = round(ROWS * cell_h)
rgba = np.asarray(src.resize((gw, gh), Image.LANCZOS)).astype(float) / 255
alpha = rgba[..., 3]
lum = (0.2126 * rgba[..., 0] + 0.7152 * rgba[..., 1] + 0.0722 * rgba[..., 2])
m = alpha > 0.5
lo, hi = np.percentile(lum[m], 2), np.percentile(lum[m], 99.5)
L = np.clip((lum - lo) / (hi - lo), 0, 1)
blur = gaussian_filter(np.where(m, L, L[m].mean()), PX * 1.6)
L = np.clip(L + 1.3 * (L - blur), 0, 1)          # local contrast so features read at low resolution
L = (L ** 0.7) * alpha                           # background fades to black

def sample(centers, r):
    o = circle_offsets(PX, cell_h, centers, r)
    out = np.zeros((ROWS, COLS, len(centers)))
    for k, pts in enumerate(o):
        for y in range(ROWS):
            ys = np.clip(np.round(y * cell_h + pts[:, 1]).astype(int), 0, gh - 1)
            for x in range(COLS):
                xs = np.clip(x * PX + pts[:, 0], 0, gw - 1)
                out[y, x, k] = L[ys, xs].mean()
    return out

inner = sample(INTERNAL, RADIUS)
outer = sample(EXTERNAL, RADIUS)

# ---- 3. directional contrast
vec = inner.copy()
for i, aff in enumerate(AFFECTING):
    mx = np.maximum(inner[..., i], outer[..., aff].max(axis=-1))
    safe = np.where(mx > 1e-6, mx, 1)
    vec[..., i] = np.where(mx > 1e-6, (inner[..., i] / safe) ** DIR_EXP * mx, 0)
# ---- 4. global contrast
mx = vec.max(axis=-1, keepdims=True)
safe = np.where(mx > 1e-6, mx, 1)
vec = np.where(mx > 1e-6, (vec / safe) ** GLOBAL_EXP * mx, 0)

# ---- 5. nearest character
d = ((vec[..., None, :] - shapes[None, None, :, :]) ** 2).sum(-1)
idx = d.argmin(-1)
rows = [''.join(chars[i] for i in r).rstrip() for r in idx]
out = os.path.join(ROOT, 'src/data/amber-ascii.json')
json.dump({'cols': COLS, 'rows': rows, 'lineHeight': LINE}, open(out, 'w'))
print(COLS, ROWS)
print('\n'.join(rows))
