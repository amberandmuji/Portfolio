/* Mini Amber, rendered live in 3D (three.js).
   Soft "toy render" look: physically based materials, studio environment light, warm key + rim light,
   soft contact shadow. Outfit from Amber's photo: tan suede zip jacket, brown crewneck, dark trousers,
   long brown hair with wispy bangs and warm auburn ends.

   World units: feet at y = 0, top of head ≈ 1.47. The DOM box she lives in is 1.65 units tall,
   the canvas overhangs it (see CANVAS) so raised arms aren't clipped. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* Soft "clay render" shading for every material on this page:
   wrap lighting lets light reach past the terminator, tinted warm like light scattering under skin/felt,
   and a faint per-pixel grain gives the painterly film texture of an offline render. */
const DIFFUSE = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );';
if (!THREE.ShaderChunk.lights_physical_pars_fragment.includes('clayWrap')) {
  THREE.ShaderChunk.lights_physical_pars_fragment = THREE.ShaderChunk.lights_physical_pars_fragment.replace(DIFFUSE, `
    float clayNL = dot( geometryNormal, directLight.direction );
    float clayWrap = saturate( ( clayNL + 0.45 ) / 1.45 );
    vec3 clayTint = mix( vec3( 1.0, 0.54, 0.42 ), vec3( 1.0 ), smoothstep( 0.0, 0.3, clayNL ) );
    reflectedLight.directDiffuse += clayWrap * clayTint * directLight.color * BRDF_Lambert( material.diffuseColor );`);
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
    'outgoingLight *= 1.0 + ( fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) - 0.5 ) * 0.11;\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');
}

export const BOX_H = 1.65;
// canvas overhang relative to the box: left/top offsets and size, as fractions of the box
export const CANVAS = { left: -0.4, top: -0.24, w: 1.8, h: 1.34 };   // generous headroom so hair and raised arms are never clipped

type V3 = [number, number, number];
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const D = THREE.MathUtils.degToRad;

/* ---------------- poses ---------------- */
// Arms/legs: [forward, outward] in degrees (outward = away from the body's centre line).
// Elbows: [bend forward, twist outward]; knees: bend (negative = shin swings back).
// L / R are the sides as seen on screen.
export interface Pose {
  lsh?: [number, number]; rsh?: [number, number]; lel?: [number, number]; rel?: [number, number];
  lhip?: [number, number]; rhip?: [number, number]; lkn?: number; rkn?: number;
  head?: V3; y?: number; yaw?: number; lean?: number; pitch?: number; x?: number;
  eyes?: 'open' | 'happy'; mouth?: 'neutral' | 'smile' | 'open' | 'puff';
}
const STAND: Pose = { lsh: [2, 11], rsh: [2, 11], lel: [10, 0], rel: [10, 0], lhip: [0, 2], rhip: [0, 2], eyes: 'open', mouth: 'smile' };
const FLOOR: Pose = { y: -0.74, lhip: [86, 8], rhip: [86, 8], lkn: -14, rkn: -10 };
export const POSES: Record<string, Pose> = {
  stand: STAND,
  stand_happy: { ...STAND, eyes: 'happy', mouth: 'smile', head: [0, 0, -4] },
  sit: { yaw: -16, lsh: [18, 4], rsh: [18, 4], lel: [28, 0], rel: [28, 0], lhip: [86, 5], rhip: [86, 5], lkn: -82, rkn: -94, eyes: 'open', mouth: 'smile', head: [4, 0, 3] },
  sit_happy: { yaw: -16, lsh: [18, 4], rsh: [18, 4], lel: [28, 0], rel: [28, 0], lhip: [86, 5], rhip: [86, 5], lkn: -70, rkn: -100, eyes: 'happy', mouth: 'open', head: [-2, 0, -4] },
  held: { lsh: [0, 160], rsh: [0, 160], lel: [0, -12], rel: [0, -12], lhip: [8, 8], rhip: [-6, 5], lkn: -18, rkn: -30, eyes: 'open', mouth: 'open', head: [-6, 0, 0] },
  cheer: { lsh: [8, 150], rsh: [8, 150], lel: [0, -18], rel: [0, -18], lhip: [0, 5], rhip: [0, 5], eyes: 'happy', mouth: 'open', head: [-8, 0, 0] },
  dance_a: { lsh: [0, 92], rsh: [0, 92], lel: [0, -20], rel: [0, -20], lhip: [0, 9], rhip: [0, 9], eyes: 'happy', mouth: 'smile', head: [0, 0, -7], lean: -3 },
  dance_b: { lsh: [10, 70], rsh: [-6, 112], lel: [0, 24], rel: [0, -20], lhip: [0, 3], rhip: [55, 6], rkn: -50, eyes: 'happy', mouth: 'open', head: [0, 0, 7], lean: 4 },
  sip: { ...STAND, rsh: [62, -12], rel: [118, 0], eyes: 'happy', mouth: 'puff', head: [6, 0, 0] },
  sip2: { ...STAND, lsh: [64, -16], lel: [116, 0], rsh: [64, -16], rel: [116, 0], eyes: 'happy', mouth: 'puff', head: [4, 0, 0] },
  sip2b: { ...STAND, lsh: [62, -14], lel: [120, 0], rsh: [62, -14], rel: [120, 0], eyes: 'happy', mouth: 'puff', head: [7, 0, 3] },
  mic: { ...STAND, lsh: [10, 28], lel: [40, 0], rsh: [58, -10], rel: [112, 0], eyes: 'happy', mouth: 'open', head: [-4, 0, 4] },
  pet: { ...STAND, lsh: [72, 6], lel: [8, 0], eyes: 'happy', mouth: 'smile', head: [14, 0, -6], lean: -4 },
  sit_hold: { ...FLOOR, lsh: [42, -8], rsh: [42, -8], lel: [62, 0], rel: [62, 0], eyes: 'open', mouth: 'smile', head: [12, 0, 0] },
  sit_hold_happy: { ...FLOOR, lsh: [42, -8], rsh: [42, -8], lel: [76, 0], rel: [76, 0], eyes: 'happy', mouth: 'open', head: [-4, 0, -5] },
  read_show: { ...STAND, lsh: [52, -16], lel: [78, 0], rsh: [52, -16], rel: [78, 0], eyes: 'happy', head: [2, 0, -7] },
  read: { ...STAND, lsh: [52, -16], lel: [84, 0], rsh: [52, -16], rel: [84, 0], eyes: 'open', head: [18, 0, 0] },
  look_l: { ...STAND, head: [0, -38, 0], eyes: 'open' },
  look_r: { ...STAND, head: [0, 38, 0], eyes: 'open' },
  bouquet: { ...STAND, lsh: [42, -18], lel: [66, 0], rsh: [42, -18], rel: [66, 0], eyes: 'happy', head: [-2, 0, -6] },
  pet_up: { ...STAND, lsh: [30, 148], lel: [0, -16], eyes: 'happy', head: [-10, 0, -8] },
  pet_up2: { ...STAND, lsh: [30, 140], lel: [0, 14], eyes: 'happy', head: [-8, 0, -4] },
  sit_laugh: { lsh: [30, -6], rsh: [30, -6], lel: [62, 0], rel: [62, 0], lhip: [86, 5], rhip: [86, 5], lkn: -86, rkn: -86, eyes: 'happy', mouth: 'open', head: [-12, 0, 0] },
  sit_laugh2: { lsh: [34, -2], rsh: [34, -2], lel: [70, 0], rel: [70, 0], lhip: [86, 5], rhip: [86, 5], lkn: -86, rkn: -86, eyes: 'happy', mouth: 'open', head: [-4, 0, 6], lean: 3 },
  climb_top: { yaw: 180, lsh: [8, 170], rsh: [8, 170], lel: [0, -4], rel: [0, -4], lhip: [24, 8], lkn: -36, rhip: [4, 6], rkn: -6, eyes: 'open', mouth: 'smile' },
  // lying on her back (seen from the side), one knee up and the other leg crossed over it, reading
  lie_read: { yaw: 90, pitch: -90, y: .34, x: 1.05, lsh: [96, -8], rsh: [96, -8], lel: [46, 0], rel: [46, 0], rhip: [72, 2], rkn: -112, lhip: [60, -10], lkn: -14, head: [16, 0, 0], eyes: 'open', mouth: 'smile' },
  lie_read2: { yaw: 90, pitch: -90, y: .34, x: 1.05, lsh: [96, -8], rsh: [96, -8], lel: [46, 0], rel: [46, 0], rhip: [72, 2], rkn: -112, lhip: [60, -10], lkn: -36, head: [14, 0, 2], eyes: 'happy', mouth: 'smile' },
  climb_a: { yaw: 180, lsh: [10, 168], rsh: [6, 42], lel: [0, -8], rel: [40, 0], lhip: [34, 12], lkn: -50, rhip: [0, 6], rkn: -6, eyes: 'open', mouth: 'smile' },
  climb_b: { yaw: 180, lsh: [6, 42], rsh: [10, 168], lel: [40, 0], rel: [0, -8], lhip: [0, 6], lkn: -6, rhip: [34, 12], rkn: -50, eyes: 'open', mouth: 'smile' },
};

