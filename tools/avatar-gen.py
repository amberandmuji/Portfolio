"""Generate the ink layer of the avatar as SVG.

Lines are tapered brush strokes (filled shapes), hair is solid ink.
Usage: python3 gen.py  -> writes ink.svg (fragment) and preview.svg (standalone)
"""
import math, re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
INK = '#141414'
WOBBLE = 0.12

def parse(d):
    toks = re.findall(r'[MCQL]|-?\d*\.?\d+', d)
    segs, i, cur, start = [], 0, None, None
    cmd = None
    while i < len(toks):
        if toks[i] in 'MCQL':
            cmd = toks[i]; i += 1
        n = lambda k: [float(t) for t in toks[i:i + k]]
        if cmd == 'M':
            x, y = n(2); i += 2; cur = (x, y); cmd = 'L'
        elif cmd == 'L':
            x, y = n(2); i += 2
            segs.append((cur, cur, (x, y), (x, y))); cur = (x, y)
        elif cmd == 'C':
            a = n(6); i += 6
            segs.append((cur, (a[0], a[1]), (a[2], a[3]), (a[4], a[5]))); cur = (a[4], a[5])
        elif cmd == 'Q':
            a = n(4); i += 4
            q = (a[0], a[1]); e = (a[2], a[3])
            c1 = (cur[0] + 2 / 3 * (q[0] - cur[0]), cur[1] + 2 / 3 * (q[1] - cur[1]))
            c2 = (e[0] + 2 / 3 * (q[0] - e[0]), e[1] + 2 / 3 * (q[1] - e[1]))
            segs.append((cur, c1, c2, e)); cur = e
    return segs

def bez(s, t):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = s
    u = 1 - t
    return (u**3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * x3,
            u**3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * y3)

def sample(d, per=24):
    pts = []
    for s in parse(d):
        for k in range(per):
            pts.append(bez(s, k / per))
    pts.append(bez(parse(d)[-1], 1))
    # dedupe
    out = [pts[0]]
    for p in pts[1:]:
        if math.dist(p, out[-1]) > 0.05: out.append(p)
    return out

def brush(d, w=4.6, taper=(0.25, 0.25), tip=0.25, bulge=1.0):
    """Tapered brush stroke along path d. Width w at the belly, thinning to tip*w at the ends."""
    pts = sample(d)
    n = len(pts)
    L = [0.0]
    for a, b in zip(pts, pts[1:]): L.append(L[-1] + math.dist(a, b))
    tot = L[-1] or 1
    left, right = [], []
    for i, p in enumerate(pts):
        t = L[i] / tot
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        m = math.hypot(dx, dy) or 1
        nx, ny = -dy / m, dx / m
        f = 1.0
        if t < taper[0]: f = tip + (1 - tip) * math.sin(t / taper[0] * math.pi / 2)
        elif t > 1 - taper[1]: f = tip + (1 - tip) * math.sin((1 - t) / taper[1] * math.pi / 2)
        f *= 1 + (bulge - 1) * math.sin(t * math.pi)
        f *= 1 + WOBBLE * math.sin(t * 11 + len(d) % 7) * math.sin(t * math.pi)
        h = w * f / 2
        left.append((p[0] + nx * h, p[1] + ny * h)); right.append((p[0] - nx * h, p[1] - ny * h))
    poly = left + right[::-1]
    return 'M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in poly) + 'Z'

parts = []
def fill(d, color=INK, cls=None):
    c = f' class="{cls}"' if cls else ''
    parts.append(f'<path{c} fill="{color}" d="{d}"/>')
def line(d, w=4.6, color=INK, **k):
    parts.append(f'<path fill="{color}" d="{brush(d, w, **k)}"/>')
def white(d):
    parts.append(f'<path fill="#fff" d="{d}"/>')


