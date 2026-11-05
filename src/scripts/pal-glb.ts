/* Mini Amber from a rigged GLB (Meshy export, Mixamo skeleton) — same API as pal3d.ts so PhotoPals can swap it in.
   - Poses: the joint-angle poses from pal3d.ts are re-targeted onto the Mixamo bones by aiming each limb;
     a few poses play the GLB's own clips instead (dance, climbing).
   - Face: the model has no face rig, so blinks, happy eyes and an open mouth are painted in the shader,
     in the head's bind-pose space (eye / mouth positions measured on the model).
   - Props: the same hat / mic / book / popcorn / bouquet as pal3d.ts, following her head and hands. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { POSES, BOX_H, CANVAS, buildProps, makeMaterials, type Pose } from './pal3d';

const URL_GLB: string = (window as any).__PAL_MODEL || '/assets/about/amelia.glb';
const HEAD_TOP = 1.47;            // same height as the old figure, so every scene keeps its size
const D = THREE.MathUtils.degToRad;
const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1), DOWN = new THREE.Vector3(0, -1, 0);

// poses that play a clip from the GLB instead of the hand-made joint angles
const CLIPS: Record<string, { clip: string; keepY?: boolean; lockFeet?: boolean }> = {
  dance_a: { clip: 'Boom_Dance', keepY: true }, dance_b: { clip: 'Boom_Dance', keepY: true },
  climb_a: { clip: 'climbing_up_wall' }, climb_b: { clip: 'climbing_up_wall' },
  sway: { clip: 'Happy_Sway_Standing', keepY: true, lockFeet: true },   // feet stay planted, the body sways over them
};
// this body is proportioned differently from the old one: a few poses need other angles to land in the same place
const STAND = POSES.stand;
const OVERRIDES: Record<string, Pose> = {
  sway: { ...STAND, eyes: 'happy', mouth: 'smile' },   // played by the Happy_Sway_Standing clip
  // one hand lightly holds the straw at the corner of her mouth, the other hangs relaxed
  sip2: { ...STAND, lsh: [64, -4], lel: [132, 0], rsh: [4, 12], rel: [16, 0], eyes: 'happy', mouth: 'puff', head: [5, 0, 3] },
  sip2b: { ...STAND, lsh: [62, -2], lel: [136, 0], rsh: [4, 13], rel: [18, 0], eyes: 'happy', mouth: 'puff', head: [7, 0, -2] },
};
const poseOf = (n: string) => OVERRIDES[n] || POSES[n];

/* face, in the model's bind-pose units (metres, feet at 0) */
const FACE = {
  eyeL: new THREE.Vector2(-0.0563, 1.5125), eyeR: new THREE.Vector2(0.0577, 1.5125), eyeSize: new THREE.Vector2(0.035, 0.026),
  mouth: new THREE.Vector2(0.0017, 1.4325), mouthSize: new THREE.Vector2(0.036, 0.026),
};

/** limb direction for [forward, outward] angles; side = -1 for the screen-left limb, +1 for screen-right */
const limbQ = (fwd: number, out: number, side: number) =>
  new THREE.Quaternion().setFromAxisAngle(X, -D(fwd)).multiply(new THREE.Quaternion().setFromAxisAngle(Z, side * D(out)));