/* ---------------- materials ---------------- */
function noiseTexture(size = 128, amp = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!, img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const n = 128 + (Math.random() - .5) * 255 * amp; img.data.set([n, n, n, 255], i * 4); }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); return t;
}
function fabricTexture(kind: 'rib' | 'twill' | 'knit', size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!, img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let n = 0;
    if (kind === 'rib') n = Math.sin(x / size * Math.PI * 2 * 16) * .5 + .5;
    else if (kind === 'twill') n = Math.sin((x + y) / size * Math.PI * 2 * 22) * .5 + .5;
    else n = (Math.sin(x / size * Math.PI * 2 * 14) * Math.sin(y / size * Math.PI * 2 * 18) * .5 + .5);
    n = n * .75 + Math.random() * .25;
    const v = 128 + (n - .5) * 200; img.data.set([v, v, v, 255], (y * size + x) * 4);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t;
}
/** fine strand grooves running along each lock (used as a bump map; u goes around the lock, v along it) */
function strandTexture(size = 256) {
  const c = document.createElement('canvas'); c.width = size; c.height = 8;
  const g = c.getContext('2d')!;
  for (let x = 0; x < size; x++) {
    const n = .5 + .28 * Math.sin(x / size * Math.PI * 2 * 9) + .22 * Math.sin(x / size * Math.PI * 2 * 23 + 1.3) + (Math.random() - .5) * .35;
    const v = Math.max(0, Math.min(255, n * 255)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, 8);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function blushTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(236,110,104,.4)'); r.addColorStop(.5, 'rgba(236,110,104,.18)'); r.addColorStop(1, 'rgba(236,110,104,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,.42)'); r.addColorStop(.55, 'rgba(0,0,0,.16)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeMaterials() {
  const grain = noiseTexture(128, .9);
  return {
    skin: new THREE.MeshPhysicalMaterial({ color: '#f0c3a2', roughness: .7, sheen: .35, sheenColor: new THREE.Color('#ffd5c4'), sheenRoughness: .5 }),
    face: new THREE.MeshPhysicalMaterial({ color: '#f2c9a8', roughness: .68, sheen: .4, sheenColor: new THREE.Color('#ffd9c8'), sheenRoughness: .45 }),
    suede: new THREE.MeshPhysicalMaterial({ color: '#8e5c38', roughness: .92, sheen: .9, sheenColor: new THREE.Color('#caa07a'), sheenRoughness: .5, bumpMap: grain, bumpScale: .25, side: THREE.DoubleSide }),
    collar: new THREE.MeshPhysicalMaterial({ color: '#c98a55', roughness: .9, sheen: .8, sheenColor: new THREE.Color('#e8b888'), side: THREE.DoubleSide }),
    suedeDark: new THREE.MeshPhysicalMaterial({ color: '#724628', roughness: .92, sheen: .8, sheenColor: new THREE.Color('#b98a60'), sheenRoughness: .6, bumpMap: grain, bumpScale: .25, side: THREE.DoubleSide }),
    knit: new THREE.MeshPhysicalMaterial({ color: '#6b3e26', roughness: .96, sheen: .7, sheenColor: new THREE.Color('#b0684a'), bumpMap: fabricTexture('rib'), bumpScale: 1.4 }),
    rib: new THREE.MeshPhysicalMaterial({ color: '#5a321e', roughness: .96, sheen: .6, sheenColor: new THREE.Color('#9a5a40'), bumpMap: fabricTexture('rib'), bumpScale: 1.6 }),
    neck: new THREE.MeshPhysicalMaterial({ color: '#e2ab8f', roughness: .85 }),
    nose: new THREE.MeshPhysicalMaterial({ color: '#f2b49a', roughness: .65, sheen: .4, sheenColor: new THREE.Color('#ffd0c0') }),
    soleWhite: new THREE.MeshPhysicalMaterial({ color: '#f1ebe1', roughness: .7 }),
    sneaker: new THREE.MeshPhysicalMaterial({ color: '#6b4632', roughness: .8, sheen: .6, sheenColor: new THREE.Color('#b88a68'), bumpMap: fabricTexture('knit'), bumpScale: .4 }),
    cuff: new THREE.MeshPhysicalMaterial({ color: '#4a403a', roughness: .85 }),
    pants: new THREE.MeshPhysicalMaterial({ color: '#33281f', roughness: .85, bumpMap: fabricTexture('twill'), bumpScale: .5, sheen: .5, sheenColor: new THREE.Color('#6a6064'), sheenRoughness: .5 }),
    shoe: new THREE.MeshPhysicalMaterial({ color: '#5a3c2a', roughness: .5, sheen: .3, sheenColor: new THREE.Color('#9a7060'), clearcoat: .25, clearcoatRoughness: .5 }),
    lace: new THREE.MeshPhysicalMaterial({ color: '#f4efe6', roughness: .8 }),
    sole: new THREE.MeshPhysicalMaterial({ color: '#2e221b', roughness: .7 }),
    hair: new THREE.MeshPhysicalMaterial({ vertexColors: true, bumpMap: strandTexture(), bumpScale: 1.1, roughness: .58, sheen: .5, sheenColor: new THREE.Color('#c08260'), sheenRoughness: .45, clearcoat: .3, clearcoatRoughness: .45, side: THREE.DoubleSide }),
    scalp: new THREE.MeshPhysicalMaterial({ color: '#24150f', roughness: .58, sheen: .5, sheenColor: new THREE.Color('#c08260'), clearcoat: .3, clearcoatRoughness: .45, bumpMap: (() => { const t = strandTexture(); t.repeat.set(16, 1); return t; })(), bumpScale: 1.1, side: THREE.DoubleSide }),
    eye: new THREE.MeshPhysicalMaterial({ color: '#2a1a14', roughness: .5, sheen: .3, sheenColor: new THREE.Color('#6a4a40') }),
    glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    lip: new THREE.MeshPhysicalMaterial({ color: '#b65a50', roughness: .6 }),
    mouth: new THREE.MeshPhysicalMaterial({ color: '#7d2a27', roughness: .6 }),
    tongue: new THREE.MeshPhysicalMaterial({ color: '#e07a74', roughness: .6 }),
    blush: new THREE.MeshBasicMaterial({ map: blushTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
    metal: new THREE.MeshPhysicalMaterial({ color: '#cfc8bc', metalness: .8, roughness: .3 }),
    tape: new THREE.MeshPhysicalMaterial({ color: '#4a3020', roughness: .8 }),
    stitch: new THREE.MeshPhysicalMaterial({ color: '#c98a58', roughness: .8 }),
    stitchDark: new THREE.MeshPhysicalMaterial({ color: '#6e5c52', roughness: .8 }),
    button: new THREE.MeshPhysicalMaterial({ color: '#3a2a20', roughness: .35, clearcoat: .6 }),
  };
}
type Mats = ReturnType<typeof makeMaterials>;

/* ---------------- geometry helpers ---------------- */
// profiles are written top-to-bottom; LatheGeometry wants bottom-to-top for outward-facing normals
const lathe = (pts: [number, number][], seg = 40, phiStart = 0, phiLen = Math.PI * 2) => {
  const p = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
  return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen);
};
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent?: THREE.Object3D, pos?: V3, scale?: V3, rot?: V3) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  if (pos) m.position.set(...pos);
  if (scale) m.scale.set(...scale);
  if (rot) m.rotation.set(...rot);
  parent?.add(m); return m;
}
const group = (parent: THREE.Object3D, pos: V3 = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };

/** A tapered, flattened hair clump along a curve. `centre(p)` gives the point the clump lies "on" (for its normal). */
function clump(points: THREE.Vector3[], o: { w0: number; w1: number; t0: number; t1: number; centre: (p: THREE.Vector3) => THREE.Vector3; root: string; tip: string; seg?: number; ombre?: number; fullRoot?: boolean; groove?: number; toneVar?: number }) {
  const seg = Math.round((o.seg ?? 28) * 1.5), radial = 18;
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const pos: number[] = [], col: number[] = [], idx: number[] = [], uv: number[] = [];
  const tone = 1 - (o.toneVar ?? .3) / 2 + Math.random() * (o.toneVar ?? .3);   // each lock a slightly different shade, like painted strands
  const cRoot = new THREE.Color(o.root).multiplyScalar(tone), cTip = new THREE.Color(o.tip).multiplyScalar(tone), c = new THREE.Color();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPoint(u), T = curve.getTangent(u);
    const N = P.clone().sub(o.centre(P)).normalize();
    N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    const B = new THREE.Vector3().crossVectors(T, N).normalize();
    const taper = Math.pow(u, 1.25), tipRound = u > .9 ? Math.sqrt(Math.max(0, 1 - ((u - .9) / .1) ** 2)) : (u < .08 && !o.fullRoot ? .35 + .65 * Math.sin(u / .08 * Math.PI / 2) : 1);
    const w = (o.w0 + (o.w1 - o.w0) * taper) * tipRound + .0015, t = (o.t0 + (o.t1 - o.t0) * u) * tipRound + .001;
    const om = THREE.MathUtils.smoothstep(u, o.ombre ?? .5, 1);
    c.copy(cRoot).lerp(cTip, om);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      // rounded-rectangle (superellipse) section: flat faces with soft edges, like sculpted ribbon locks
      const ca = Math.cos(a), sa = Math.sin(a), ex = .55;
      const p = P.clone().addScaledVector(B, Math.sign(ca) * Math.abs(ca) ** ex * w).addScaledVector(N, Math.sign(sa) * Math.abs(sa) ** ex * t);
      const gs = o.groove ?? .22, groove = 1 - gs + gs * Math.pow(Math.abs(Math.sin(a)), .5);   // edges darker = carved grooves between clumps
      pos.push(p.x, p.y, p.z); col.push(c.r * groove, c.g * groove, c.b * groove); uv.push(j / radial, u);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + (j + 1) % radial, cc = a + radial, d = b + radial;
    idx.push(a, cc, b, b, cc, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ---------------- the figure ---------------- */
function buildFigure(M: Mats) {
  const root = new THREE.Group();
  const body = group(root);
  const J: Record<string, THREE.Group> = {};
  // dashed stitching: short capsules along a polyline
  const stitches = (pts: THREE.Vector3[], parent: THREE.Object3D, mat: THREE.Material = M.stitch) => {
    const c = new THREE.CatmullRomCurve3(pts), n = Math.floor(c.getLength() / .014);
    for (let i = 0; i < n; i += 2) {
      const a = c.getPointAt(i / n), b = c.getPointAt(Math.min(1, (i + 1) / n));
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.0016, .0016, a.distanceTo(b), 5), mat);
      m.position.copy(a).add(b).multiplyScalar(.5); m.lookAt(b.clone().add(m.parent ? v(0, 0, 0) : v(0, 0, 0)));
      m.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
      parent.add(m);
    }
  };

  /* trousers + hips */
  mesh(new THREE.CylinderGeometry(.15, .16, .16, 32), M.pants, body, [0, .82, 0], [1, 1, .74]);
  for (const side of [-1, 1]) {
    const hip = J[side < 0 ? 'lhip' : 'rhip'] = group(body, [side * .075, .84, 0]);
    // open-ended balloon segments that meet a knee sphere of the same radius and slope, so no line shows at the knee
    mesh(lathe([[.086, .04], [.085, -.08], [.081, -.22], [.076, -.33], [.074, -.37]], 56), M.pants, hip, [0, 0, 0], [1, 1, .94]);
    mesh(new THREE.SphereGeometry(.074, 40, 24), M.pants, hip, [0, -.37, 0], [1, 1, .94]);   // fills the bend
    for (const fy of [-.33, -.4]) mesh(new THREE.TorusGeometry(.073, .005, 8, 40, Math.PI * .9), M.pants, hip, [0, fy, -.005], [1, 1, .94], [Math.PI / 2, 0, Math.PI * 1.05]);   // folds behind the knee
    { const pts: THREE.Vector3[] = []; for (let y = -.02; y >= -.37; y -= .02) { const r = .086 - (-y / .37) * .012 + .002; pts.push(v(side * r * .97, y, .012)); } stitches(pts, hip, M.stitchDark); }
    const knee = J[side < 0 ? 'lkn' : 'rkn'] = group(hip, [0, -.37, 0]);
    mesh(lathe([[.074, 0], [.073, -.1], [.068, -.24], [.062, -.34], [.06, -.38]], 56), M.pants, knee, [0, 0, 0], [1, 1, .94]);
    mesh(new THREE.TorusGeometry(.06, .011, 10, 32), M.pants, knee, [0, -.375, 0], [1, 1, .94], [Math.PI / 2, 0, 0]);   // rolled hem
    mesh(new THREE.TorusGeometry(.061, .006, 8, 32), M.pants, knee, [0, -.355, 0], [1, 1, .94], [Math.PI / 2, 0, 0]);   // second fold of the cuff
    { const pts: THREE.Vector3[] = []; for (let y = 0; y >= -.34; y -= .02) { const r = .074 - (-y / .38) * .014 + .002; pts.push(v(side * r * .97, y, .012)); } stitches(pts, knee, M.stitchDark); }
    // shoe
    const shoe = group(knee, [side * .008, -.372, .025]); shoe.rotation.y = side * .12; shoe.scale.setScalar(1.38);   // collar tucked into the hem
    const ss = new THREE.Shape(); { const L = .095, B = .045, W = .038, r = .03;
      ss.moveTo(-W, -B + r); ss.lineTo(-W, L - r); ss.quadraticCurveTo(-W, L, -W + r, L); ss.lineTo(W - r, L); ss.quadraticCurveTo(W, L, W, L - r); ss.lineTo(W, -B + r); ss.quadraticCurveTo(W, -B, W - r, -B); ss.lineTo(-W + r, -B); ss.quadraticCurveTo(-W, -B, -W, -B + r); }
    mesh(new THREE.ExtrudeGeometry(ss, { depth: .02, bevelEnabled: true, bevelThickness: .005, bevelSize: .004, bevelSegments: 3 }), M.soleWhite, shoe, [0, -.058, 0], [1.05, 1.04, 1], [Math.PI / 2, 0, 0]);
    mesh(new THREE.TorusGeometry(.046, .0025, 6, 40), M.sole, shoe, [0, -.066, .025], [.86, 1.6, 1], [Math.PI / 2, 0, 0]);   // dark stripe on the sole
    mesh(new THREE.CapsuleGeometry(.037, .09, 10, 24), M.sneaker, shoe, [0, -.032, .018], [1, .82, 1], [Math.PI / 2, 0, 0]);
    mesh(new THREE.SphereGeometry(.039, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.soleWhite, shoe, [0, -.05, .07], [1, .62, 1.05], [Math.PI / 2.6, 0, 0]);   // rubber toe cap
    mesh(new THREE.TorusGeometry(.03, .006, 8, 24), M.soleWhite, shoe, [0, -.004, -.018], [1, 1, .9], [Math.PI / 2, 0, 0]);   // padded collar
    for (let k = 0; k < 3; k++) {
      mesh(new THREE.CylinderGeometry(.004, .004, .05, 6), M.lace, shoe, [0, -.008 - k * .004, .0 + k * .017], [1, 1, 1], [.35, .5 * (k % 2 ? 1 : -1), Math.PI / 2]);
      mesh(new THREE.CylinderGeometry(.004, .004, .05, 6), M.lace, shoe, [0, -.008 - k * .004, .0 + k * .017], [1, 1, 1], [.35, -.5 * (k % 2 ? 1 : -1), Math.PI / 2]);
    }
    
  }

  /* torso: crewneck underneath, jacket open at the front */
  const torso = group(body, [0, .18, 0]); torso.scale.set(.8, 1, .9);
  mesh(lathe([[.0, 1.0], [.105, 1.0], [.19, .978], [.245, .94], [.262, .84], [.266, .6], [.27, .48], [0, .48]], 48), M.knit, torso, [0, 0, 0], [1, 1, .72]);
  mesh(new THREE.TorusGeometry(.098, .028, 14, 48), M.rib, torso, [0, .996, .006], [1, .82, .9], [Math.PI / 2, 0, 0]);
  const gap = .52;   // jacket opening at the front (radians)
  const JK: [number, number][] = [[.116, 1.008], [.165, 1.0], [.215, .982], [.255, .955], [.278, .915], [.288, .86], [.29, .78], [.294, .66], [.3, .54], [.304, .47]];
  mesh(lathe(JK, 64, gap / 2, Math.PI * 2 - gap), M.suede, torso, [0, 0, 0], [1, 1, .74]);
  // rounded, thick hem band (the shell itself is thin, so edges get soft rolled trims)
  mesh(lathe([[.305, .515], [.315, .508], [.319, .49], [.315, .472], [.303, .464], [.293, .47]], 64, gap / 2, Math.PI * 2 - gap), M.suede, torso, [0, 0, 0], [1, 1, .74]);
  mesh(lathe([[.303, .542], [.309, .539], [.307, .536]], 64, gap / 2, Math.PI * 2 - gap), M.suedeDark, torso, [0, 0, 0], [1, 1, .74]);
  // zipper tapes along both edges of the opening
  const rAt = (y: number) => { for (let i = 0; i < JK.length - 1; i++) { const [r0, y0] = JK[i], [r1, y1] = JK[i + 1]; if (y <= y0 && y >= y1) return r0 + (r1 - r0) * (y0 - y) / (y0 - y1); } return .3; };
  { const pts: THREE.Vector3[] = []; for (let a = gap / 2 + .05; a <= Math.PI * 2 - gap / 2 - .05; a += .05) { const r = rAt(.548) + .004; pts.push(v(Math.sin(a) * r, .548, Math.cos(a) * r * .74)); } stitches(pts, torso); }
  for (const s of [-1, 1]) {
    const phi = s * gap / 2, pts: THREE.Vector3[] = [];
    for (let y = .995; y >= .47; y -= .03) { const r = rAt(y) + .002; pts.push(v(Math.sin(phi) * r, y, Math.cos(phi) * r * .74)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .011, 10), M.suede, torso);   // soft rolled front edge
    const zp = pts.map((p) => p.clone().add(v(-Math.sin(phi) * .004, 0, .004)));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zp.map((p) => p.clone().add(v(0, 0, -.002)))), 60, .008, 8), M.tape, torso);
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zp), 60, .0055, 8), M.metal, torso);
    // dashed top-stitching just inside the front edge
    const sp2 = []; for (let y = .99; y >= .48; y -= .02) { const r = rAt(y) + .004, ph2 = phi + s * .07; sp2.push(v(Math.sin(ph2) * r, y, Math.cos(ph2) * r * .74)); }
    stitches(sp2, torso);
    if (s > 0) mesh(new THREE.BoxGeometry(.012, .024, .005), M.metal, torso, [zp[3].x, zp[3].y - .012, zp[3].z + .006]);   // zip pull
    // shirt-style collar flap
    const cs = new THREE.Shape(); cs.moveTo(0, 0); cs.quadraticCurveTo(.06, .012, .105, .0); cs.quadraticCurveTo(.07, -.05, .03, -.085); cs.quadraticCurveTo(.012, -.04, 0, 0);
    const collar = mesh(new THREE.ExtrudeGeometry(cs, { depth: .006, bevelEnabled: true, bevelThickness: .005, bevelSize: .006, bevelSegments: 4, curveSegments: 12 }), M.collar, torso,
      [s * .045, 1.006, .124], [s * 1.3, 1.3, 1.3], [-.55, s * .35, s * -.08]);
    collar.rotation.order = 'YXZ';
    // patch pocket flap + button
    const fs = new THREE.Shape(); fs.moveTo(-.045, 0); fs.lineTo(.045, 0); fs.lineTo(.04, -.026); fs.quadraticCurveTo(0, -.034, -.04, -.026); fs.lineTo(-.045, 0);
    mesh(new THREE.ExtrudeGeometry(fs, { depth: .006, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 3 }), M.suede, torso, [s * .18, .625, .214], [1.6, 1.4, 1], [0, s * .6, 0]);
    mesh(new THREE.SphereGeometry(.009, 12, 10), M.button, torso, [s * .184, .6, .236], [1.2, 1.2, .7]);
  }
  // breast pocket seam + cuff-style hem seam (subtle detail)
  // neck
  mesh(new THREE.CylinderGeometry(.044, .05, .16, 24), M.neck, body, [0, 1.24, 0]);   // a visible neck, matte, a shade darker than the face

  /* arms: puffy suede sleeves, rib cuffs, mitten hands */
  for (const side of [-1, 1]) {
    const k = side < 0 ? 'l' : 'r';
    const sh = J[k + 'sh'] = group(body, [side * .225, 1.11, -.005]);
    sh.scale.setScalar(.92);
    { const pts: THREE.Vector3[] = []; for (let a = 0; a <= Math.PI * 2 + .01; a += .12) pts.push(v(Math.cos(a) * .0745, -.03, Math.sin(a) * .0745 * .95)); stitches(pts, sh); }
    mesh(new THREE.SphereGeometry(.072, 24, 16), M.suede, sh, [-side * .018, -.005, 0], [1, 1, .95]);   // small cap, sunk into the torso so the shoulder line stays smooth
    mesh(lathe([[.066, .02], [.074, -.02], [.08, -.08], [.08, -.15], [.074, -.21], [.07, -.245]], 48), M.suede, sh, [0, 0, 0], [1, 1, .95]);
    const el = J[k + 'el'] = group(sh, [0, -.235, 0]);
    mesh(new THREE.SphereGeometry(.07, 32, 20), M.suede, el, [0, 0, 0], [1, 1, .95]);
    for (const [fy, fr] of [[.02, .064], [-.035, .066]] as [number, number][]) mesh(new THREE.TorusGeometry(fr, .005, 8, 40, Math.PI * .8), M.suede, el, [0, fy, 0], [1, .9, .95], [Math.PI / 2, 0, Math.PI * .95]);   // soft folds in the crook of the elbow
    mesh(lathe([[.07, 0], [.072, -.06], [.068, -.13], [.062, -.18]], 48), M.suede, el, [0, 0, 0], [1, 1, .95]);
    mesh(lathe([[.062, -.165], [.07, -.172], [.072, -.19], [.068, -.21], [.058, -.214]], 48), M.suede, el, [0, 0, 0], [1, 1, .95]);   // rolled cuff
    mesh(new THREE.CylinderGeometry(.052, .05, .02, 24, 1, true), M.suedeDark, el, [0, -.214, 0], [1, 1, .95]);
    mesh(new THREE.SphereGeometry(.009, 10, 8), M.button, el, [side * .045, -.2, .03]);
    const hand = J[k + 'hand'] = group(el, [0, -.262, 0]); hand.scale.setScalar(1.45);
    mesh(new THREE.SphereGeometry(1, 20, 14), M.skin, hand, [0, .006, 0], [.026, .036, .034]);   // palm
    for (let f = 0; f < 4; f++) {                                                                        // fingers, gently curled
      const fz = .021 - f * .014, len = [.024, .028, .026, .02][f];
      const fg = group(hand, [-side * .004, -.026, fz]); fg.rotation.set(0, 0, -side * (.28 + f * .06));   // gently curled in towards the body, together
      mesh(new THREE.CapsuleGeometry(.0088, len, 4, 10), M.skin, fg, [0, -len / 2, 0]);
    }
    const th = group(hand, [-side * .016, -.004, .03]); th.rotation.set(.7, 0, -side * .35);              // thumb
    mesh(new THREE.CapsuleGeometry(.0085, .022, 4, 10), M.skin, th, [0, -.012, 0]);
  }

  /* head */
  const head = J.head = group(body, [0, 1.25, 0]); head.scale.setScalar(.82);
  const C = v(0, .222, 0), R = .25;
  mesh(new THREE.SphereGeometry(R, 64, 48), M.face, head, [C.x, C.y, C.z], [.98, 1.02, .92]).receiveShadow = false;
  const onFace = (x: number, y: number, lift = 0) => {
    const z = .92 * Math.sqrt(Math.max(0, R * R - (x / .98) ** 2 - ((y - C.y) / 1.02) ** 2));
    return v(x, y, z + lift);
  };
  const facing = (m: THREE.Object3D, p: THREE.Vector3) => { m.lookAt(p.clone().sub(C).multiplyScalar(2).add(p).add(head.getWorldPosition(new THREE.Vector3()))); };
  // eyes
  const eyes = new THREE.Group(); head.add(eyes);
  const eyeOpen: THREE.Group[] = [], eyeHappy: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const p = onFace(s * .086, .172, -.004);
    const g = new THREE.Group(); g.position.copy(p); eyes.add(g);
    g.rotation.y = Math.atan2(p.x, p.z * 1.4);
    mesh(new THREE.SphereGeometry(1, 24, 18), M.eye, g, [0, 0, 0], [.022, .034, .012]);
    mesh(new THREE.SphereGeometry(.0058, 10, 8), M.glint, g, [s * .009, .014, .012]);   // catchlight
    eyeOpen.push(g);
    const h = mesh(new THREE.TorusGeometry(.024, .0062, 8, 20, Math.PI * .82), M.eye, head, [p.x, p.y - .006, p.z + .004], [1, 1, 1], [0, Math.atan2(p.x, p.z * 1.4), Math.PI * .09]);
    h.visible = false; eyeHappy.push(h);
  }
  // blush
  for (const s of [-1, 1]) {
    const p = onFace(s * .15, .13, .004);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(.1, .062), M.blush);
    b.position.copy(p); b.rotation.y = Math.atan2(p.x, p.z) * .9; head.add(b);
  }
  // nose (a soft bump) + mouths
  
  mesh(new THREE.SphereGeometry(1, 20, 14), M.nose, head, [0, .142, onFace(0, .142).z - .004], [.019, .015, .014]);
  const mp = onFace(0, .1, .001);
  const mouths = {
    neutral: mesh(new THREE.TorusGeometry(.015, .0045, 8, 16, Math.PI * .7), M.lip, head, [mp.x, mp.y + .008, mp.z], [1, 1, .6], [0, 0, Math.PI + Math.PI * .15]),
    smile: mesh(new THREE.TorusGeometry(.017, .0042, 8, 18, Math.PI * .7), M.lip, head, [mp.x, mp.y + .012, mp.z], [1, 1, .6], [0, 0, Math.PI + Math.PI * .11]),
    open: (() => { const g = new THREE.Group(); g.position.copy(mp); head.add(g);
      mesh(new THREE.SphereGeometry(1, 20, 14), M.mouth, g, [0, 0, -.002], [.022, .017, .01]);
      mesh(new THREE.SphereGeometry(1, 16, 10), M.tongue, g, [0, -.008, .001], [.014, .007, .007]); return g; })(),
    puff: mesh(new THREE.SphereGeometry(.011, 14, 10), M.mouth, head, [mp.x + .004, mp.y, mp.z - .001], [1, 1, .6]),
  };

  /* hair: scalp shell, wispy bangs, face-framing locks, long back clumps with warm ends */
  const ROOT = '#2a1914', TIP = '#8f4e2e';
  mesh(new THREE.SphereGeometry(R + .012, 40, 24, Math.PI * 1.5 - 1.75, 3.5, 1.2, 1.2), M.scalp, head, [C.x, C.y, C.z - .006], [1.02, 1, 1]);
  // crown lift: hair sits a little higher on top of the head for volume (fades out by the temples)
  const lift = (th: number) => .04 * Math.cos(Math.min(th, 1.5) / 1.5 * Math.PI / 2) ** 1.2;
  const dome = (th: number) => 1 + .07 * Math.max(0, Math.cos(th)) ** 2;   // taller, rounder crown (an egg-shaped dome, not a flat top)
  const sp = (th: number, ph: number, r: number) => { const rr = r + lift(th); return v(rr * Math.sin(th) * Math.sin(ph), C.y + rr * Math.cos(th) * dome(th), rr * Math.sin(th) * Math.cos(ph) * .97); };
  const hairSwayPre = group(head, [0, 0, 0]);   // long hair swings with her movement (pivot at the neck top)
  // scalp cap following exactly the same dome as the locks, so their roots sit on it and the crown reads round
  { const prof = (a: number, b: number) => { const p: [number, number][] = []; for (let th = a; th <= b + 1e-6; th += .05) { const q = sp(th, 0, R + .016); p.push([Math.max(.0001, q.z / .97), q.y]); } return p; };
    mesh(lathe(prof(0, .95), 48), M.scalp, head, [0, 0, 0], [1, 1, .97]);                          // crown
    mesh(lathe(prof(.9, 1.25), 48, .8, Math.PI * 2 - 1.6), M.scalp, head, [0, 0, 0], [1, 1, .97]); }  // sides and back only: the forehead stays open under the thin fringe
  // smooth back-of-head shell (like the sculpted crown in the reference): the long locks emerge from under it
  { const prof: [number, number][] = []; for (let th = 0; th <= 1.72; th += .04) { const q = sp(th, 0, R + .017 + .03 * THREE.MathUtils.smootherstep(th, 1.0, 1.72)); /* flares to meet the locks' outline */ prof.push([Math.max(.0001, q.z / .97), q.y]); }
    mesh(lathe(prof, 64, Math.PI - 1.95, 3.9), M.scalp, hairSwayPre, [0, 0, 0], [1, 1, .97]); }
  const onHead = () => C;
  const hairMesh = (g: THREE.BufferGeometry, parent: THREE.Object3D = head) => mesh(g, M.hair, parent);
  const hairSway = hairSwayPre;
  // Hair shape after the reference sculpt: smooth crown with a soft part, pointed wispy bangs that get longer
  // towards the sides (curtain), long face-framing pieces, and many long clumps that flare slightly and end in
  // tapered, gently waving tips. Each clump is darker at its edges, which reads as carved grooves.
  const rnd = (i: number) => (Math.sin(i * 12.9898) * 43758.5453) % 1;
  // Hair after the reference: every lock follows one continuous path — over the dome along its own meridian,
  // then straight down past the face/shoulders with a gentle flare — so the outline flows from the crown without a
  // step, and neighbouring locks run side by side instead of crossing. Bangs fall straight down from the front of the
  // crown; a strand bump map adds the fine combed grooves.
  const lockPath = (ph: number, o: { th0: number; r0: number; r: number; end: number; flare?: number; wave?: number; flick?: number; seed?: number }) => {
    const pts: THREE.Vector3[] = [];
    pts.push(sp(o.th0, ph, o.r0));
    // over the crown the lock stays just under the smooth scalp shell (so the top reads as one clean dome, like the
    // reference) and rises out of it around the back of the head, joining the outline without a step
    // a long, shallow ramp out of the shell so the outline continues without a ledge
    const ramp = (th: number) => th < 1.0 ? R - .03 : R - .03 + (o.r - R + .03) * THREE.MathUtils.smootherstep(th, 1.0, 1.75);
    for (const th of [o.th0 + .35, .95, 1.2, 1.4, 1.6]) if (th > o.th0 + .1) pts.push(sp(th, ph, ramp(th)));
    pts.push(sp(1.75, ph, o.r));
    const top = sp(Math.PI / 2, ph, o.r + .003);
    const r0 = Math.hypot(top.x, top.z / .97), seed = o.seed ?? 0;
    const steps = 5;
    for (let k = 1; k <= steps; k++) {
      const f = k / steps, y = top.y + (o.end - top.y) * f;
      const r = r0 + (o.flare ?? .05) * f * f + (o.wave ?? .006) * Math.sin(f * 7 + seed);
      const a = ph + (o.wave ?? .006) * 2 * Math.sin(f * 5 + seed * 1.7) + (o.flick ?? 0) * f ** 3;
      pts.push(v(Math.sin(a) * r, y, Math.cos(a) * r * .97));
    }
    return pts;
  };
  const sideOf = (p: THREE.Vector3) => v(0, p.y > C.y ? p.y * .2 + C.y * .8 : p.y, 0);   // lock normals face away from the head / the fall axis
  // bangs: straight down from the front of the crown, roots a little apart, tips at the brows; longer at the sides
  const bangs = (n: number, spread: number, layer: number, lens: number[]) => {
    for (let i = 0; i < n; i++) {
      const u = -1 + 2 * i / (n - 1), side = Math.abs(u);
      const ph = u * spread;
      const tip = 1.43 + layer * .015 + side * side * .2 + lens[i % lens.length] * .12;   // a neat, gently curved fringe line
      const pts = [sp(.16, ph * .4, R - .004), sp(.55, ph * .8, R + .012), sp(.95, ph * .96, R + .02), sp(1.22, ph, R + .021), sp(tip - .14, ph * 1.005, R + .018), sp(tip, ph * 1.01, R + .015)];
      hairMesh(clump(pts, { w0: .028, w1: .003, t0: .007, t1: .003, centre: onHead,
        root: '#2c1912', tip: layer ? '#4e2e1d' : '#462919', ombre: .85, seg: 40, groove: .1, toneVar: .1 }));
    }
  };
  bangs(12, .76, 0, [.04, -.02, .05, .0, .06, .02, .05, -.01, .04, .02, .03, -.01]);   // one thin layer; the forehead shows between strands
  // face-framing curtain locks: from the side of the crown straight down past the cheeks to the chest
  for (const sg of [-1, 1]) for (const [ph, end, w, seed] of [[.92, -.28, .07, 1], [1.06, -.32, .08, 2.3], [1.22, -.34, .085, 3.1]] as [number, number, number, number][]) {
    hairMesh(clump(lockPath(sg * ph, { th0: .2, r0: R - .05, r: R + .03, end, flare: .02, wave: .002, flick: 0, seed }),
      { w0: w * .85, w1: .0015, t0: .014, t1: .004, centre: sideOf, root: ROOT, tip: TIP, ombre: .62, seg: 40, groove: .14 }), hairSway);
  }
  // dark inner shell so the panels never look see-through
  mesh(new THREE.CylinderGeometry(.262, .29, .26, 48, 1, true, Math.PI * .5 + .2, Math.PI * 2 - .4 - Math.PI * .7), new THREE.MeshPhysicalMaterial({ color: '#2e1c14', roughness: .85, side: THREE.DoubleSide }), hairSway, [0, .0, -.02], [1.04, 1, .74]);
  // long hair: an inner layer of broad locks and an outer layer of thinner ones, all following the same smooth fall
  const NL0 = 12, NL1 = 20;
  for (let i = 0; i < NL0; i++) {
    const t = -1 + 2 * i / (NL0 - 1), ph = Math.PI + t * 1.75;
    hairMesh(clump(lockPath(ph, { th0: .14, r0: R - .05, r: R + .026, end: -.3 - .04 * Math.abs(rnd(i + 3)) - (Math.abs(t) < .5 ? .03 : 0), flare: .025, wave: .007, flick: (((i * 7) % 5) - 2) * .02, seed: i }),
      { w0: .11, w1: .016, t0: .022, t1: .01, centre: sideOf, root: ROOT, tip: TIP, ombre: .62, seg: 40, groove: .16 }), hairSway);
  }
  for (let i = 0; i < NL1; i++) {
    const t = -1 + 2 * i / (NL1 - 1), ph = Math.PI + t * 1.95 + rnd(i + 90) * .03;
    hairMesh(clump(lockPath(ph, { th0: .16 + Math.abs(rnd(i + 11)) * .08, r0: R - .05, r: R + .04, end: -.33 - .06 * Math.abs(rnd(i + 53)) - (Math.abs(t) < .45 ? .03 : 0), flare: .035, wave: .009, flick: (((i * 7 + 3) % 5) - 2) * .03, seed: i * 1.3 }),
      { w0: .07 + .02 * Math.abs(rnd(i)), w1: .0015, t0: .016, t1: .005, centre: sideOf, root: ROOT, tip: TIP, ombre: .62, seg: 44 }), hairSway);
  }
  // a soft highlight band on the crown
  mesh(new THREE.TorusGeometry(.2, .012, 8, 40, Math.PI * .7), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .1, depthWrite: false }), head, [0, C.y + .1, .03], [1, 1, .9], [-1.05, 0, Math.PI * .15]);

  /* props anchors */
  const props = { hat: group(head, [0, C.y + .16, -.01]), right: group(J.rhand), left: group(J.lhand), lap: group(body, [0, .9, .2]), chest: group(body, [0, 1.0, .2]) };

  return { root, body, J, hairSway, eyes: { open: eyeOpen, happy: eyeHappy }, mouths, props };
}

