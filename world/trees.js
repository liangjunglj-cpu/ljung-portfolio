// Model trees: recursive ink-dark branching, thousands of folded-paper leaves, one breeze.
// createForest(ctx, placements) → { group, update(dt, t, s), dispose(), stats }
// Everything is merged per z-band: one wood mesh + one InstancedMesh of leaves per band.

export const SPECIES = ['rain', 'slender', 'conifer', 'ornamental', 'dome'];

const CHUNK = 56;                 // metres of walkway per draw-call band
const GOLDEN = 2.39996323;
const D2R = Math.PI / 180;

/* ---------- species ----------
   lengths are fractions of tree height H; angles in degrees from the parent's direction.
   levels[i] describes the branch at depth i (0 = trunk) and `kids`, the branches it carries. */
const egg = tt => 0.5 + 0.5 * Math.sin(Math.PI * (0.12 + 0.8 * tt));
const SPEC = {
  // Samanea saman: short stout trunk, limbs arching out to a wide flat umbrella
  rain: {
    weight: 0.2, h: [6.6, 8.2], r: [0.023, 0.027], leaves: 1500, sway: 0.14, ceil: 0.93, floor: 0.46,
    levels: [
      { len: 0.43, segs: 5, wobble: 0.08, grav: 0, taper: 0.74, flare: 0.8, lobes: 5,
        kids: { n: [5, 6], t: [0.8, 1], angle: [58, 76], len: [0.42, 0.52], r: 0.6, up: 0 } },
      { segs: 6, wobble: 0.2, grav: 0.06, taper: 0.42,
        kids: { n: [5, 6], t: [0.25, 1], angle: [30, 60], len: [0.2, 0.27], r: 0.62, up: 0.24 } },
      { segs: 4, wobble: 0.24, grav: 0.05, taper: 0.45,
        kids: { n: [3, 4], t: [0.3, 1], angle: [28, 55], len: [0.11, 0.16], r: 0.62, up: 0.3 } },
      { segs: 3, wobble: 0.24, grav: 0.1, taper: 0.5,
        kids: { n: [3, 3], t: [0.3, 1], angle: [28, 60], len: [0.06, 0.09], r: 0.65, up: 0.3 } },
      { segs: 2, wobble: 0.2, grav: 0.05, taper: 0.4, leafFrom: 0.15 }
    ],
    leaf: { size: 0.38, aspect: 1, fwd: 0.45, lift: 0.4, out: 0.3, rosette: 0.35 },
    palette: [0xff6a1f, 0xf08a3c, 0xd9531a, 0xffa463, 0xff4d00]
  },
  // tall, slender, open crown, slightly weeping foliage
  slender: {
    weight: 0.24, h: [9, 11], r: [0.0105, 0.0125], leaves: 950, sway: 0.42,
    levels: [
      { len: 0.9, segs: 10, wobble: 0.1, grav: 0.15, taper: 0.2, flare: 0.7, lobes: 0,
        kids: { n: [10, 13], t: [0.36, 0.98], angle: [34, 54], len: [0.2, 0.27], shape: egg, r: 0.48, up: 0.1 } },
      { segs: 4, wobble: 0.2, grav: 0.4, taper: 0.4,
        kids: { n: [3, 4], t: [0.3, 1], angle: [28, 50], len: [0.09, 0.13], r: 0.62, up: 0.12 } },
      { segs: 3, wobble: 0.25, grav: 0, taper: 0.45,
        kids: { n: [3, 3], t: [0.3, 1], angle: [25, 55], len: [0.05, 0.08], r: 0.65, up: 0 } },
      { segs: 2, wobble: 0.2, grav: -0.3, taper: 0.4, leafFrom: 0.12 }
    ],
    leaf: { size: 0.35, aspect: 0.72, fwd: 0.5, lift: -0.3, out: 0.25, rosette: 0.3 },
    palette: [0xf59e0b, 0xffb347, 0xe8851f, 0xffc77a]
  },
  // conical evergreen: straight leader, whorls of level branches shortening to the tip
  conifer: {
    weight: 0.17, h: [7.5, 10], r: [0.0125, 0.015], leaves: 1500, sway: 0.34,
    levels: [
      { len: 0.97, segs: 10, wobble: 0.025, grav: 0.3, taper: 0.1, flare: 0.55, lobes: 0,
        kids: { n: [52, 60], whorl: 5, t: [0.14, 0.985], angle: [78, 98], len: [0.2, 0.25], shape: tt => 1 - 0.9 * tt, r: 0.34, up: 0 } },
      { segs: 4, wobble: 0.07, grav: 0.3, taper: 0.3, leafFrom: 0.12,
        kids: { n: [5, 6], nByLen: 0.22, lateral: true, t: [0.2, 0.9], angle: [40, 58], len: [0.07, 0.1], lenRel: 0.22, r: 0.6, up: 0 } },
      { segs: 2, wobble: 0.1, grav: 0.06, taper: 0.4, leafFrom: 0.1 }
    ],
    leaf: { size: 0.31, aspect: 0.42, fwd: 0.9, lift: 0.18, out: 0.1, rosette: 0.14 },
    palette: [0xc2410c, 0xa8380f, 0xd25a24, 0x8f3410]
  },
  // small multi-stem ornamental: a vase of sinuous stems, leaves in rosettes at the tips
  ornamental: {
    weight: 0.19, h: [4, 5.2], r: [0.017, 0.02], leaves: 900, sway: 0.1,
    levels: [
      { lenAbs: 0.22, segs: 2, wobble: 0, grav: 0, taper: 0.9, flare: 0.7, lobes: 4,
        kids: { n: [3, 5], t: [0.3, 0.9], angle: [14, 30], len: [0.56, 0.68], r: 0.6, up: 0 } },
      { segs: 6, wobble: 0.26, grav: 0.3, taper: 0.5,
        kids: { n: [3, 4], t: [0.45, 1], angle: [26, 50], len: [0.2, 0.28], r: 0.66, up: 0.15 } },
      { segs: 3, wobble: 0.28, grav: 0.15, taper: 0.5,
        kids: { n: [3, 3], t: [0.35, 1], angle: [30, 55], len: [0.1, 0.15], r: 0.68, up: 0.15 } },
      { segs: 2, wobble: 0.25, grav: 0.1, taper: 0.55,
        kids: { n: [3, 3], t: [0.3, 1], angle: [30, 60], len: [0.07, 0.1], r: 0.7, up: 0.2 } },
      { segs: 2, wobble: 0.2, grav: 0.1, taper: 0.45, leafFrom: 0.4 }
    ],
    leaf: { size: 0.36, aspect: 0.9, fwd: 0.6, lift: 0.25, out: 0.25, rosette: 0.6 },
    palette: [0xff4d00, 0xff7a33, 0xffa07a, 0xe8501a]
  },
  // round-headed shade tree
  dome: {
    weight: 0.2, h: [6.5, 8.5], r: [0.0165, 0.02], leaves: 1450, sway: 0.2,
    levels: [
      { len: 0.4, segs: 5, wobble: 0.07, grav: 0.1, taper: 0.72, flare: 0.6, lobes: 4,
        kids: { n: [5, 7], t: [0.62, 1], angle: [30, 62], len: [0.34, 0.46], r: 0.56, up: 0.05 } },
      { segs: 5, wobble: 0.2, grav: 0.12, taper: 0.45,
        kids: { n: [4, 5], t: [0.3, 1], angle: [32, 60], len: [0.19, 0.26], r: 0.62, up: 0.12 } },
      { segs: 3, wobble: 0.24, grav: 0.05, taper: 0.5,
        kids: { n: [3, 3], t: [0.3, 1], angle: [30, 55], len: [0.09, 0.13], r: 0.65, up: 0.15 } },
      { segs: 3, wobble: 0.24, grav: 0, taper: 0.5,
        kids: { n: [3, 3], t: [0.3, 1], angle: [30, 60], len: [0.06, 0.085], r: 0.68, up: 0.15 } },
      { segs: 2, wobble: 0.2, grav: 0, taper: 0.4, leafFrom: 0.15 }
    ],
    leaf: { size: 0.38, aspect: 0.95, fwd: 0.5, lift: 0.2, out: 0.35, rosette: 0.35 },
    palette: [0xe8742a, 0xf29a52, 0xcc5b22, 0xffb380]
  }
};

