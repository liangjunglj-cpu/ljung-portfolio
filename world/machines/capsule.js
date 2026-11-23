// M.01 — Capsule machine. A gacha globe on a pedestal: twelve capsules, one per project.
// Drag the crank round (or press TURN) and one drops into the tray and pops open.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Collects static geometry per material and merges it into one edged mesh each. */
function makeBuilder(THREE, kit) {
  const bins = new Map();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const api = {
    add(geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      let g = geo;
      if (geo.index) { g = geo.toNonIndexed(); geo.dispose(); }
      g.clearGroups();
      q.setFromEuler(e.set(rx, ry, rz)); m4.compose(p.set(x, y, z), q, one); g.applyMatrix4(m4);
      if (!bins.has(material)) bins.set(material, []);
      bins.get(material).push(g);
      return api;
    },
    box(w, h, d, material, x, y, z, rx, ry, rz) { return api.add(new THREE.BoxGeometry(w, h, d), material, x, y, z, rx, ry, rz); },
    cyl(r, h, material, x, y, z, rx, ry, rz, seg = 24, rTop = r) { return api.add(new THREE.CylinderGeometry(rTop, r, h, seg), material, x, y, z, rx, ry, rz); },
    build(parent, { threshold = 30, noEdges = [] } = {}) {
      const out = new Map();
      for (const [material, list] of bins) {
        const geo = list.length > 1 ? mergeGeometries(list, false) : list[0];
        if (list.length > 1) list.forEach(g => g.dispose());
        const mesh = new THREE.Mesh(geo, material);
        const plain = noEdges.includes(material);
        mesh.castShadow = !plain; mesh.receiveShadow = !plain;
        if (!plain) kit.edged(mesh, { threshold });
        parent.add(mesh); out.set(material, mesh);
      }
      bins.clear();
      return out;
    }
  };
  return api;
}