/* ---------------- props ---------------- */
function buildProps(M: Mats) {
  const mk = (fn: (g: THREE.Group) => void) => { const g = new THREE.Group(); fn(g); g.visible = false; return g; };
  const felt = (c: string) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .8, sheen: .6, sheenColor: new THREE.Color('#ffffff') });
  const plastic = (c: string, r = .35) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: .5 });
  const stripes = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d')!;
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fdf8f0' : '#e2453f'; g.fillRect(i * 16, 0, 16, 8); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  return {
    hat: mk((g) => {
      // cowboy hat sized in head units: the crown fully encloses the domed hair, a wide brim curls up at the sides
      const felt1 = felt('#a3683a'), band = felt('#3a2418');
      mesh(lathe([[.31, 0], [.305, .1], [.285, .2], [.22, .27], [.1, .3], [0, .29]], 48), felt1, g, [0, 0, 0], [1, 1, .92]);   // crown
      mesh(new THREE.SphereGeometry(.07, 16, 10), felt1, g, [0, .275, 0], [1.6, .35, .7]);                                        // crown dent ridge
      mesh(new THREE.CylinderGeometry(.312, .312, .05, 48, 1, true), band, g, [0, .03, 0], [1, 1, .92]);                         // hat band
      const brim = new THREE.LatheGeometry([[.29, -.01], [.4, -.005], [.5, .02], [.56, .07], [.555, .085], [.49, .04], [.38, .012], [.29, .012]].map(([r, y]) => new THREE.Vector2(r, y)), 64);
      const pos = brim.attributes.position;
      for (let i = 0; i < pos.count; i++) {   // curl the sides up, keep front and back flatter
        const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), side = Math.abs(x) / (r || 1);
        pos.setY(i, pos.getY(i) + Math.max(0, r - .32) * side * side * .55);
      }
      brim.computeVertexNormals();
      mesh(brim, felt1, g, [0, 0, 0], [1, 1, .92]);
      g.rotation.z = .08;
    }),
    mic: mk((g) => {
      mesh(new THREE.CylinderGeometry(.018, .013, .16, 16), plastic('#232326', .3), g, [0, .03, .02], [1, 1, 1], [.5, 0, 0]);
      mesh(new THREE.SphereGeometry(.042, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#a7aeb6', metalness: .8, roughness: .45 }), g, [0, .11, .065]);
    }),
    book: mk((g) => {
      // a closed paperback whose cover is the Reading photo
      // reuse the Reading photo already on the page, so the path works under any base URL
      const src = (document.querySelector('img[src*="reading."]') as HTMLImageElement | null)?.src || '/assets/about/reading.webp';
      const cover = new THREE.TextureLoader().load(src); cover.colorSpace = THREE.SRGBColorSpace;
      const page = plastic('#f6efe2', .85), back = plastic('#e7d9b8', .7);
      const front = new THREE.MeshPhysicalMaterial({ map: cover, roughness: .55, clearcoat: .2 });
      mesh(new THREE.BoxGeometry(.2, .3, .035), [page, back, page, page, front, back] as any, g);
    }),
    bouquet: mk((g) => {
      const white = new THREE.MeshPhysicalMaterial({ color: '#fbfaf5', roughness: .7, sheen: .6, sheenColor: new THREE.Color('#ffffff') });
      const cream = new THREE.MeshPhysicalMaterial({ color: '#efe6cf', roughness: .7 });
      const leaf = new THREE.MeshPhysicalMaterial({ color: '#7f9a6a', roughness: .7, side: THREE.DoubleSide });
      mesh(new THREE.CylinderGeometry(.014, .02, .16, 10), new THREE.MeshPhysicalMaterial({ color: '#8aa070', roughness: .7 }), g, [0, -.1, 0]);
      for (let i = 0; i < 13; i++) {
        const a = i * 2.39996, r = .02 + .055 * Math.sqrt(i / 13);
        const f = new THREE.Group(); f.position.set(Math.cos(a) * r, .02 + .03 * (1 - r / .075), Math.sin(a) * r * .8 + .02); g.add(f);
        for (let k = 0; k < 5; k++) mesh(new THREE.SphereGeometry(.024, 12, 8), white, f, [Math.cos(k * 1.2566) * .018, 0, Math.sin(k * 1.2566) * .018], [1, .55, 1]);
        mesh(new THREE.SphereGeometry(.009, 8, 6), cream, f, [0, .008, 0]);
        f.rotation.set(-.5 + r * 3, a, 0);
      }
      for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(1, 10, 6), leaf, g, [Math.cos(i) * .07, -.02, Math.sin(i) * .05], [.05, .012, .022], [0, i, .4]);
    }),
    popcorn: mk((g) => {
      const bucket = mesh(lathe([[0, 0], [.1, 0], [.135, .2], [0, .2]], 32), new THREE.MeshPhysicalMaterial({ map: stripes, roughness: .5, clearcoat: .3 }), g);
      bucket.castShadow = true;
      const kern = plastic('#fff1c9', .7), kern2 = plastic('#ffe39a', .7);
      for (let i = 0; i < 22; i++) {
        const a = i * 2.4, r = .03 + (i % 5) * .02;
        mesh(new THREE.IcosahedronGeometry(.03 + (i % 3) * .006, 1), i % 4 ? kern : kern2, g, [Math.cos(a) * r, .2 + (i % 3) * .02 + (r < .06 ? .03 : 0), Math.sin(a) * r * .9]);
      }
    }),
  };
}