# ------------------------------------------------------------------ body
white('M26 440 C36 384 80 352 140 338 C160 333 178 326 188 314 L232 312 C244 326 262 334 284 340 C338 354 368 388 378 440 Z')
line('M28 440 C40 386 84 354 142 339 C162 334 178 326 188 316', 6.0, taper=(0.04, 0.3), bulge=1.1)
line('M232 314 C244 328 264 336 286 341 C338 355 366 390 376 440', 6.0, taper=(0.3, 0.04), bulge=1.1)
# crew neckline
line('M190 318 C198 330 222 332 232 318', 5.0)
# small pointed shirt-collar flaps over the crew neck
white('M189 317 C182 328 172 338 162 346 C170 349 180 348 186 344 C188 336 190 326 189 317 Z')
line('M189 317 C182 328 172 338 162 346 C170 349 180 348 186 344', 4.6, taper=(0.15, 0.2))
white('M231 317 C238 328 248 338 258 346 C250 349 240 348 234 344 C232 336 230 326 231 317 Z')
line('M231 317 C238 328 248 338 258 346 C250 349 240 348 234 344', 4.6, taper=(0.15, 0.2))
# jacket front opening, gently curved
line('M184 344 C180 376 177 408 176 440', 4.8, taper=(0.3, 0.04))
line('M236 344 C241 376 245 408 248 440', 4.8, taper=(0.3, 0.04))
# sleeve seams
line('M104 362 C114 384 118 410 118 440', 3.6, taper=(0.4, 0.04))
line('M318 364 C308 386 304 412 304 440', 3.6, taper=(0.4, 0.04))

# ------------------------------------------------------------------ head (tilted group)
head = []
def H(fn, *a, **k):
    start = len(parts); fn(*a, **k); head.extend(parts[start:]); del parts[start:]

# back hair on the right: drapes behind the shoulder, swelling out over it, clumps of different lengths
H(fill, 'M206 92 C268 92 300 132 302 196 C304 240 306 270 316 304 C326 336 340 362 346 392 C348 404 352 412 358 420 C348 418 342 412 338 404 C338 416 334 426 328 434 C326 422 322 412 316 404 C312 410 306 414 298 416 C300 406 298 396 292 386 C282 356 268 324 262 296 C260 288 258 284 258 280 Z')
H(line, 'M312 330 C320 352 328 370 334 390', 1.8, color='#fff', taper=(0.3, 0.4), tip=0.1)

# neck (narrower), clean concave lines
H(white, 'M192 258 L226 258 L230 318 L189 318 Z')
H(line, 'M195 278 C193 294 192 306 191 318', 4.0, taper=(0.3, 0.1))
H(line, 'M224 276 C225 292 227 306 229 318', 4.0, taper=(0.3, 0.1))

# face: round, broad U chin
H(white, 'M200 120 C252 120 280 156 280 204 C280 236 268 258 250 268 C234 276 218 279 204 279 C186 278 168 270 156 254 C144 238 140 210 140 182 C144 142 168 120 200 120 Z')
H(line, 'M279 208 C278 236 268 256 250 267 C236 275 220 279 204 279 C190 279 172 272 160 260 C156 256 152 250 150 244', 5.6, taper=(0.12, 0.2), bulge=1.12)

# front hair on the left: S-curved inner edge, swelling over the shoulder, uneven clumps
H(fill, 'M168 104 C136 116 120 150 120 196 C118 240 112 270 104 300 C94 336 84 364 80 392 C78 404 74 414 68 424 C78 420 84 414 88 406 C88 418 90 428 96 436 C98 424 102 414 106 406 C110 414 116 420 124 424 C122 414 122 404 126 394 C132 398 136 402 140 408 C138 390 138 372 140 352 C142 320 152 300 150 262 C148 228 156 190 162 164 C166 144 172 128 184 112 Z')
H(line, 'M118 318 C114 344 108 368 100 392', 1.8, color='#fff', taper=(0.3, 0.4), tip=0.1)

# crown with a soft side part
H(fill, 'M118 196 C112 136 146 92 206 92 C262 92 296 128 292 186 C286 170 278 160 270 156 C262 150 254 148 244 150 C226 140 206 138 190 142 C170 146 152 154 140 168 C130 178 122 188 118 196 Z')
# hair tucked behind the ear
H(fill, 'M270 156 C282 164 292 180 292 196 C292 210 286 222 278 230 C276 212 274 196 266 186 Z')

# ear + hoop (white ring outlined in ink so it reads on the black hair)
H(white, 'M268 196 C282 190 290 202 286 214 C283 224 276 228 268 228 Z')
H(line, 'M270 196 C284 190 291 204 286 216 C283 224 276 228 270 228', 4.4, taper=(0.2, 0.3))
H(line, 'M274 206 C279 207 280 214 276 217', 2.4, taper=(0.4, 0.4))
head_raw = '<circle cx="276" cy="238" r="6" fill="none" stroke="#fff" stroke-width="1.8"/>'
H(lambda: parts.append(head_raw))