export function createCapsule(ctx) {
  const { THREE, kit } = ctx;
  const { mat, COLORS, rand, clamp, damp } = kit;
  const items = ctx.items.slice(0, 12);
  const HALF = Math.PI / 2;

  const group = new THREE.Group(); group.name = 'machine-capsule';
  const texts = [], ownMats = [];
  const own = m => { ownMats.push(m); return m; };
  const lab = (parent, text, opts, x = 0, y = 0, z = 0) => {
    const t = kit.label(text, opts); t.position.set(x, y, z); parent.add(t); texts.push(t); return t;
  };

  // ————— dimensions (metres, local) —————
  const GR = 0.38;                                   // globe radius
  const GC = new THREE.Vector3(0, 1.24, 0);          // globe centre
  const CR = 0.088;                                  // capsule radius
  const FLOOR_Y = 0.945;                             // floor inside the globe
  const LIM = GR - CR - 0.004;
  const CRANK = new THREE.Vector3(-0.15, 0.66, 0.29);
  const CRANK_PLANE_Z = 0.35;
  const OUT_X = 0.15;                                // outlet / tray centre line
  const TRAY_Y = 0.46;
  const REST = new THREE.Vector3(OUT_X, TRAY_Y + CR, 0.386);

  // ————— static cabinet —————
  const b = makeBuilder(THREE, kit);
  b.box(0.70, 0.05, 0.62, mat.shade, 0, 0.025, 0);                                   // foot
  b.box(0.50, 0.37, 0.46, mat.paper, 0, 0.235, 0);                                   // pedestal
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) b.box(0.006, 0.012, 0.22, mat.ink, sx * 0.25, 0.14 + i * 0.035, 0); // vents
  b.box(0.38, 0.19, 0.008, mat.shade, 0, 0.235, 0.232);                              // instruction plate
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.cyl(0.006, 0.004, mat.steel, sx * 0.175, 0.235 + sy * 0.08, 0.237, HALF, 0, 0, 10);
  { const body = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.46, 0.58, 2, 0.03), mat.paper);   // mechanism body
    body.position.set(0, 0.65, 0); body.castShadow = body.receiveShadow = true; kit.edged(body, { threshold: 18 }); group.add(body); }
  b.box(0.645, 0.006, 0.585, mat.ink, 0, 0.445, 0);                                  // shadow gap under the body
  b.cyl(0.27, 0.05, mat.ink, 0, 0.905, 0, 0, 0, 0, 48);                              // collar
  b.cyl(0.225, 0.012, mat.paper, 0, 0.939, 0, 0, 0, 0, 40);                          // globe floor
  b.add(new THREE.TorusGeometry(0.272, 0.003, 6, 64), mat.orange, 0, 0.932, 0, HALF, 0, 0);
  // lid
  const lidY = GC.y + GR * Math.cos(0.26);
  b.cyl(0.108, 0.03, mat.paper, 0, lidY + 0.008, 0, 0, 0, 0, 32);
  b.cyl(0.03, 0.03, mat.ink, 0, lidY + 0.038, 0, 0, 0, 0, 20, 0.022);
  // marquee on two slim posts behind the globe
  for (const sx of [-1, 1]) b.box(0.022, 0.9, 0.022, mat.steel, sx * 0.31, 1.33, -0.27);
  b.box(0.74, 0.24, 0.03, mat.paper, 0, 1.86, -0.27);
  b.box(0.64, 0.005, 0.004, mat.orange, 0, 1.772, -0.254);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.cyl(0.006, 0.004, mat.steel, sx * 0.35, 1.86 + sy * 0.1, -0.254, HALF, 0, 0, 10);
  // crank bezel
  b.cyl(0.1, 0.012, mat.ink, CRANK.x, CRANK.y, CRANK.z + 0.006, HALF, 0, 0, 40);
  // coin slot (orange rim)
  b.box(0.078, 0.108, 0.004, mat.orange, 0.17, 0.785, 0.291);
  b.box(0.07, 0.1, 0.008, mat.steel, 0.17, 0.785, 0.294);
  b.box(0.008, 0.05, 0.003, mat.ink, 0.17, 0.795, 0.2985);
  // outlet
  b.box(0.23, 0.22, 0.004, mat.ink, OUT_X, 0.575, 0.2905);
  b.box(0.23, 0.004, 0.004, mat.orange, OUT_X, 0.69, 0.292);
  // tray
  b.box(0.27, 0.015, 0.2, mat.paper, OUT_X, TRAY_Y - 0.0075, 0.39);
  b.box(0.27, 0.045, 0.012, mat.paper, OUT_X, TRAY_Y + 0.0225, 0.484);
  for (const sx of [-1, 1]) b.box(0.012, 0.045, 0.2, mat.paper, OUT_X + sx * 0.129, TRAY_Y + 0.0225, 0.39);
  for (const sx of [-1, 1]) b.box(0.012, 0.03, 0.012, mat.paper, OUT_X + sx * 0.129, TRAY_Y - 0.02, 0.296);
  // body screws
  for (const sx of [-1, 1]) b.cyl(0.007, 0.004, mat.steel, sx * 0.272, 0.838, 0.2905, HALF, 0, 0, 10);
  b.cyl(0.007, 0.004, mat.steel, -0.272, 0.468, 0.2905, HALF, 0, 0, 10);
  b.build(group, { noEdges: [mat.orange] });

  // labels
  lab(group, 'CAPSULE', { font: 'disp', size: 0.1, letterSpacing: 0.02 }, 0, 1.85, -0.2535);
  lab(group, 'M.01', { font: 'monoMed', size: 0.02, anchorX: 'left' }, -0.33, 1.945, -0.2535);
  lab(group, '12 ROOMS', { font: 'mono', size: 0.02, anchorX: 'right', color: COLORS.soft }, 0.33, 1.945, -0.2535);
  lab(group, 'CAPSULE · 12 ROOMS', { font: 'mono', size: 0.015, anchorX: 'left', color: COLORS.soft }, -0.285, 0.826, 0.2915);
  lab(group, 'FREE PLAY', { font: 'mono', size: 0.012, color: COLORS.soft }, 0.17, 0.716, 0.2915);
  lab(group, 'HOW TO PLAY', { font: 'monoMed', size: 0.016, anchorX: 'left' }, -0.165, 0.3, 0.2365);
  lab(group, 'TURN THE CRANK ONE FULL CIRCLE\nA CAPSULE DROPS INTO THE TRAY\nEACH ONE HOLDS A PROJECT', { font: 'mono', size: 0.0135, anchorX: 'left', anchorY: 'top', lineHeight: 1.55 }, -0.165, 0.278, 0.2365);
  lab(group, 'M.01', { font: 'mono', size: 0.012, anchorX: 'right', color: COLORS.soft }, 0.165, 0.3, 0.2365);

  // globe: glass + an ink fresnel rim so the sphere reads as a drawn circle from any angle
  const globeGeo = new THREE.SphereGeometry(GR, 56, 36, 0, Math.PI * 2, 0.26, Math.acos((0.93 - GC.y) / GR) - 0.26);
  const globe = new THREE.Mesh(globeGeo, mat.glass); globe.position.copy(GC); globe.renderOrder = 2; group.add(globe);
  const rimMat = own(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(COLORS.ink) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = smoothstep(0.80, 0.95, f); gl_FragColor = vec4(uColor, a * 0.8); }'
  }));
  const rim = new THREE.Mesh(globeGeo, rimMat); rim.position.copy(GC); rim.renderOrder = 3; rim.raycast = () => {}; group.add(rim);
  const seam = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 72 }, (_, i) => new THREE.Vector3(Math.cos(i / 72 * 6.2832) * GR, 0, Math.sin(i / 72 * 6.2832) * GR))), mat.lineSoft);
  seam.position.copy(GC); seam.raycast = () => {}; group.add(seam);

  // agitator paddle on the globe floor (turns with the crank)
  const agit = new THREE.Group(); agit.position.set(0, FLOOR_Y + 0.004, 0); group.add(agit);
  { const ab = makeBuilder(THREE, kit);
    ab.box(0.34, 0.008, 0.022, mat.ink, 0, 0, 0); ab.box(0.022, 0.008, 0.34, mat.ink, 0, 0, 0);
    ab.cyl(0.03, 0.012, mat.ink, 0, 0.002, 0, 0, 0, 0, 16);
    ab.build(agit); }

  // crank (rotates about z)
  const crank = new THREE.Group(); crank.position.copy(CRANK); group.add(crank);
  { const cb = makeBuilder(THREE, kit);
    cb.cyl(0.08, 0.026, mat.steel, 0, 0, 0.025, HALF, 0, 0, 40);
    cb.box(0.17, 0.034, 0.014, mat.steel, 0, 0, 0.045);
    cb.cyl(0.013, 0.02, mat.steel, -0.066, 0, 0.06, HALF, 0, 0, 14);
    cb.cyl(0.018, 0.012, mat.ink, 0, 0, 0.058, HALF, 0, 0, 16);
    cb.cyl(0.019, 0.062, mat.ink, 0.066, 0, 0.083, HALF, 0, 0, 16);
    cb.cyl(0.021, 0.006, mat.steel, 0.066, 0, 0.117, HALF, 0, 0, 16);
    cb.build(crank); }
  // "turn me" arc (thin orange)
  const hint = new THREE.Group(); hint.position.set(CRANK.x, CRANK.y, CRANK.z + 0.004); group.add(hint);
  { const hb = makeBuilder(THREE, kit);
    hb.add(new THREE.TorusGeometry(0.122, 0.0022, 5, 28, 1.5), mat.orange, 0, 0, 0, 0, 0, 0.55);
    hb.add(new THREE.ConeGeometry(0.008, 0.022, 10), mat.orange, Math.cos(0.5) * 0.122, Math.sin(0.5) * 0.122, 0, 0, 0, 0.5 + Math.PI);
    hb.build(hint, { noEdges: [mat.orange] }); }

  // outlet flap (hinged at the top edge)
  const flap = new THREE.Group(); flap.position.set(OUT_X, 0.686, 0.297); group.add(flap);
  const flapPlate = kit.box(0.222, 0.212, 0.006, mat.shade); flapPlate.position.y = -0.106; flap.add(flapPlate);
  lab(flap, 'PUSH', { font: 'mono', size: 0.014, color: COLORS.soft }, 0, -0.03, 0.0038);

  // ————— capsules (instanced) —————
  const N = items.length;
  const botGeo = new THREE.SphereGeometry(CR, 24, 10, 0, Math.PI * 2, HALF, HALF);
  const topGeo = new THREE.SphereGeometry(CR, 24, 10, 0, Math.PI * 2, 0, HALF);
  const ringGeo = new THREE.TorusGeometry(CR * 1.004, 0.0035, 6, 32).rotateX(HALF);
  const bots = new THREE.InstancedMesh(botGeo, mat.ink, N);
  const tops = new THREE.InstancedMesh(topGeo, mat.paper, N);
  const rings = new THREE.InstancedMesh(ringGeo, mat.ink, N);
  for (const im of [bots, tops, rings]) { im.castShadow = true; im.frustumCulled = false; im.raycast = () => {}; group.add(im); }
  rings.castShadow = false;

  const LAT = 0.5;
  function codeTags(parent, code) {
    for (const yaw of [0, Math.PI]) {
      const h = new THREE.Group(); h.rotation.set(-LAT, yaw, 0, 'YXZ'); parent.add(h);
      const t = lab(h, code, { font: 'monoMed', size: 0.034 }, 0, 0, CR + 0.0015);
      t.curveRadius = -(CR + 0.0015); t.sync();
    }
  }
  const balls = items.map((it, i) => {
    const a = i * 2.4, rr = 0.05 + (i % 4) * 0.05;
    const ball = {
      it, i, inGlobe: true,
      p: new THREE.Vector3(Math.cos(a) * rr, FLOOR_Y + CR + 0.02 + i * 0.03, Math.sin(a) * rr),
      v: new THREE.Vector3(), w: new THREE.Vector3(),
      q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(-0.9, 0.9), rand(0, 6.28), rand(-0.9, 0.9))),
      tag: new THREE.Group()
    };
    codeTags(ball.tag, it.code); group.add(ball.tag);
    return ball;
  });

  // ————— the capsule just won (separate, so it can hinge open) —————
  const paperDS = own(mat.paper.clone()); paperDS.side = THREE.DoubleSide;
  const inkDS = own(mat.ink.clone()); inkDS.side = THREE.DoubleSide;
  const hero = new THREE.Group(); hero.visible = false; group.add(hero);
  const heroBot = new THREE.Mesh(botGeo, inkDS); heroBot.castShadow = true; hero.add(heroBot);
  const heroRing = new THREE.Mesh(ringGeo, mat.orange); hero.add(heroRing);
  const hinge = new THREE.Group(); hinge.position.set(CR, 0, 0); hero.add(hinge);   // hinge on the right, clear of the cabinet
  const heroTop = new THREE.Mesh(topGeo, paperDS); heroTop.position.set(-CR, 0, 0); heroTop.castShadow = true; hinge.add(heroTop);
  const heroTags = new THREE.Group(); heroTop.add(heroTags);
  const heroCodes = [];
  for (const yaw of [0, Math.PI]) {
    const h = new THREE.Group(); h.rotation.set(-LAT, yaw, 0, 'YXZ'); heroTags.add(h);
    const t = lab(h, '', { font: 'monoMed', size: 0.034 }, 0, 0, CR + 0.0015); t.curveRadius = -(CR + 0.0015); heroCodes.push(t);
  }
  // the ticket that rises out of it
  const card = new THREE.Group(); card.visible = false; card.rotation.x = -0.12; hero.add(card);
  const cardPlate = kit.box(0.32, 0.104, 0.003, mat.paper); card.add(cardPlate);
  const cardLine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.0025, 0.001), mat.orange); cardLine.position.set(0, 0.022, 0.002); card.add(cardLine);
  const cardCode = lab(card, '', { font: 'monoMed', size: 0.014, color: COLORS.orange, anchorX: 'left' }, -0.14, 0.036, 0.0022);
  const cardNo = lab(card, '', { font: 'mono', size: 0.012, color: COLORS.soft, anchorX: 'right' }, 0.14, 0.036, 0.0022);
  const cardTitle = lab(card, '', { font: 'disp', size: 0.025, maxWidth: 0.3 }, 0, 0.0, 0.0022);
  lab(card, 'TAP THE CAPSULE TO ENTER', { font: 'mono', size: 0.0095, color: COLORS.soft }, 0, -0.036, 0.0022);

  // ————— physics inside the globe —————
  const G = 9.8, SUB = 4;
  const _d = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3(), _dq = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  let asleep = false, calm = 0;

  function contact(ball, m, h) {            // m = inward surface normal
    _t.crossVectors(m, ball.v).multiplyScalar(1 / CR);
    ball.w.lerp(_t, 0.25);
    ball.v.multiplyScalar(1 - 1.6 * h);
  }
  function step(h, extra) {
    const dampK = 1 - Math.min(0.9, (0.4 + extra) * h);
    for (const a of balls) {
      if (!a.inGlobe) continue;
      a.v.y -= G * h; a.v.multiplyScalar(dampK); a.p.addScaledVector(a.v, h);
    }
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < N; i++) {
        const A = balls[i]; if (!A.inGlobe) continue;
        for (let j = i + 1; j < N; j++) {
          const B = balls[j]; if (!B.inGlobe) continue;
          _d.subVectors(B.p, A.p); const l2 = _d.lengthSq();
          if (l2 >= 4 * CR * CR || l2 < 1e-10) continue;
          const l = Math.sqrt(l2), o = (2 * CR - l) / 2; _n.copy(_d).multiplyScalar(1 / l);
          A.p.addScaledVector(_n, -o); B.p.addScaledVector(_n, o);
          const rv = (B.v.x - A.v.x) * _n.x + (B.v.y - A.v.y) * _n.y + (B.v.z - A.v.z) * _n.z;
          if (rv < 0) { const k = -(1 + (rv < -0.6 ? 0.3 : 0)) * rv / 2; A.v.addScaledVector(_n, -k); B.v.addScaledVector(_n, k); }
        }
      }
      for (const a of balls) {
        if (!a.inGlobe) continue;
        _d.subVectors(a.p, GC); const l = _d.length();
        if (l > LIM) {
          _n.copy(_d).multiplyScalar(1 / l); a.p.copy(GC).addScaledVector(_n, LIM);
          const vn = a.v.dot(_n);
          if (vn > 0) a.v.addScaledVector(_n, -(1 + (vn > 0.6 ? 0.3 : 0)) * vn);
          if (iter === 0) contact(a, _n.negate(), h);
        }
        if (a.p.y < FLOOR_Y + CR) {
          a.p.y = FLOOR_Y + CR;
          if (a.v.y < 0) a.v.y = a.v.y < -0.6 ? -a.v.y * 0.3 : 0;
          if (iter === 0) contact(a, UP, h);
        }
      }
    }
    for (const a of balls) {
      if (!a.inGlobe) continue;
      const wl = a.w.length();
      if (wl > 1e-3) { _dq.setFromAxisAngle(_t.copy(a.w).multiplyScalar(1 / wl), wl * h); a.q.premultiply(_dq); }
      a.w.multiplyScalar(1 - 2.5 * h);
    }
  }
  function simulate(dt) {
    calm += dt;
    const extra = calm > 1.5 ? (calm - 1.5) * 4 : 0;
    const h = dt / SUB;
    for (let s = 0; s < SUB; s++) step(h, extra);
    if (calm > 4) { asleep = true; for (const a of balls) { a.v.set(0, 0, 0); a.w.set(0, 0, 0); } }
  }
  function stir(k) {
    asleep = false; calm = 0;
    for (const a of balls) {
      if (!a.inGlobe) continue;
      a.v.x += rand(-1, 1) * k; a.v.z += rand(-1, 1) * k; a.v.y += rand(0.3, 1) * k;
    }
  }
  const _m4 = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function writeInstances() {
    for (const a of balls) {
      if (a.inGlobe) _m4.compose(a.p, a.q, _one); else _m4.copy(_zero);
      bots.setMatrixAt(a.i, _m4); tops.setMatrixAt(a.i, _m4); rings.setMatrixAt(a.i, _m4);
      a.tag.visible = a.inGlobe;
      if (a.inGlobe) { a.tag.position.copy(a.p); a.tag.quaternion.copy(a.q); }
    }
    bots.instanceMatrix.needsUpdate = tops.instanceMatrix.needsUpdate = rings.instanceMatrix.needsUpdate = true;
  }
  for (let i = 0; i < 420; i++) step(1 / 120, i > 240 ? 4 : 0);   // pre-settle the pile
  for (const a of balls) { a.v.set(0, 0, 0); a.w.set(0, 0, 0); }
  asleep = true; writeInstances();

  // ————— game state —————
  const won = new Set();
  let active = false, crankA = 0, turnT = 0, acc = 0, dragA = null, out = null, flash = 0, wiggleT = 0, dirty = false;
  const q0 = new THREE.Quaternion(), qRoll = new THREE.Quaternion(), qId = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0);
  const T_DROP = 1.05, T_OPEN = 0.7;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function dispense() {
    if (out && out.phase < 2) return;
    let back = null;
    if (out) {                                   // the last capsule goes back in through the top
      back = out.ball; back.inGlobe = true;
      back.p.set(GC.x + rand(-0.08, 0.08), GC.y + 0.2, GC.z + rand(-0.08, 0.08));
      back.v.set(0, -0.5, 0); back.w.set(rand(-3, 3), 0, rand(-3, 3));
      hero.visible = false; card.visible = false;
    }
    let pool = balls.filter(x => x.inGlobe && x !== back);
    if (!pool.length) pool = balls.filter(x => x.inGlobe);
    const fresh = pool.filter(x => !won.has(x.it.id));
    const src = fresh.length ? fresh : pool;
    const ball = src[Math.floor(Math.random() * src.length)];
    ball.inGlobe = false;
    out = { ball, t: 0, phase: 0 };
    q0.copy(ball.q);
    heroCodes.forEach(t => { t.text = ball.it.code; t.sync(); });
    cardCode.text = ball.it.code + ' · ' + String(ball.it.cat || '').toUpperCase(); cardCode.sync();
    cardNo.text = 'NO. ' + ball.it.no; cardNo.sync();
    cardTitle.text = ball.it.title; cardTitle.sync();
    hinge.rotation.z = 0;
    flash = 1; asleep = false; calm = 0; dirty = true;
  }

  function animateOut(dt) {
    if (!out) return;
    out.t += dt;
    if (out.phase === 0) {
      const t = out.t;
      const u = clamp((t - 0.25) / (T_DROP - 0.25), 0, 1), e = easeOut(u);
      hero.visible = t > 0.2;
      const z = 0.17 + (REST.z - 0.17) * e;
      const y = REST.y + 0.06 * (1 - e) * (1 - e) + Math.abs(Math.sin(u * Math.PI * 2)) * 0.022 * (1 - u);
      hero.position.set(REST.x, y, z);
      qRoll.setFromAxisAngle(X, (z - 0.17) / CR);
      hero.quaternion.copy(q0).premultiply(qRoll);
      flap.rotation.x = -1.25 * Math.sin(clamp(u / 0.85, 0, 1) * Math.PI) ** 0.7;
      if (t >= T_DROP) {
        out.phase = 1; out.t = 0; q0.copy(hero.quaternion); flap.rotation.x = 0;
        won.add(out.ball.it.id);
        ctx.award(out.ball.it, 'From the capsule machine');
      }
    } else if (out.phase === 1) {
      const t = clamp(out.t / T_OPEN, 0, 1);
      hero.position.copy(REST);
      hero.quaternion.copy(q0).slerp(qId, easeOut(clamp(out.t / 0.28, 0, 1)));
      const o = clamp((out.t - 0.18) / (T_OPEN - 0.18), 0, 1);
      hinge.rotation.z = -1.95 * easeBack(o);
      card.visible = o > 0.05;
      const c = easeOut(o);
      card.position.set(0, 0.03 + 0.2 * c, 0.01 + 0.03 * c); card.scale.setScalar(0.25 + 0.75 * c);
      if (t >= 1) { out.phase = 2; out.t = 0; }
    }
  }

  // ————— pointer helpers —————
  const _ray = new THREE.Ray(), _inv = new THREE.Matrix4(), _pt = new THREE.Vector3();
  function localRay(ray) {
    group.updateWorldMatrix(true, false);
    _inv.copy(group.matrixWorld).invert();
    return _ray.copy(ray).applyMatrix4(_inv);
  }
  function crankPoint(r) {
    if (Math.abs(r.direction.z) < 1e-5) return null;
    const k = (CRANK_PLANE_Z - r.origin.z) / r.direction.z;
    if (k <= 0) return null;
    return _pt.copy(r.origin).addScaledVector(r.direction, k);
  }

  const machine = {
    id: 'capsule', title: 'Capsule',
    group,
    dock: { position: new THREE.Vector3(0.1, 1.3, 2.1), target: new THREE.Vector3(0.02, 1.02, 0) },
    hint: 'Drag the crank round, or press TURN. Each capsule holds one project.',
    controls: [{ act: 'turn', label: 'TURN ↻', primary: true }],

    update(dt, t, s) {
      const near = s ? s.near : 0; active = !!(s && s.active);
      const busy = turnT > 0 || (out && out.phase < 2) || !asleep || flash > 0 || dirty;
      if (!active && near <= 0 && !busy) return;

      if (turnT > 0) {
        const before = turnT; turnT -= dt;
        crankA += dt * Math.PI * 2 / 0.85; stir(dt * 4.5);
        if (before > 0 && turnT <= 0) dispense();
      }
      // attract: now and then the crank twitches and the pile shivers
      let wig = 0;
      if (!active && near > 0 && turnT <= 0 && !ctx.reducedMotion && !(out && out.phase < 2)) {
        wiggleT += dt;
        const ph = wiggleT % 7;
        if (ph < 1.2) { wig = Math.sin(ph / 1.2 * Math.PI * 2) * 0.28 * Math.sin(ph / 1.2 * Math.PI); if (asleep && ph > 0.5 && ph < 0.6) stir(0.5); }
      }
      crank.rotation.z = -(crankA + wig);
      agit.rotation.y = (crankA + wig) * 0.5;
      hint.visible = dragA === null && turnT <= 0 && !(out && out.phase < 2);
      if (hint.visible) hint.rotation.z = Math.sin(t * 2.2) * 0.12;

      if (!asleep) { simulate(dt); dirty = true; }
      if (dirty) { writeInstances(); dirty = false; }
      animateOut(dt);
      if (out && out.phase === 2 && !ctx.reducedMotion) card.position.y = 0.23 + Math.sin(t * 1.6) * 0.004;
      if (flash > 0) flash = Math.max(0, flash - dt * 1.6);
      globe.scale.setScalar(1 + flash * 0.006);
    },

    setActive(on) { active = !!on; if (!on) dragA = null; },

    press(act) { if (act === 'turn' && turnT <= 0 && !(out && out.phase < 2)) turnT = 0.85; },
    hold() {},

    key(k, down) {
      if (k === ' ' || k === 'Spacebar' || k === 'Enter') { if (down) machine.press('turn'); return true; }
      return false;
    },

    pointer(e) {
      const r = localRay(e.ray);
      if (e.type === 'down') {
        const p = crankPoint(r);
        if (p && Math.hypot(p.x - CRANK.x, p.y - CRANK.y) < 0.2) { dragA = Math.atan2(p.y - CRANK.y, p.x - CRANK.x); return true; }
        return false;
      }
      if (e.type === 'move') {
        if (dragA === null) return false;
        const p = crankPoint(r); if (!p) return true;
        if (Math.hypot(p.x - CRANK.x, p.y - CRANK.y) < 0.015) return true;
        const a = Math.atan2(p.y - CRANK.y, p.x - CRANK.x);
        let d = a - dragA; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
        dragA = a;
        const cw = -d;                                 // clockwise, seen from the front
        if (cw > 0 && cw < 1.5 && turnT <= 0) {
          crankA += cw; acc += cw; stir(cw * 0.9);
          if (acc > Math.PI * 1.7) { acc = 0; dispense(); }
        }
        return true;
      }
      if (e.type === 'up') { const was = dragA !== null; dragA = null; return was; }
      if (e.type === 'tap') {
        if (out && out.phase >= 1) {                   // open capsule or its ticket → the project page
          _pt.copy(REST);
          const dCap = Math.sqrt(r.distanceSqToPoint(_pt));
          _pt.set(REST.x, REST.y + 0.23, REST.z + 0.04);
          const dCard = Math.sqrt(r.distanceSqToPoint(_pt));
          if (dCap < CR * 1.5 || dCard < 0.1) { if (out.ball.it.href) location.href = out.ball.it.href; return true; }
        }
        if (Math.sqrt(r.distanceSqToPoint(GC)) < GR) { stir(1.6); return true; }
        return false;
      }
      return false;
    },

    dispose() {
      texts.forEach(t => { t.removeFromParent(); t.dispose(); });
      group.traverse(o => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
      bots.dispose(); tops.dispose(); rings.dispose();
      ownMats.forEach(m => m.dispose());
      group.removeFromParent();
    }
  };
  return machine;
}