function faceShader(mat: THREE.MeshStandardMaterial, U: Record<string, THREE.IUniform>) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBind;
        uniform vec2 uEyeL, uEyeR, uEyeSize, uMouth, uMouthSize;
        uniform float uLid, uHappy, uOpen, uPuff;
        uniform vec3 uSkin, uLash, uMouthIn, uTongue;
        float band(float d, float w) { float f = fwidth(d) + 1e-4; return 1.0 - smoothstep(w - f, w + f, abs(d)); }
        float inside(float d) { float f = fwidth(d) + 1e-4; return 1.0 - smoothstep(-f, f, d); }
        void paintEye(inout vec3 col, vec2 c) {
          vec2 d = (vBind.xy - c) / uEyeSize;
          float inEye = inside(length(d) - 1.12);
          // eyelid closing from the top (blink), or fully closed for happy eyes
          float edge = mix(1.2, -0.25, uLid) - 0.18 * d.x * d.x * uLid;
          float lid = max(inside(edge - d.y) * step(0.01, uLid), uHappy) * inEye;
          col = mix(col, uSkin, lid);
          col = mix(col, uLash, band(d.y - edge, 0.09) * step(0.02, uLid) * (1.0 - uHappy) * inside(abs(d.x) - 0.98));
          // happy eyes: a soft upturned arc
          float arc = 0.05 + 0.5 * (1.0 - d.x * d.x);
          col = mix(col, uLash, uHappy * band(d.y - arc, 0.13) * inside(abs(d.x) - 0.85));
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (vBind.z > 0.095 && vBind.z < 0.16 && vBind.y > 1.40 && vBind.y < 1.56) {
          vec3 col = diffuseColor.rgb;
          paintEye(col, uEyeL); paintEye(col, uEyeR);
          // open, laughing mouth: a D shape under the smile line, tongue at the bottom
          vec2 m = (vBind.xy - uMouth) / (uMouthSize * vec2(mix(0.7, 1.0, uOpen), 1.0));
          float top = 0.3 * m.x * m.x + 0.05, bot = top - 1.15 * uOpen * sqrt(max(0.0, 1.0 - m.x * m.x));
          float inMouth = inside(m.y - top) * inside(bot - m.y) * inside(abs(m.x) - 1.0) * step(0.02, uOpen);
          vec3 inner = mix(uMouthIn, uTongue, smoothstep(0.55, 0.85, (top - m.y) / max(1e-3, top - bot)));
          col = mix(col, inner, inMouth);
          // puffed "o" for sipping
          vec2 o = (vBind.xy - uMouth - vec2(0.0, -0.003)) / (uMouthSize * vec2(0.36, 0.42));
          col = mix(col, uMouthIn, inside(length(o) - uPuff));
          diffuseColor.rgb = col;
        }`);
  };
  mat.customProgramCacheKey = () => 'amber-face';
}

export function createPal(canvas: HTMLCanvasElement, opts: { blink?: boolean } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .75;
  const key = new THREE.DirectionalLight('#fff0e0', 1.6); key.position.set(-2, 3.6, 2.4); scene.add(key);
  const rim = new THREE.DirectionalLight('#ffd0a0', 1.0); rim.position.set(2.4, 2.4, -2.2); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#fff6ee', '#8a6a55', .5));

  // soft contact shadow
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const g = sc.getContext('2d')!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(40,24,16,.45)'); grad.addColorStop(1, 'rgba(40,24,16,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(.8, .4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = .002; scene.add(ground);

  const camera = new THREE.PerspectiveCamera(18, 1, .1, 50);
  const viewH = BOX_H * CANVAS.h, worldTop = BOX_H * (1 - CANVAS.top), centreY = worldTop - viewH / 2;
  camera.position.set(0, centreY, (viewH / 2) / Math.tan(D(9)));
  camera.lookAt(0, centreY, 0);

  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body); scene.add(root);

  /* props, each on an anchor that follows a bone */
  const P = buildProps(makeMaterials());
  const A = { hat: new THREE.Group(), right: new THREE.Group(), chest: new THREE.Group(), lap: new THREE.Group() };
  body.add(A.hat, A.right, A.chest, A.lap);
  A.hat.add(P.hat); A.right.add(P.mic); A.chest.add(P.book, P.bouquet); A.lap.add(P.popcorn);
  P.hat.scale.setScalar(.5); P.hat.position.set(0, -.035, -.012);
  P.mic.position.set(0, .02, .02);
  P.book.position.set(0, .03, .03); P.book.scale.setScalar(1.0);
  P.bouquet.position.set(0, .06, .06); P.bouquet.scale.setScalar(1.7); P.bouquet.rotation.x = 1.15;
  P.popcorn.position.set(0, -.07, .02);
  let bookFacing = false, bookTurnRad: number | null = null;

  /* face uniforms */
  const U: Record<string, THREE.IUniform> = {
    uEyeL: { value: FACE.eyeL }, uEyeR: { value: FACE.eyeR }, uEyeSize: { value: FACE.eyeSize },
    uMouth: { value: FACE.mouth }, uMouthSize: { value: FACE.mouthSize },
    uLid: { value: 0 }, uHappy: { value: 0 }, uOpen: { value: 0 }, uPuff: { value: 0 },
    uSkin: { value: new THREE.Color('#f4bea3') }, uLash: { value: new THREE.Color('#2a1812') },
    uMouthIn: { value: new THREE.Color('#6b2a26') }, uTongue: { value: new THREE.Color('#e07d7d') },
  };
  let face = { eyes: 'open', mouth: 'smile' } as Required<Pick<Pose, 'eyes' | 'mouth'>>;
  const faceCur = { happy: 0, open: 0, puff: 0 };

  /* pose state (same springy easing as pal3d) */
  const KEYS = ['lsh', 'rsh', 'lel', 'rel', 'lhip', 'rhip'] as const;
  type State = Record<string, number>;
  const flat = (p: Pose): State => {
    const s: State = {};
    for (const k of KEYS) { const a = (p as any)[k] || [0, 0]; s[k + 'x'] = a[0]; s[k + 'z'] = a[1]; }
    s.lkn = p.lkn ?? 0; s.rkn = p.rkn ?? 0;
    const h = p.head || [0, 0, 0]; s.hx = h[0]; s.hy = h[1]; s.hz = h[2];
    s.y = p.y ?? 0; s.yaw = p.yaw ?? 0; s.lean = p.lean ?? 0; s.pitch = p.pitch ?? 0; s.x = p.x ?? 0;
    return s;
  };
  let cur = flat(POSES.sit), target = { ...cur };
  const vel: State = {};
  let poseName = 'sit', extraYaw = 0, curYaw = 0, extraLean = 0, curLean = 0, groundOn = false;

  /* model + rig (filled in when the GLB arrives) */
  type Limb = { bone: THREE.Bone; restWorld: THREE.Quaternion; restDir: THREE.Vector3 };
  type Side = { arm: Limb; fore: Limb; up: Limb; leg: Limb; hand: THREE.Bone; foot: THREE.Bone; L1: number; L2: number; footRest: THREE.Vector3 };
  let rig: null | {
    bones: THREE.Bone[]; rest: Map<THREE.Bone, THREE.Quaternion>; restWorld: Map<THREE.Bone, THREE.Quaternion>;
    L: Side; R: Side; head: Limb; spine: Limb; headTop: THREE.Bone; hips: THREE.Bone;
    mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction>;
  } = null;
  let playing: THREE.AnimationAction | null = null;
  // the clip being blended in or out, and how much of it shows (0 = hand-made pose, 1 = clip): eased every frame,
  // so switching between poses and clips never snaps
  let blendAct: THREE.AnimationAction | null = null, blendLock = false, clipW = 0;
  const clipQ: THREE.Quaternion[] = [], clipHip = new THREE.Vector3(), restHip = new THREE.Vector3();

  const bodyQ = new THREE.Quaternion(), tq = new THREE.Quaternion(), tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
  const localWorldQ = (o: THREE.Object3D, out: THREE.Quaternion) => {   // rotation relative to `body`
    o.getWorldQuaternion(out); body.getWorldQuaternion(bodyQ); return out.premultiply(bodyQ.invert());
  };
  const localPos = (o: THREE.Object3D, out: THREE.Vector3) => body.worldToLocal(o.getWorldPosition(out));

  const onModel = (gltf: any) => {
    const model = gltf.scene;
    model.traverse((o: any) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      faceShader(o.material, U);
      o.material.side = THREE.DoubleSide;   // the Meshy hair shell has small gaps: show its inner side there instead of the page behind her
    });
    const box = new THREE.Box3().setFromObject(model);
    model.scale.setScalar(HEAD_TOP / (box.max.y - box.min.y));
    model.position.y = -box.min.y * model.scale.y;
    body.add(model);
    body.updateMatrixWorld(true);

    const bones: THREE.Bone[] = [];
    model.traverse((o: any) => o.isBone && bones.push(o));
    const by = (n: string) => bones.find((b) => b.name.replace(/[^A-Za-z0-9_]/g, '') === 'mixamorig' + n)!;
    const rest = new Map(bones.map((b) => [b, b.quaternion.clone()]));
    const restWorld = new Map(bones.map((b) => [b, localWorldQ(b, new THREE.Quaternion())]));
    const limb = (n: string, child: string): Limb => {
      const bone = by(n);
      const a = localPos(bone, new THREE.Vector3()), b = localPos(by(child), new THREE.Vector3());
      return { bone, restWorld: restWorld.get(bone)!.clone(), restDir: b.sub(a).normalize() };
    };
    const side = (s: 'Left' | 'Right'): Side => {
      const hip = localPos(by(s + 'UpLeg'), new THREE.Vector3()), knee = localPos(by(s + 'Leg'), new THREE.Vector3()), foot = localPos(by(s + 'Foot'), new THREE.Vector3());
      return { arm: limb(s + 'Arm', s + 'ForeArm'), fore: limb(s + 'ForeArm', s + 'Hand'), up: limb(s + 'UpLeg', s + 'Leg'), leg: limb(s + 'Leg', s + 'Foot'), hand: by(s + 'Hand'),
        foot: by(s + 'Foot'), L1: hip.distanceTo(knee), L2: knee.distanceTo(foot), footRest: foot };
    };
    // which of the model's sides is on the left of the screen (camera looks down -z, so screen-left is -x)
    const [Ls, Rs] = localPos(by('LeftArm'), new THREE.Vector3()).x < 0 ? ['Left', 'Right'] as const : ['Right', 'Left'] as const;

    // clips: drop the hips' travel so she dances / climbs on the spot (the page moves her)
    const mixer = new THREE.AnimationMixer(model);
    const actions: Record<string, THREE.AnimationAction> = {};
    for (const clip of gltf.animations) {
      const keepY = Object.values(CLIPS).some((c) => c.clip === clip.name && c.keepY);
      for (const tr of clip.tracks) {
        if (!/Hips\.position$/.test(tr.name)) continue;
        const v = tr.values, x0 = v[0], y0 = v[1], z0 = v[2];
        for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; if (!keepY) v[i + 1] = y0; }
      }
      actions[clip.name] = mixer.clipAction(clip);
    }
    // a point on her lips that follows the head, so the page can aim the matcha straw at her mouth
    let skinned: THREE.Object3D = model; model.traverse((o: any) => { if (o.isSkinnedMesh) skinned = o; });
    const lips = skinned.localToWorld(new THREE.Vector3(FACE.mouth.x, FACE.mouth.y, 0.148));
    by('Head').worldToLocal(lips); mouthAnchor.position.copy(lips); by('Head').add(mouthAnchor);
    rig = { bones, rest, restWorld, L: side(Ls), R: side(Rs), head: limb('Head', 'HeadTop_End'), spine: limb('Spine1', 'Spine2'), headTop: by('HeadTop_End'), hips: by('Hips'), mixer, actions };
    restHip.copy(rig.hips.position);
    syncClip();
    onReady.forEach((f) => f()); onReady.length = 0;
  };
  const loader = new GLTFLoader();
  if (URL_GLB.endsWith('.json')) {
    // hosts that don't serve .glb: the GLB travels base64-encoded in JSON, its textures as separate images next to it
    fetch(URL_GLB).then((r) => r.json()).then(({ glb }) => {
      const bin = Uint8Array.from(atob(glb), (c) => c.charCodeAt(0));
      loader.parse(bin.buffer, URL_GLB.replace(/[^/]*$/, ''), onModel, (e) => console.error('[pal] model', e));
    });
  } else loader.load(URL_GLB, onModel, undefined, (e) => console.error('[pal] model', e));
  const onReady: (() => void)[] = [];
  const mouthAnchor = new THREE.Object3D();

  function aim(l: Limb, dir: THREE.Vector3) {
    const want = new THREE.Quaternion().setFromUnitVectors(l.restDir, dir).multiply(l.restWorld);
    localWorldQ(l.bone.parent!, tq);
    l.bone.quaternion.copy(tq.invert().multiply(want));
    l.bone.updateMatrixWorld(true);
  }
  function turn(l: Limb, q: THREE.Quaternion) {   // rotate a bone by q, expressed in body space
    localWorldQ(l.bone.parent!, tq);
    const want = q.clone().multiply(l.restWorld);
    l.bone.quaternion.copy(tq.invert().multiply(want));
    l.bone.updateMatrixWorld(true);
  }
  /** how far a bone has turned from its rest pose, in body space */
  const delta = (b: THREE.Bone, out: THREE.Quaternion) => localWorldQ(b, out).multiply(rig!.restWorld.get(b)!.clone().invert());

  function applyBody(s: State, t: number) {
    body.position.y = s.y + Math.sin(t * 2.1) * .002;
    body.rotation.set(D(s.pitch), 0, D(s.lean) + curLean);
    root.position.x = s.x;
    root.rotation.y = D(s.yaw) + curYaw;
    root.updateMatrixWorld(true);
  }
  function applyLimbs(s: State, t: number) {
    if (!rig) return;
    for (const b of rig.bones) b.quaternion.copy(rig.rest.get(b)!);
    rig.bones[0].updateMatrixWorld(true);
    turn(rig.spine, new THREE.Quaternion().setFromAxisAngle(X, Math.sin(t * 2.1) * .01));
    for (const [side, S, a, e, hip, kn] of [[-1, rig.L, 'lsh', 'lel', 'lhip', 'lkn'], [1, rig.R, 'rsh', 'rel', 'rhip', 'rkn']] as const) {
      const qa = limbQ(s[a + 'x'], s[a + 'z'], side);
      aim(S.arm, DOWN.clone().applyQuaternion(qa));
      aim(S.fore, DOWN.clone().applyQuaternion(qa.clone().multiply(limbQ(s[e + 'x'], s[e + 'z'], side))));
      const qh = limbQ(s[hip + 'x'], s[hip + 'z'], side);
      aim(S.up, DOWN.clone().applyQuaternion(qh));
      aim(S.leg, DOWN.clone().applyQuaternion(qh.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X, -D(s[kn])))));
    }
    turn(rig.head, new THREE.Quaternion().setFromEuler(new THREE.Euler(D(s.hx) + Math.sin(t * 1.3) * .015, D(s.hy), D(s.hz) + Math.sin(t * .9) * .02)));
  }
  /** two-bone IK: keep both feet where they stand at rest, knees bending forward, soles flat */
  function plantFeet() {
    if (!rig) return;
    for (const S of [rig.L, rig.R]) {
      const H = localPos(S.up.bone, new THREE.Vector3()), T = S.footRest.clone();
      const v = T.clone().sub(H), d = Math.min(v.length(), (S.L1 + S.L2) * .999), dir = v.normalize();
      const a = (S.L1 * S.L1 - S.L2 * S.L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, S.L1 * S.L1 - a * a));
      const pole = new THREE.Vector3(0, 0, 1).addScaledVector(dir, -dir.z).normalize();
      const K = H.clone().addScaledVector(dir, a).addScaledVector(pole, h);
      aim(S.up, K.clone().sub(H).normalize());
      aim(S.leg, H.clone().addScaledVector(dir, d).sub(K).normalize());
      localWorldQ(S.foot.parent!, tq); S.foot.quaternion.copy(tq.invert().multiply(rig.restWorld.get(S.foot)!)); S.foot.updateMatrixWorld(true);
    }
  }
  function placeProps() {
    if (!rig) return;
    // hat: on top of the head, turning with it
    localPos(rig.headTop, A.hat.position); delta(rig.head.bone, A.hat.quaternion);
    // mic: in the screen-right hand
    localPos(rig.R.hand, A.right.position); delta(rig.R.hand, A.right.quaternion);
    // book / bouquet: between the hands, facing the viewer (or turned, see bookTurn)
    localPos(rig.L.hand, tv); localPos(rig.R.hand, tv2);
    A.chest.position.copy(tv.add(tv2).multiplyScalar(.5));
    body.getWorldQuaternion(bodyQ);
    A.chest.quaternion.copy(bodyQ.invert());           // world-aligned: cover to the camera, whatever her pose
    root.getWorldQuaternion(tq); A.chest.quaternion.multiply(tq);   // …but turning with her body's yaw
    if (bookTurnRad !== null && !bookFacing) A.chest.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), bookTurnRad));
    if (bookFacing) { body.getWorldQuaternion(bodyQ); A.chest.quaternion.copy(bodyQ.invert()); }
    // popcorn: in her lap
    localPos(rig.hips, A.lap.position); A.lap.position.add(new THREE.Vector3(0, -.02, .14));
  }

  function syncClip() {
    if (!rig) return;
    const want = CLIPS[poseName] ? rig.actions[CLIPS[poseName].clip] : null;
    if (want === playing) return;
    if (want && want !== blendAct) { blendAct?.stop(); want.reset().setEffectiveWeight(1).play(); blendAct = want; }
    if (want) blendLock = !!CLIPS[poseName].lockFeet;
    playing = want;
  }
  /** pose the bones: hand-made pose, the clip, or a smooth mix of the two while switching */
  function poseBones(t: number, dt: number) {
    if (!rig) return;
    clipW += ((playing ? 1 : 0) - clipW) * (1 - Math.exp(-dt * 8));   // ~0.35 s cross-fade
    if (!playing && clipW < .003) { clipW = 0; blendAct?.stop(); blendAct = null; }
    if (!blendAct) { rig.hips.position.copy(restHip); applyLimbs(cur, t); return; }
    rig.mixer.update(dt);
    rig.bones.forEach((b, i) => (clipQ[i] ||= new THREE.Quaternion()).copy(b.quaternion));
    clipHip.copy(rig.hips.position);
    applyLimbs(cur, t);   // hand-made pose (resets every bone from rest first)
    rig.bones.forEach((b, i) => b.quaternion.slerp(clipQ[i], clipW));
    rig.hips.position.lerpVectors(restHip, clipHip, clipW);
    rig.bones[0].updateMatrixWorld(true);
    if (blendLock) plantFeet();
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.render(scene, camera);   // a resize clears the canvas: redraw at once so she never blinks out while changing size
  }

  let last = performance.now(), raf = 0, visible = true, blinkAt = 2, blinkUntil = 0;
  const t0 = performance.now();
  function updateFace(t: number, k: number) {
    const ease = (c: number, to: number) => c + (to - c) * Math.min(1, k * 1.6);
    faceCur.happy = ease(faceCur.happy, face.eyes === 'happy' ? 1 : 0);
    faceCur.open = ease(faceCur.open, face.mouth === 'open' ? 1 : 0);
    faceCur.puff = ease(faceCur.puff, face.mouth === 'puff' ? 1 : 0);
    if (t > blinkAt) { blinkUntil = t + .14; blinkAt = t + 2 + Math.random() * 3; }
    const b = opts.blink !== false && t < blinkUntil ? Math.sin(((blinkUntil - t) / .14) * Math.PI) : 0;
    U.uLid.value = b; U.uHappy.value = faceCur.happy; U.uOpen.value = faceCur.open; U.uPuff.value = faceCur.puff;
  }
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible) return;
    const t = (now - t0) / 1000, k = 1 - Math.exp(-dt * 13);
    const ST = 150, DA = 2 * Math.sqrt(ST) * .82;
    for (const key in target) {
      const vv = (vel[key] || 0) + ((target[key] - cur[key]) * ST - (vel[key] || 0) * DA) * dt;
      vel[key] = vv; cur[key] += vv * dt;
    }
    curYaw += (extraYaw - curYaw) * k; curLean += (extraLean - curLean) * k;
    applyBody(cur, t);
    poseBones(t, dt);
    placeProps();
    updateFace(t, k);
    ground.visible = groundOn && cur.y > -.1;
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; }).observe(canvas);
  resize(); raf = requestAnimationFrame(frame);

  return {
    /** resolves once the model has loaded */
    ready: () => new Promise<void>((res) => (rig ? res() : onReady.push(res))),
    pose(name: string) {
      const p = poseOf(name); if (!p) return;
      poseName = name; target = flat(p); face = { eyes: p.eyes || 'open', mouth: p.mouth || 'neutral' }; syncClip();
    },
    /** her lips on the canvas, as fractions from its top-left corner (null until the model has loaded) */
    mouthPoint(): [number, number] | null {
      if (!rig) return null;
      root.updateMatrixWorld(true);
      const p = mouthAnchor.getWorldPosition(new THREE.Vector3()).project(camera);
      return [(p.x + 1) / 2, (1 - p.y) / 2];
    },
    snap(name: string) { this.pose(name); cur = { ...target }; for (const k in vel) vel[k] = 0; },
    yaw(deg: number) { extraYaw = D(deg); },
    lean(deg: number) { extraLean = D(deg); },
    ground(on: boolean) { groundOn = on; },
    hold(name: 'hat' | 'mic' | 'book' | 'popcorn' | 'bouquet', on = true) { (P as any)[name].visible = on; },
    bookTurn(deg: number) { bookFacing = false; bookTurnRad = D(deg); },
    bookFaceViewer(on = true) { bookFacing = on; bookTurnRad = null; },
    dropAll() { bookFacing = false; bookTurnRad = null; for (const k of Object.keys(P)) (P as any)[k].visible = false; extraLean = 0; },
    snapshot(name: string) {
      if (!rig) return '';
      const saved = { cur: { ...cur }, target: { ...target }, name: poseName, yaw: curYaw, face: { ...face } }, was = playing;
      poseName = name; target = flat(poseOf(name)); cur = { ...target };
      playing = null; curYaw = 0; rig.hips.position.copy(restHip); applyBody(cur, 0); applyLimbs(cur, 0); placeProps();
      const gv = ground.visible; ground.visible = false;
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      cur = saved.cur; target = saved.target; poseName = saved.name; curYaw = saved.yaw; face = saved.face; playing = was; ground.visible = gv;
      return url;
    },
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
export type Pal = ReturnType<typeof createPal>;