# see-through bangs: uneven spacing, a couple of strands meeting in tufts, varied lengths,
# curving toward the face centre, with a wider gap above the right eye
for d, w in [
    ('M150 162 C152 172 153 182 152 192', 2.6),
    ('M159 156 C163 168 165 180 162 192', 3.0),
    ('M168 152 C171 166 169 180 162 192', 3.6),
    ('M184 146 C188 160 190 174 187 188', 3.8),
    ('M196 143 C198 151 198 159 196 167', 2.8),
    ('M207 142 C209 156 207 170 201 182', 3.6),
    ('M240 147 C239 160 236 172 230 183', 3.4),
    ('M251 151 C251 164 243 176 230 183', 3.0),
    ('M262 156 C263 165 264 172 264 180', 2.2),
    ('M219 143 C221 154 221 164 219 174', 1.7),
    ('M228 145 C230 154 230 162 228 170', 1.5),
]:
    H(line, d, w, taper=(0.03, 0.85), tip=0.1)
# longer wisps hanging past the cheeks
H(line, 'M144 166 C140 190 140 214 146 238 C148 244 151 248 154 250', 2.6, taper=(0.05, 0.8), tip=0.1)
H(line, 'M262 158 C268 182 270 204 268 226 C267 232 265 236 262 238', 2.4, taper=(0.05, 0.8), tip=0.1)

# a single flyaway on top, and windblown strands at the sides
H(line, 'M232 96 C242 84 254 82 262 88', 2.2, taper=(0.3, 0.5), tip=0.1)
H(line, 'M300 234 C311 244 318 257 322 272', 2.2, taper=(0.3, 0.6), tip=0.1)
H(line, 'M305 262 C315 270 322 282 326 296', 2.0, taper=(0.3, 0.6), tip=0.1)

# glossy highlights: one small oval and two short curved dashes
H(fill, 'M152 126 C155 120 161 117 164 118 C165 121 159 127 155 130 C152 131 150 129 152 126 Z', '#fff')
H(line, 'M171 110 C175 106 180 105 184 105', 3.6, color='#fff', taper=(0.3, 0.3), tip=0.5)
H(line, 'M190 102 C192 101 194 101 196 101', 3.4, color='#fff', taper=(0.3, 0.3), tip=0.6)
# thin white strand lines inside the hair
H(line, 'M132 230 C130 270 126 310 118 350', 2.0, color='#fff', taper=(0.3, 0.4), tip=0.1)
H(line, 'M290 230 C292 270 296 310 304 350', 2.0, color='#fff', taper=(0.3, 0.4), tip=0.1)

# sleepy closed eyes: short, nearly flat, bowing slightly down, tiny flick at the outer corner
H(line, 'M160 227 C167 231 177 231 184 227', 4.4, taper=(0.3, 0.3), tip=0.3)
H(line, 'M160 227 C157 226 155 224 154 222', 2.4, taper=(0.2, 0.6), tip=0.2)
H(line, 'M220 235 C227 239 237 239 244 235', 4.4, taper=(0.3, 0.3), tip=0.3)
H(line, 'M244 235 C247 234 249 232 250 230', 2.4, taper=(0.2, 0.6), tip=0.2)

# hatched blush (light grey), just under the eyes
for x0, y0 in ((160, 240), (220, 248)):
    for k in range(5):
        x = x0 + k * 5
        H(line, f'M{x + 3:.1f} {y0:.1f} L{x:.1f} {y0 + 9:.1f}', 2.0, color='#bdbdbd', taper=(0.3, 0.3), tip=0.5)

parts.append('<g transform="rotate(-6 210 300)">' + ''.join(head) + '</g>')
parts[:] = ['<g transform="translate(200 0) scale(1.1) translate(-200 -62)">'] + parts + ['</g>']

frag = '\n'.join(parts)
open(os.path.join(HERE, 'ink.svg'), 'w').write(frag)
open(os.path.join(HERE, 'preview.svg'), 'w').write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 440" width="800" height="880">'
    f'<rect width="400" height="440" fill="#fff"/>{frag}</svg>')
print('ok', len(parts))