function mulberry(seed) {
  let a = (Math.imul(seed | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- wind (shared by wood, leaves and their shadow passes) ---------- */
const WIND_GLSL = /* glsl */`
uniform float uTime;
uniform vec3 uWind;       // xz direction, amplitude (m at w = 1)
float forestGust(vec3 p) {
  float along = p.x * uWind.x + p.z * uWind.y;
  // a slow front that walks across the grove, bent a little so it never reads as a ruler line
  return 0.55 + 0.45 * sin(uTime * 0.5 - along * 0.17 + sin(uTime * 0.11 + (p.x * uWind.y - p.z * uWind.x) * 0.07) * 1.4);
}
vec3 forestSway(vec3 p, float w, float phase) {
  float along = p.x * uWind.x + p.z * uWind.y;
  float g = forestGust(p);
  float a = sin(uTime * 1.05 - along * 0.33 + phase);
  float b = sin(uTime * 1.7 + phase * 1.7 + p.y * 0.45);
  float lean = (0.35 + 0.65 * a) * g;
  vec2 h = uWind.xy * lean + vec2(-uWind.y, uWind.x) * b * 0.32 * g;
  return vec3(h.x, -0.14 * abs(lean) * w, h.y) * (w * uWind.z);
}
`;

function windify(material, uniforms, leaf) {
  material.onBeforeCompile = sh => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uWind = uniforms.uWind;
    let vs = sh.vertexShader.replace('#include <common>', `#include <common>\n${WIND_GLSL}\nattribute vec3 aWind;`);
    if (leaf) {
      vs = vs.replace('#include <begin_vertex>', /* glsl */`
        vec3 transformed = vec3( position );
        vec3 leafOrigin = instanceMatrix[3].xyz;
        float leafLive = min(1.0, aWind.x * 6.0);
        float fl = sin(uTime * (2.3 + aWind.z * 1.9) + aWind.z * 43.0 + leafOrigin.x * 0.6 + leafOrigin.z * 0.4);
        float fg = (0.3 + 0.7 * forestGust(leafOrigin)) * leafLive * min(1.0, uWind.z * 8.0);
        transformed.z += fl * 0.2 * fg * position.y * position.y;          // the tip lifts and drops
        transformed.x += cos(uTime * 1.6 + aWind.z * 29.0) * 0.07 * fg * position.y;
      `).replace('#include <project_vertex>', /* glsl */`
        vec4 mvPosition = instanceMatrix * vec4( transformed, 1.0 );
        mvPosition.xyz += forestSway(leafOrigin, aWind.x, aWind.y);
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
      `);
    } else {
      vs = vs.replace('#include <begin_vertex>', /* glsl */`
        vec3 transformed = vec3( position );
        transformed += forestSway(position, aWind.x, aWind.y);
      `);
    }
    sh.vertexShader = vs;
    if (leaf && sh.fragmentShader.includes('#include <emissivemap_fragment>')) {
      // a little light carried through the blade, so the shaded side of a crown stays pale
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.2;');
    }
  };
  material.customProgramCacheKey = () => (leaf ? 'forest-leaf' : 'forest-wood');
  return material;
}

/* ---------- the forest ---------- */
export function createForest(ctx, placements = []) {
  const { THREE } = ctx;
  const isMobile = !!ctx.isMobile, still = !!ctx.reducedMotion;
  const V = () => new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const group = new THREE.Group(); group.name = 'forest';

  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: new THREE.Vector3(0.83, -0.56, still ? 0 : 0.24) }   // blows diagonally across the walkway
  };

  // one folded leaf: +Y base → tip, +Z is the upper face, a crease along the midrib
  const leafGeo = (() => {
    const g = new THREE.BufferGeometry();
    const half = s => [
      0, 0, 0,   0, 0.3, 0.012,   0, 0.64, 0.01,   0, 1, -0.05,
      s * 0.2, 0.27, 0.085,   s * 0.185, 0.62, 0.07
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...half(-1), ...half(1)], 3));
    // left half wound for +Z normals, right half mirrored
    g.setIndex([0, 1, 4, 1, 2, 4, 4, 2, 5, 2, 3, 5,   6, 10, 7, 7, 10, 8, 10, 11, 8, 8, 11, 9]);
    g.computeVertexNormals();
    return g;
  })();

  const woodMat = windify(new THREE.MeshStandardMaterial({ color: 0x343436, roughness: 0.92, metalness: 0 }), uniforms, false);
  const leafMat = windify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0, side: THREE.DoubleSide }), uniforms, true);
  const woodDepth = windify(new THREE.MeshDepthMaterial(), uniforms, false);
  const leafDepth = windify(new THREE.MeshDepthMaterial({ side: THREE.DoubleSide }), uniforms, true);

  // ---- chunks ----
  let zMax = -Infinity;
  for (const p of placements) zMax = Math.max(zMax, p.z);
  const chunks = new Map();
  const chunkOf = z => {
    const k = Math.floor((zMax - z) / CHUNK);
    if (!chunks.has(k)) chunks.set(k, { pos: [], nor: [], wind: [], idx: [], lm: [], lc: [], lw: [] });
    return chunks.get(k);
  };

  const sidesFor = r => isMobile
    ? (r > 0.1 ? 6 : r > 0.045 ? 4 : 3)
    : (r > 0.1 ? 8 : r > 0.045 ? 6 : r > 0.02 ? 4 : 3);

  const tA = V(), tB = V(), tC = V(), tN = V(), tBi = V(), tT = V();
  const col = new THREE.Color(), colB = new THREE.Color(), white = new THREE.Color(0xffe2cc);   // pale peach highlights
  const m4 = new THREE.Matrix4();
  let leafTotal = 0, woodTris = 0;
  const bySpecies = {};

  function perp(T, N, B) {           // N = the most "upward" perpendicular of T
    if (Math.abs(T.y) > 0.9) N.set(1, 0, 0); else N.copy(UP);
    N.addScaledVector(T, -N.dot(T)).normalize();
    B.crossVectors(T, N).normalize();
  }

  function sample(br, t, P, T) {
    const n = br.pts.length - 1;
    // find the segment by cumulative parameter
    let i = 0; while (i < n - 1 && br.ts[i + 1] < t) i++;
    const f = Math.min(1, Math.max(0, (t - br.ts[i]) / (br.ts[i + 1] - br.ts[i])));
    P.lerpVectors(br.pts[i], br.pts[i + 1], f);
    T.subVectors(br.pts[i + 1], br.pts[i]).normalize();
    return { r: br.rad[i] + (br.rad[i + 1] - br.rad[i]) * f, w: br.wind[i] + (br.wind[i + 1] - br.wind[i]) * f };
  }

  function buildTree(pl, index) {
    const rng = mulberry((pl.seed ?? index + 1) * 7919 + 13);
    const R = (a, b) => a + rng() * (b - a);
    let name = pl.species;
    if (!SPEC[name]) {
      let x = rng(); name = SPECIES[SPECIES.length - 1];
      for (const s of SPECIES) { if ((x -= SPEC[s].weight) < 0) { name = s; break; } }
    }
    const spec = SPEC[name];
    const scale = pl.scale ?? 1;
    const H = R(spec.h[0], spec.h[1]) * scale;
    const base = V().set(pl.x, 0, pl.z);
    const phase = rng() * 6.283;
    const C = chunkOf(pl.z);
    const branches = [];
    const last = spec.levels.length - 1;

    function grow(level, start, dir, len, r0, w0) {
      const S = spec.levels[level];
      const segs = isMobile && level > 0 ? Math.max(level >= last ? 1 : 2, S.segs - 1) : S.segs;
      const ts = [0];
      if (level === 0 && len > 1) { ts.push(0.02, 0.05, 0.1, 0.18); for (let i = 1; i <= segs; i++) ts.push(0.18 + 0.82 * i / segs); }
      else for (let i = 1; i <= segs; i++) ts.push(i / segs);
      const br = { level, ts, pts: [start.clone()], rad: [r0], wind: [w0], len, leafFrom: S.leafFrom ?? -1, r0, S };
      const d = dir.clone(), p = start.clone();
      for (let i = 1; i < ts.length; i++) {
        const dt = ts[i] - ts[i - 1], t = ts[i];
        const wob = S.wobble * Math.sqrt(dt) * 1.4;
        d.x += (rng() * 2 - 1) * wob; d.y += (rng() * 2 - 1) * wob * 0.7 + S.grav * dt; d.z += (rng() * 2 - 1) * wob;
        if (spec.ceil && level > 0) {
          const over = (p.y - H * spec.ceil * 0.8) / (H * spec.ceil * 0.2);
          if (over > 0) d.y -= over * 0.55;
          if (p.y < H * spec.floor && d.y < 0.1) d.y += 0.25;
        }
        d.normalize();
        p.addScaledVector(d, len * dt);
        br.pts.push(p.clone());
        br.rad.push(r0 * (1 - (1 - S.taper) * Math.pow(t, 0.85)));
        br.wind.push(level === 0 ? spec.sway * Math.pow(Math.max(0, p.y) / H, 2) : w0 + 0.09 * len * Math.pow(t, 1.5));
      }
      branches.push(br);

      const K = S.kids;
      if (!K || level >= last) return;
      let n = Math.round(R(K.n[0], K.n[1]));
      if (isMobile && level + 1 === last) n = Math.max(2, Math.round(n * 0.67));
      if (K.nByLen) n = Math.max(1, Math.round(n * len / (H * K.nByLen)));
      const P = V(), T = V(), N = V(), B = V(), cd = V();
      const az0 = rng() * 6.283;
      const tiers = K.whorl ? Math.ceil(n / K.whorl) : 0;
      let tierOff = az0;
      for (let k = 0; k < n; k++) {
        let tt, az;
        if (K.whorl) {
          const tier = Math.floor(k / K.whorl), m = k % K.whorl;
          if (m === 0) tierOff = rng() * 6.283;
          tt = (tier + 0.5) / tiers + (rng() - 0.5) * 0.012;
          az = tierOff + m * 6.283 / K.whorl + (rng() - 0.5) * 0.5;
        } else {
          tt = n === 1 ? 0.6 + rng() * 0.4 : (k + 0.35 + rng() * 0.65) / n;
          az = az0 + k * GOLDEN + (rng() - 0.5) * 0.7;
        }
        tt = Math.min(1, Math.max(0, tt));
        const t = K.t[0] + (K.t[1] - K.t[0]) * tt;
        const at = sample(br, t, P, T);
        perp(T, N, B);
        if (Math.abs(T.y) <= 0.9) {
          // on a leaning parent: keep to the sides and the top, never straight down
          const sign = k % 2 ? 1 : -1;
          az = K.lateral ? sign * (1.35 + (rng() - 0.5) * 0.5) : sign * (0.25 + rng() * 1.75);
        }
        const ang = R(K.angle[0], K.angle[1]) * D2R * (tt > 0.92 && !K.whorl ? 0.55 : 1);
        cd.copy(T).multiplyScalar(Math.cos(ang))
          .addScaledVector(N, Math.cos(az) * Math.sin(ang))
          .addScaledVector(B, Math.sin(az) * Math.sin(ang));
        cd.y += K.up; cd.normalize();
        let clen = H * R(K.len[0], K.len[1]) * (K.shape ? K.shape(tt) : 1);
        if (K.lenRel) clen *= Math.min(1.2, len / (H * K.lenRel)) * (1 - 0.35 * tt);
        clen = Math.max(clen, H * 0.02);
        const cr = Math.max(0.007, Math.min(at.r * K.r, clen * 0.05));
        grow(level + 1, P, cd, clen, cr, at.w);
      }
    }

    const S0 = spec.levels[0];
    const trunkLen = S0.lenAbs ? S0.lenAbs * Math.sqrt(scale) : H * S0.len;
    const lean = name === 'ornamental' ? 0 : 0.05;
    grow(0, base.clone().setY(-0.06), V().set(R(-lean, lean), 1, R(-lean, lean)).normalize(), trunkLen + 0.06, H * R(spec.r[0], spec.r[1]), 0);

    // ---- wood: swept tubes ----
    for (const br of branches) {
      const sides = sidesFor(br.r0), n = br.pts.length;
      const v0 = C.pos.length / 3;
      const lobePh = rng() * 6.283;
      for (let i = 0; i < n; i++) {
        if (i === 0) tT.subVectors(br.pts[1], br.pts[0]);
        else if (i === n - 1) tT.subVectors(br.pts[i], br.pts[i - 1]);
        else tT.subVectors(br.pts[i + 1], br.pts[i - 1]);
        tT.normalize();
        if (i === 0) perp(tT, tN, tBi);
        else { tN.addScaledVector(tT, -tN.dot(tT)).normalize(); tBi.crossVectors(tT, tN).normalize(); }
        const P = br.pts[i];
        let r = br.rad[i], lobe = 0;
        if (br.level === 0) {                       // root flare with a few buttress lobes
          const fh = Math.min(0.42, Math.max(0.1, br.len * 0.11));
          const e = Math.exp(-Math.max(0, P.y) / fh);
          r *= 1 + br.S.flare * e; lobe = br.S.lobes ? 0.3 * e : 0;
        }
        for (let j = 0; j < sides; j++) {
          const a = j / sides * 6.283;
          const ca = Math.cos(a), sa = Math.sin(a);
          const rr = lobe ? r * (1 + lobe * Math.cos(br.S.lobes * a + lobePh)) : r;
          tA.copy(tN).multiplyScalar(ca).addScaledVector(tBi, sa);
          C.nor.push(tA.x, tA.y, tA.z);
          C.pos.push(P.x + tA.x * rr, P.y + tA.y * rr, P.z + tA.z * rr);
          C.wind.push(br.wind[i], phase, 0);
        }
      }
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) {
        const a = v0 + i * sides + j, b = v0 + i * sides + (j + 1) % sides, c = a + sides, d = b + sides;
        C.idx.push(a, b, c, b, d, c);
      }
      woodTris += (n - 1) * sides * 2;
    }

    // ---- leaves ----
    const L = spec.leaf;
    const budget = Math.round(spec.leaves * (isMobile ? 0.34 : 1) * Math.min(1.25, Math.max(0.6, scale)));
    const size = L.size * (0.55 + 0.45 * scale) * (isMobile ? 1.42 : 1);
    const leafy = branches.filter(b => b.leafFrom >= 0);
    let wsum = 0;
    for (const b of leafy) { b.lw = b.len * (1 - b.leafFrom) + H * 0.02; wsum += b.lw; }
    const heart = V().set(base.x, H * 0.55, base.z);
    const l0 = C.lm.length / 16;
    let crownR = 0;
    const P = V(), T = V(), N = V(), B = V(), dY = V(), dZ = V(), dX = V(), out = V(), side = V();
    for (const b of leafy) {
      const exact = budget * b.lw / wsum;
      const n = Math.floor(exact) + (rng() < exact % 1 ? 1 : 0);
      const nRos = Math.round(n * L.rosette), nAlong = n - nRos;
      const az0 = rng() * 6.283;
      for (let i = 0; i < n; i++) {
        const ros = i >= nAlong;
        const t = ros ? 1 - rng() * 0.07 : b.leafFrom + (0.96 - b.leafFrom) * (i + rng()) / Math.max(1, nAlong);
        const at = sample(b, t, P, T);
        perp(T, N, B);
        const az = az0 + i * GOLDEN + (rng() - 0.5) * 0.9;
        side.copy(N).multiplyScalar(Math.cos(az)).addScaledVector(B, Math.sin(az));
        out.subVectors(P, heart).normalize();
        dY.copy(T).multiplyScalar(ros ? 0.8 : L.fwd).add(side).addScaledVector(out, L.out);
        dY.y += L.lift + (rng() - 0.5) * 0.3;
        dY.normalize();
        // upper face towards the sky, rolled a little
        dZ.copy(UP).addScaledVector(dY, -dY.y);
        if (dZ.lengthSq() < 0.04) dZ.copy(side);
        dZ.normalize();
        dX.crossVectors(dY, dZ);
        const roll = (rng() - 0.5) * 1.3;
        dZ.multiplyScalar(Math.cos(roll)).addScaledVector(dX, Math.sin(roll));
        dX.crossVectors(dY, dZ).normalize();
        const s = size * R(0.7, 1.25), sx = s * L.aspect * R(0.85, 1.1);
        P.addScaledVector(side, at.r + 0.004);
        m4.set(
          dX.x * sx, dY.x * s, dZ.x * s, P.x,
          dX.y * sx, dY.y * s, dZ.y * s, P.y,
          dX.z * sx, dY.z * s, dZ.z * s, P.z,
          0, 0, 0, 1);
        for (let e = 0; e < 16; e++) C.lm.push(m4.elements[e]);
        C.lw.push(at.w + 0.02, phase, rng());
        crownR = Math.max(crownR, Math.hypot(P.x - base.x, P.z - base.z));
      }
    }
    // tint: autumn oranges per species, a few pale-peach leaves, deeper toward the heart of the crown
    const l1 = C.lm.length / 16;
    let cy = 0, cn = 0, yMin = Infinity, yMax = -Infinity;
    for (let i = l0; i < l1; i++) { const y = C.lm[i * 16 + 13]; cy += y; cn++; yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
    cy /= Math.max(1, cn);
    const cRad = Math.max(0.5, crownR), cHalf = Math.max(0.5, (yMax - yMin) / 2);
    for (let i = l0; i < l1; i++) {
      const o = i * 16, dx = (C.lm[o + 12] - base.x) / cRad, dz = (C.lm[o + 14] - base.z) / cRad, dy = (C.lm[o + 13] - cy) / cHalf;
      const edge = Math.min(1, Math.sqrt(dx * dx + dz * dz + dy * dy * 0.6));
      const lift = Math.min(1, Math.max(0, 0.5 + dy * 0.5));
      const pal = spec.palette;
      col.setHex(pal[Math.floor(rng() * pal.length)]).lerp(colB.setHex(pal[Math.floor(rng() * pal.length)]), rng());
      if (rng() < 0.06) col.lerp(white, 0.7);
      const shade = (0.76 + 0.16 * edge + 0.08 * lift) * R(0.94, 1.05);
      C.lc.push(col.r * shade, col.g * shade, col.b * shade);
    }
    // a faint scatter of fallen leaves under the crown
    const nFall = Math.round(budget * 0.04);
    for (let i = 0; i < nFall; i++) {
      const a = rng() * 6.283, rad = cRad * (0.15 + 0.85 * Math.pow(rng(), 0.7));
      const yaw = rng() * 6.283, s = size * R(0.6, 0.95), tilt = (rng() - 0.5) * 0.25;
      dY.set(Math.cos(yaw), tilt * 0.3, Math.sin(yaw)).normalize();
      dZ.set(tilt, 1, (rng() - 0.5) * 0.25).addScaledVector(dY, 0).normalize();
      dX.crossVectors(dY, dZ).normalize(); dZ.crossVectors(dX, dY).normalize();
      const sx = s * L.aspect;
      m4.set(
        dX.x * sx, dY.x * s, dZ.x * s * 0.5, base.x + Math.cos(a) * rad,
        dX.y * sx, dY.y * s, dZ.y * s * 0.5, 0.012 + rng() * 0.01,
        dX.z * sx, dY.z * s, dZ.z * s * 0.5, base.z + Math.sin(a) * rad,
        0, 0, 0, 1);
      for (let e = 0; e < 16; e++) C.lm.push(m4.elements[e]);
      C.lw.push(0, phase, rng());
      col.setHex(spec.palette[Math.floor(rng() * spec.palette.length)]).lerp(white, R(0.25, 0.6));
      C.lc.push(col.r, col.g, col.b);
    }
    const count = C.lm.length / 16 - l0;
    leafTotal += count;
    const st = bySpecies[name] || (bySpecies[name] = { trees: 0, leaves: 0 });
    st.trees++; st.leaves += count;
  }

  placements.forEach(buildTree);

  // ---- meshes ----
  const disposables = [leafGeo, woodMat, leafMat, woodDepth, leafDepth];
  const bands = [];
  for (const C of chunks.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(C.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(C.nor, 3));
    g.setAttribute('aWind', new THREE.Float32BufferAttribute(C.wind, 3));
    g.setIndex(C.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(C.idx, 1) : new THREE.Uint16BufferAttribute(C.idx, 1));
    g.computeBoundingSphere(); g.boundingSphere.radius += 0.5;
    const wood = new THREE.Mesh(g, woodMat);
    wood.name = 'forest-wood'; wood.castShadow = true; wood.receiveShadow = true;
    wood.customDepthMaterial = woodDepth; wood.raycast = () => {};
    group.add(wood); disposables.push(g);
    const band = { meshes: [wood], sphere: g.boundingSphere.clone() };
    bands.push(band);

    const n = C.lm.length / 16;
    if (n) {
      const lg = leafGeo.clone();
      lg.setAttribute('aWind', new THREE.InstancedBufferAttribute(new Float32Array(C.lw), 3));
      const leaves = new THREE.InstancedMesh(lg, leafMat, n);
      leaves.instanceMatrix.array.set(C.lm);
      leaves.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(C.lc), 3);
      leaves.name = 'forest-leaves'; leaves.castShadow = true; leaves.receiveShadow = true;
      leaves.customDepthMaterial = leafDepth; leaves.raycast = () => {};
      leaves.computeBoundingSphere(); leaves.boundingSphere.radius += 0.5;
      group.add(leaves); disposables.push(lg);
      band.meshes.push(leaves); band.sphere.union(leaves.boundingSphere);
    }
    C.pos = C.nor = C.wind = C.idx = C.lm = C.lc = C.lw = null;
  }

  return {
    group,
    species: SPECIES,
    stats: { trees: placements.length, leaves: leafTotal, woodTriangles: woodTris, meshes: group.children.length, bySpecies },
    /** strength in metres of sway at the crown tips (default 0.24); x/z = wind direction */
    setWind({ strength, x, z } = {}) {
      const w = uniforms.uWind.value;
      if (x !== undefined && z !== undefined) { const l = Math.hypot(x, z) || 1; w.x = x / l; w.y = z / l; }
      if (strength !== undefined && !still) w.z = strength;
    },
    update(dt, t, s) {
      if (!still) uniforms.uTime.value = t;
      // bands wholly inside the fog wall are not drawn (nor shadowed)
      const cam = (s && s.camera) || ctx.camera;
      if (!cam || bands.length < 2) return;
      let root = group; while (root.parent) root = root.parent;
      const far = root.fog && root.fog.far ? root.fog.far + 2 : Infinity;
      group.updateWorldMatrix(true, false);
      for (const b of bands) {
        const c = tA.copy(b.sphere.center).applyMatrix4(group.matrixWorld);
        const on = c.distanceTo(cam.position) - b.sphere.radius < far;
        for (const m of b.meshes) m.visible = on;
      }
    },
    dispose() { group.removeFromParent(); for (const d of disposables) d.dispose(); }
  };
}