/* ---------------- renderer ---------------- */
export function createPal(canvas: HTMLCanvasElement, opts: { blink?: boolean } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .24;

  const key = new THREE.DirectionalLight('#ffd6b0', 3.0);
  key.position.set(-2.0, 3.6, 2.4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0006; key.shadow.normalBias = .03; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -1, right: 1, top: 2, bottom: -.4, near: .5, far: 8 });
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ffb070', 1.9); rim.position.set(2.4, 2.4, -2.2); scene.add(rim);
  const fill = new THREE.HemisphereLight('#f4ece4', '#8a6a55', .32); scene.add(fill);
  const rim2 = new THREE.DirectionalLight('#ffd9b8', 1.4); rim2.position.set(-2.4, 2.6, -2.2); scene.add(rim2);
  const bounce = new THREE.DirectionalLight('#ff9a68', .55); bounce.position.set(.6, -1.2, 2.4); scene.add(bounce);

  const M = makeMaterials();
  const fig = buildFigure(M);
  scene.add(fig.root);
  const P = buildProps(M);
  fig.props.hat.add(P.hat); 
  fig.props.right.add(P.mic); fig.props.lap.add(P.popcorn); fig.props.chest.add(P.book, P.bouquet);
  P.mic.position.set(0, .02, .02);
  P.book.position.set(0, .05, .075); P.book.scale.setScalar(1.05); P.popcorn.position.set(0, -.07, .02); P.bouquet.position.set(0, .05, .1); P.bouquet.scale.setScalar(1.9);

  // soft contact shadow under her feet
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(.9, .5), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = .002; scene.add(ground);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: .16 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.receiveShadow = true;   // (not added: a hard floor shadow fights the photos)

  const camera = new THREE.PerspectiveCamera(18, 1, .1, 50);
  const viewH = BOX_H * CANVAS.h, cy = BOX_H * (1 - CANVAS.top) - viewH / 2;   // canvas bottom sits CANVAS.top below the box... see below
  // canvas spans box-relative y from (1 + top) .. (1 + top - h) measured from the box top; in world units:
  const worldTop = BOX_H * (1 - CANVAS.top), worldBottom = worldTop - viewH;
  const centreY = (worldTop + worldBottom) / 2;
  camera.position.set(0, centreY, (viewH / 2) / Math.tan(D(9)));
  camera.lookAt(0, centreY, 0);
  void cy;

  /* pose state: current joint values ease towards the target every frame */
  const KEYS = ['lsh', 'rsh', 'lel', 'rel', 'lhip', 'rhip'] as const;
  type State = { [k: string]: number };
  const flat = (p: Pose): State => {
    const s: State = {};
    for (const k of KEYS) { const a = (p as any)[k] || [0, 0]; s[k + 'x'] = a[0]; s[k + 'z'] = a[1]; }
    s.lkn = p.lkn ?? 0; s.rkn = p.rkn ?? 0;
    const h = p.head || [0, 0, 0]; s.hx = h[0]; s.hy = h[1]; s.hz = h[2];
    s.y = p.y ?? 0; s.yaw = p.yaw ?? 0; s.lean = p.lean ?? 0; s.pitch = p.pitch ?? 0; s.x = p.x ?? 0;
    return s;
  };
  let bookFacing = false;
  const vel: Record<string, number> = {};
  let swayX = 0, swayZ = 0, swayVX = 0, swayVZ = 0, lastHead = new THREE.Vector3();
  let cur = flat(POSES.sit), target = { ...cur }, extraYaw = 0, curYaw = 0, extraLean = 0, curLean = 0;
  let face = { eyes: 'open', mouth: 'smile' } as Required<Pick<Pose, 'eyes' | 'mouth'>>;
  let ground_on = false, held = new Set<string>();

  function applyJoints(s: State, t: number) {
    const J = fig.J;
    const arm = (g: THREE.Group, x: number, z: number, side: number) => { g.rotation.set(-D(x), 0, side * D(z), 'XZY'); };
    arm(J.lsh, s.lshx, -s.lshz, 1); arm(J.rsh, s.rshx, s.rshz, 1);
    J.lel.rotation.set(-D(s.lelx), 0, -D(s.lelz)); J.rel.rotation.set(-D(s.relx), 0, D(s.relz));
    J.lhip.rotation.set(-D(s.lhipx), 0, -D(s.lhipz), 'XZY'); J.rhip.rotation.set(-D(s.rhipx), 0, D(s.rhipz), 'XZY');
    J.lkn.rotation.set(-D(s.lkn), 0, 0); J.rkn.rotation.set(-D(s.rkn), 0, 0);
    const breathe = Math.sin(t * 2.1) * .006;
    J.head.rotation.set(D(s.hx) + Math.sin(t * 1.3) * .015, D(s.hy), D(s.hz) + Math.sin(t * .9) * .02);
    fig.body.position.y = s.y + breathe * .5;
    fig.body.rotation.set(D(s.pitch), 0, D(s.lean) + curLean);
    fig.root.position.x = s.x;
    fig.root.rotation.y = D(s.yaw) + curYaw;
    J.lsh.position.y = J.rsh.position.y = 1.11 + breathe;
  }
  function applyFace() {
    fig.eyes.open.forEach((e) => (e.visible = face.eyes === 'open'));
    fig.eyes.happy.forEach((e) => (e.visible = face.eyes === 'happy'));
    for (const [k, m] of Object.entries(fig.mouths)) m.visible = k === face.mouth && k !== 'neutral';   // a small soft smile; no line when neutral
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dirty = true;
  }

  let blinkUntil = 0, nextBlink = 2, last = performance.now(), dirty = true, raf = 0, visible = true, t0 = performance.now();
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    if (!visible) return;
    const k = 1 - Math.exp(-dt * 13);
    // joints follow their targets on a slightly under-damped spring: smooth starts and stops with a tiny settle
    const ST = 150, DA = 2 * Math.sqrt(ST) * .82;
    for (const key in target) {
      const vv = (vel[key] || 0) + ((target[key] - cur[key]) * ST - (vel[key] || 0) * DA) * dt;
      vel[key] = vv; cur[key] += vv * dt;
    }
    curYaw += (extraYaw - curYaw) * k; curLean += (extraLean - curLean) * k;
    applyJoints(cur, t);
    // long hair lags behind her head and swings back (spring on the head's movement), plus a faint idle drift
    fig.root.updateMatrixWorld(true);
    const hp = fig.J.head.getWorldPosition(new THREE.Vector3());
    const mv = hp.clone().sub(lastHead); lastHead.copy(hp);
    if (dt > 0) {
      const tx = THREE.MathUtils.clamp(-mv.y * 9 + mv.z * 6, -.35, .35) + Math.sin(t * .8) * .012;
      const tz = THREE.MathUtils.clamp(mv.x * 10, -.35, .35) + Math.sin(t * .6 + 1) * .015 - (fig.body.rotation.z + fig.J.head.rotation.z) * .6;
      swayVX += ((tx - swayX) * 60 - swayVX * 7) * dt; swayX += swayVX * dt;
      swayVZ += ((tz - swayZ) * 60 - swayVZ * 7) * dt; swayZ += swayVZ * dt;
      fig.hairSway.rotation.set(swayX, 0, swayZ);
    }
    if (bookFacing && P.book.visible) {
      fig.root.updateMatrixWorld(true);
      const a = fig.J.lhand.getWorldPosition(new THREE.Vector3()), b = fig.J.rhand.getWorldPosition(new THREE.Vector3());
      const mid = a.add(b).multiplyScalar(.5).add(new THREE.Vector3(0, .04, .06));
      const parent = P.book.parent!;
      P.book.position.copy(parent.worldToLocal(mid));
      P.book.quaternion.copy(parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    }
    // blink
    if (t > nextBlink) { blinkUntil = t + .12; nextBlink = t + 2 + Math.random() * 3; }
    const sy = opts.blink !== false && t < blinkUntil ? .12 : 1;
    fig.eyes.open.forEach((e) => (e.scale.y = sy));
    ground.visible = ground_on && cur.y > -.1; shadowCatcher.visible = ground_on;
    ground.scale.setScalar(1 + cur.y * .4);
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; }).observe(canvas);
  resize(); raf = requestAnimationFrame(frame);

  return {
    pose(name: string) {
      const p = POSES[name]; if (!p) return;
      target = flat(p); face = { eyes: p.eyes || 'open', mouth: p.mouth || 'neutral' }; applyFace();
    },
    /** jump straight to a pose (no easing) */
    snap(name: string) { this.pose(name); cur = { ...target }; for (const k in vel) vel[k] = 0; },
    yaw(deg: number) { extraYaw = D(deg); },
    lean(deg: number) { extraLean = D(deg); },
    ground(on: boolean) { ground_on = on; },
    hold(name: 'hat' | 'mic' | 'book' | 'popcorn' | 'bouquet', on = true) { (P as any)[name].visible = on; on ? held.add(name) : held.delete(name); },
    /** turn the held book: 0 = cover to the viewer, 180 = she reads it */
    bookTurn(deg: number) { bookFacing = false; P.book.quaternion.identity(); P.book.position.set(0, .05, .075); P.book.rotation.y = D(deg); },
    /** keep the book between her hands with its cover towards the viewer, whatever her pose */
    bookFaceViewer(on = true) { bookFacing = on; if (!on) { P.book.quaternion.identity(); P.book.position.set(0, .05, .075); } },
    dropAll() { bookFacing = false; for (const k of Object.keys(P)) (P as any)[k].visible = false; held.clear(); extraLean = 0; },
    /** a still image of a pose, e.g. for the drop-target silhouette */
    snapshot(name: string) {
      const saved = { cur: { ...cur }, target: { ...target }, face: { ...face }, yaw: curYaw };
      this.snap(name); curYaw = 0; applyJoints(cur, 0);
      const g = ground.visible, s = shadowCatcher.visible; ground.visible = shadowCatcher.visible = false;
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      cur = saved.cur; target = saved.target; face = saved.face; curYaw = saved.yaw; applyFace();
      ground.visible = g; shadowCatcher.visible = s;
      return url;
    },
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
export type Pal = ReturnType<typeof createPal>;
