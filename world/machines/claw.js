// M.02 — Claw machine. A crane cabinet: gantry on rails, orange cable, three-prong claw,
// eight prize blocks in the pit (twelve in rotation). Steer, drop, and collect at the left door.
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

export function createClaw(ctx) {
  const { THREE, kit } = ctx;
  const { mat, COLORS, rand, clamp, damp } = kit;
  const items = ctx.items;
  const HALF = Math.PI / 2;

  const group = new THREE.Group(); group.name = 'machine-claw';
  const texts = [], ownMats = [];
  const own = m => { ownMats.push(m); return m; };
  const lab = (parent, text, opts, x = 0, y = 0, z = 0) => {
    const t = kit.label(text, opts); t.position.set(x, y, z); parent.add(t); texts.push(t); return t;
  };

  // ————— dimensions (metres, local) —————
  const FZ = 0.48;                 // base front face
  const FLOOR = 0.88;              // pit floor surface
  const S = 0.16;                  // prize block edge
  const XR = 0.37, ZR = 0.33;      // claw travel
  const RAIL_Y = 1.80, PIVOT_Y = 1.74, REST_Y = 1.52;
  const CHUTE = { x: -0.33, z: 0.29 };
  const EXIT = { x: -0.31, y: 0.64, z0: 0.36, z1: 0.585 };
  const OPEN = 0.4, GRIP = 0.0, SHUT = -0.3;      // prong angles
  const STRADDLE = 0.085;                          // how well you must line up
  const AIM_Y = 1.1;                               // pointer plane (about the top of the pile)

  // ————— static cabinet —————
  const b = makeBuilder(THREE, kit);
  b.box(0.98, 0.06, 0.90, mat.shade, 0, 0.03, 0);                                   // plinth
  b.box(1.04, 0.80, 0.96, mat.paper, 0, 0.46, 0);                                   // base
  // prize door + tray (front left)
  b.box(0.30, 0.25, 0.004, mat.ink, -0.31, 0.685, FZ + 0.001);
  b.box(0.30, 0.005, 0.004, mat.orange, -0.31, 0.816, FZ + 0.002);
  b.box(0.32, 0.015, 0.2, mat.paper, -0.31, 0.5525, FZ + 0.1);
  b.box(0.32, 0.05, 0.012, mat.paper, -0.31, 0.585, FZ + 0.194);
  for (const sx of [-1, 1]) b.box(0.012, 0.05, 0.2, mat.paper, -0.31 + sx * 0.154, 0.585, FZ + 0.1);
  for (const sx of [-1, 1]) b.box(0.012, 0.06, 0.1, mat.paper, -0.31 + sx * 0.154, 0.515, FZ + 0.05);   // tray brackets
  // control ledge with joystick base and button ring
  b.box(0.54, 0.05, 0.15, mat.paper, 0.2, 0.80, FZ + 0.075);
  b.box(0.50, 0.02, 0.10, mat.shade, 0.2, 0.765, FZ + 0.05);
  b.cyl(0.032, 0.008, mat.ink, 0.06, 0.829, FZ + 0.075, 0, 0, 0, 24);
  b.cyl(0.036, 0.006, mat.ink, 0.33, 0.828, FZ + 0.075, 0, 0, 0, 24);
  b.add(new THREE.TorusGeometry(0.031, 0.002, 5, 32), mat.orange, 0.33, 0.832, FZ + 0.075, HALF, 0, 0);
  // coin slot (orange rim) and instruction plate
  b.box(0.078, 0.108, 0.004, mat.orange, 0.39, 0.655, FZ + 0.001);
  b.box(0.07, 0.1, 0.008, mat.steel, 0.39, 0.655, FZ + 0.004);
  b.box(0.008, 0.05, 0.003, mat.ink, 0.39, 0.665, FZ + 0.0085);
  b.box(0.36, 0.12, 0.006, mat.shade, 0.13, 0.655, FZ + 0.003);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.cyl(0.005, 0.004, mat.steel, 0.13 + sx * 0.168, 0.655 + sy * 0.048, FZ + 0.007, HALF, 0, 0, 10);
  // service door, lock, hinges, vents
  b.box(0.50, 0.36, 0.006, mat.paper, 0.2, 0.3, FZ + 0.003);
  b.cyl(0.013, 0.008, mat.steel, 0.41, 0.3, FZ + 0.008, HALF, 0, 0, 16);
  b.box(0.003, 0.012, 0.003, mat.ink, 0.41, 0.3, FZ + 0.0125);
  for (const sy of [-1, 1]) b.box(0.014, 0.05, 0.012, mat.steel, -0.05, 0.3 + sy * 0.12, FZ + 0.006);
  for (let i = 0; i < 6; i++) b.box(0.22, 0.008, 0.004, mat.ink, -0.31, 0.19 + i * 0.035, FZ + 0.001);
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) b.box(0.004, 0.008, 0.3, mat.ink, sx * 0.521, 0.19 + i * 0.035, -0.1);
  for (const sx of [-1, 1]) for (const sy of [0.1, 0.83]) b.cyl(0.007, 0.004, mat.steel, sx * 0.495, sy, FZ + 0.001, HALF, 0, 0, 10);
  // pit floor, chute hole and its low fence
  b.box(0.96, 0.02, 0.88, mat.shade, 0, 0.87, 0);
  b.box(0.26, 0.004, 0.26, mat.ink, CHUTE.x, FLOOR + 0.002, CHUTE.z);
  b.box(0.012, 0.1, 0.275, mat.paper, -0.194, FLOOR + 0.05, 0.2925);
  b.box(0.275, 0.1, 0.012, mat.paper, -0.3375, FLOOR + 0.05, 0.155);
  // glass box frame
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.05, 1.0, 0.05, mat.paper, sx * 0.495, 1.36, sz * 0.455);
  for (const sz of [-1, 1]) b.box(0.94, 0.025, 0.03, mat.paper, 0, 0.8725, sz * 0.455);
  for (const sx of [-1, 1]) b.box(0.03, 0.025, 0.86, mat.paper, sx * 0.495, 0.8725, 0);
  // header
  b.box(1.08, 0.34, 1.0, mat.paper, 0, 2.03, 0);
  b.box(0.98, 0.26, 0.008, mat.shade, 0, 2.035, 0.502);
  b.box(1.0, 0.025, 0.92, mat.shade, 0, 2.2125, 0);
  b.box(1.0, 0.01, 0.01, mat.orange, 0, 1.87, 0.503);                              // the light line
  for (const sx of [-1, 1]) b.box(0.01, 0.01, 1.0, mat.orange, sx * 0.543, 1.87, 0);
  for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) b.box(0.004, 0.01, 0.34, mat.ink, sx * 0.541, 1.97 + i * 0.032, 0);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.cyl(0.006, 0.004, mat.steel, sx * 0.47, 2.035 + sy * 0.11, 0.507, HALF, 0, 0, 10);
  // gantry: fixed z rails with end brackets
  for (const sx of [-1, 1]) {
    b.box(0.022, 0.022, 0.86, mat.steel, sx * 0.44, RAIL_Y, 0);
    for (const sz of [-1, 1]) b.box(0.03, 0.06, 0.02, mat.ink, sx * 0.44, RAIL_Y + 0.03, sz * 0.42);
  }
  b.build(group, { noEdges: [mat.orange] });

  // glass
  { const gb = makeBuilder(THREE, kit);
    for (const sz of [-1, 1]) gb.box(0.94, 0.975, 0.006, mat.glass, 0, 1.3725, sz * 0.455);
    for (const sx of [-1, 1]) gb.box(0.006, 0.975, 0.86, mat.glass, sx * 0.495, 1.3725, 0);
    const g = gb.build(group, { noEdges: [mat.glass] }).get(mat.glass); g.renderOrder = 2; }

  // labels
  lab(group, 'CLAW', { font: 'disp', size: 0.2, letterSpacing: 0.04 }, 0, 2.03, 0.5075);
  lab(group, 'M.02', { font: 'monoMed', size: 0.026, anchorX: 'left' }, -0.455, 2.035, 0.5075);
  lab(group, '8 / 12', { font: 'mono', size: 0.026, anchorX: 'right', color: COLORS.soft }, 0.455, 2.035, 0.5075);
  lab(group, 'PRIZE OUT', { font: 'mono', size: 0.015, color: COLORS.soft }, -0.31, 0.838, FZ + 0.002);
  lab(group, 'HOW TO PLAY', { font: 'monoMed', size: 0.014, anchorX: 'left' }, -0.03, 0.692, FZ + 0.0065);
  lab(group, '1  STEER THE CLAW OVER A BLOCK\n2  PRESS DROP\n3  COLLECT AT THE LEFT DOOR', { font: 'mono', size: 0.012, anchorX: 'left', anchorY: 'top', lineHeight: 1.5 }, -0.03, 0.676, FZ + 0.0065);
  lab(group, 'FREE PLAY', { font: 'mono', size: 0.012, color: COLORS.soft }, 0.39, 0.588, FZ + 0.002);
  lab(group, 'SERVICE', { font: 'mono', size: 0.012, color: COLORS.soft, anchorX: 'left' }, -0.02, 0.455, FZ + 0.0065);
  const flat = (t) => { t.rotation.x = -HALF; return t; };
  flat(lab(group, 'STEER', { font: 'mono', size: 0.012, color: COLORS.soft }, 0.06, 0.8255, FZ + 0.128));
  flat(lab(group, 'DROP', { font: 'mono', size: 0.012, color: COLORS.soft }, 0.33, 0.8255, FZ + 0.128));
  flat(lab(group, 'CHUTE', { font: 'mono', size: 0.022, color: 0xffffff }, CHUTE.x, FLOOR + 0.0045, CHUTE.z));

  // joystick + button (they follow the input)
  const stick = new THREE.Group(); stick.position.set(0.06, 0.833, FZ + 0.075); group.add(stick);
  { const sb = makeBuilder(THREE, kit);
    sb.cyl(0.006, 0.07, mat.steel, 0, 0.035, 0, 0, 0, 0, 10);
    sb.add(new THREE.SphereGeometry(0.019, 16, 12), mat.ink, 0, 0.08, 0);
    sb.build(stick, { noEdges: [mat.ink] }); }
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.016, 24), mat.paper);
  button.position.set(0.33, 0.838, FZ + 0.075); button.castShadow = true; kit.edged(button, { threshold: 30 }); group.add(button);

  // prize flap (hinged at the top)
  const flap = new THREE.Group(); flap.position.set(-0.31, 0.81, FZ + 0.0065); group.add(flap);
  const flapPlate = kit.box(0.29, 0.245, 0.006, mat.shade); flapPlate.position.y = -0.1225; flap.add(flapPlate);
  lab(flap, 'PUSH', { font: 'mono', size: 0.014, color: COLORS.soft }, 0, -0.03, 0.0038);

  // ————— gantry (moving) —————
  const bridge = new THREE.Group(); group.add(bridge);                 // rides in z
  { const bb = makeBuilder(THREE, kit);
    bb.box(0.9, 0.028, 0.04, mat.steel, 0, RAIL_Y, 0);
    for (const sx of [-1, 1]) bb.box(0.05, 0.05, 0.09, mat.ink, sx * 0.44, RAIL_Y, 0);
    bb.build(bridge); }
  const carriage = new THREE.Group(); bridge.add(carriage);            // rides in x
  { const cb = makeBuilder(THREE, kit);
    cb.box(0.1, 0.075, 0.1, mat.ink, 0, RAIL_Y - 0.008, 0);
    cb.box(0.104, 0.012, 0.104, mat.paper, 0, RAIL_Y + 0.036, 0);
    cb.cyl(0.022, 0.06, mat.steel, 0, PIVOT_Y + 0.005, 0, 0, 0, HALF, 16);
    cb.build(carriage); }
  const pivot = new THREE.Group(); pivot.position.y = PIVOT_Y; carriage.add(pivot);   // pendulum
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 1, 6).translate(0, -0.5, 0), mat.orange);
  cable.raycast = () => {}; pivot.add(cable);
  const head = new THREE.Group(); pivot.add(head);
  { const hb = makeBuilder(THREE, kit);
    hb.cyl(0.042, 0.04, mat.steel, 0, -0.005, 0, 0, 0, 0, 24);
    hb.cyl(0.03, 0.05, mat.paper, 0, 0.04, 0, 0, 0, 0, 20);
    hb.cyl(0.012, 0.016, mat.ink, 0, 0.072, 0, 0, 0, 0, 12);
    hb.cyl(0.014, 0.03, mat.ink, 0, -0.04, 0, 0, 0, 0, 12);
    hb.add(new THREE.TorusGeometry(0.0305, 0.0018, 5, 28), mat.orange, 0, 0.04, 0, HALF, 0, 0);
    hb.build(head, { noEdges: [mat.orange] }); }
  // three prongs, each a thin hooked plate on its own pivot
  const prongShape = new THREE.Shape();
  [[0, 0.008], [0.078, -0.062], [0.076, -0.145], [0.05, -0.176], [0.044, -0.166], [0.062, -0.14], [0.063, -0.068], [0, -0.012]]
    .forEach(([x, y], i) => (i ? prongShape.lineTo(x, y) : prongShape.moveTo(x, y)));
  const prongGeo = new THREE.ExtrudeGeometry(prongShape, { depth: 0.012, bevelEnabled: false }).translate(0, 0, -0.006);
  const prongs = [];
  for (let k = 0; k < 3; k++) {
    const yaw = new THREE.Group(); yaw.rotation.y = k * Math.PI * 2 / 3 + 0.5; head.add(yaw);
    const pv = new THREE.Group(); pv.position.set(0.035, -0.02, 0); yaw.add(pv);
    const m = new THREE.Mesh(prongGeo, mat.steel); m.castShadow = true; kit.edged(m, { threshold: 30 }); pv.add(m);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.02, 10).rotateX(HALF), mat.ink); pv.add(pin);
    prongs.push(pv);
  }

  // aim: a soft plumb line and a thin orange ring on whatever is below
  const aimLine = kit.line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0), mat.lineSoft); group.add(aimLine);
  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.0555, 40).rotateX(-HALF), mat.orange); reticle.raycast = () => {}; group.add(reticle);
  const msg = lab(group, '', { font: 'monoMed', size: 0.05, color: COLORS.orange, letterSpacing: 0.06 }, 0.08, 1.66, 0.40);
  msg.visible = false;

  // ————— prize blocks —————
  const blockGeo = new RoundedBoxGeometry(S, S, S, 2, 0.012);
  const edgeGeo = new THREE.EdgesGeometry(blockGeo, 30);
  const edgeLight = own(new THREE.LineBasicMaterial({ color: 0x6a6a6a }));
  const blocks = items.map((it, i) => {
    const dark = i % 2 === 1, col = dark ? 0xffffff : COLORS.ink;
    const g = new THREE.Group(); g.visible = false; group.add(g);
    const m = new THREE.Mesh(blockGeo, dark ? mat.ink : mat.paper); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const e = new THREE.LineSegments(edgeGeo, dark ? edgeLight : mat.line); e.raycast = () => {}; g.add(e);
    const h = S / 2 + 0.0012;
    const c = lab(g, it.code, { font: 'monoMed', size: 0.026, color: col }, 0, h, -0.045); c.rotation.x = -HALF;
    const tt = lab(g, it.title, { font: 'disp', size: 0.0185, color: col, maxWidth: 0.138, textAlign: 'center', lineHeight: 1.08 }, 0, h, 0.02); tt.rotation.x = -HALF;
    for (let k = 0; k < 4; k++) {
      const a = k * HALF;
      const sde = lab(g, it.code, { font: 'monoMed', size: 0.042, color: col }, Math.sin(a) * h, 0, Math.cos(a) * h); sde.rotation.y = a;
    }
    return { it, g, st: 'queue', col: null, pos: new THREE.Vector3(), vy: 0, yaw: 0, ox: 0, oz: 0, sc: 1 };
  });
  const cols = [[-0.05, -0.2], [0.22, -0.22], [0.28, 0.08], [0.02, 0.1], [-0.28, -0.12]].map(([x, z]) => ({ x, z, stack: [] }));
  const order = blocks.slice().sort(() => Math.random() - 0.5);
  const queue = [];
  let trayBlock = null;
  function seat(bk, col) {
    bk.col = col; col.stack.push(bk);
    const lifted = col.stack.length > 1;
    bk.ox = rand(-1, 1) * (lifted ? 0.022 : 0.012); bk.oz = rand(-1, 1) * (lifted ? 0.022 : 0.012);
    bk.yaw = rand(-0.45, 0.45); bk.g.visible = true; bk.sc = 1;
  }
  [2, 1, 2, 1, 2].forEach((n, ci) => { for (let k = 0; k < n; k++) { const bk = order.shift(); seat(bk, cols[ci]); bk.st = 'rest'; bk.pos.set(cols[ci].x + bk.ox, FLOOR + S / 2 + k * S, cols[ci].z + bk.oz); } });
  queue.push(...order);
  const syncBlock = bk => { bk.g.position.copy(bk.pos); bk.g.rotation.y = bk.yaw; bk.g.scale.setScalar(bk.sc); };
  blocks.forEach(syncBlock);

  // ————— state —————
  const claw = { x: 0.1, z: 0.12, y: REST_Y, open: OPEN, st: 'idle', t: 0, grab: null, cand: null, slipAt: -1, y0: 0, stopY: 0 };
  const held = { left: false, right: false, fwd: false, back: false };
  let active = false, target = null, dragging = false, msgT = 0, shake = 0, btn = 0, dirty = true;
  let swX = 0, swZ = 0, swVX = 0, swVZ = 0, pvx = 0, pvz = 0, lastX = claw.x, lastZ = claw.z;
  const SPEED = 0.5;

  function say(s) { msg.text = s; msg.sync(); msg.visible = true; msgT = 1.5; }

  /** What is under the claw: how far the hub may descend, and the block it would straddle. */
  function probe() {
    let y = FLOOR + 0.205, cand = null, best = 1e9, surf = FLOOR;
    for (const c of cols) {
      if (!c.stack.length) continue;
      const top = c.stack[c.stack.length - 1]; if (top.st !== 'rest') continue;
      const d = Math.hypot(top.pos.x - claw.x, top.pos.z - claw.z), topY = top.pos.y + S / 2;
      if (d < STRADDLE) { y = Math.max(y, topY + 0.07); if (d < best) { best = d; cand = top; } surf = Math.max(surf, topY); }
      else if (d < 0.15) { y = Math.max(y, topY + 0.205); surf = Math.max(surf, topY); }
    }
    if (cand && Math.abs(y - (cand.pos.y + S / 2 + 0.07)) > 1e-4) cand = null;   // something taller is in the way
    return { y, cand, surf };
  }

  function startDrop() {
    if (claw.st !== 'idle') return;
    let p = probe();
    claw.assist = null;
    if (!p.cand) {                     // gentle aim assist: drift onto a block that is nearly lined up
      let best = null, bd = 0.17;
      for (const c of cols) {
        const top = c.stack[c.stack.length - 1]; if (!top || top.st !== 'rest') continue;
        const d = Math.hypot(top.pos.x - claw.x, top.pos.z - claw.z); if (d < bd) { bd = d; best = top; }
      }
      if (best) {
        const ox = claw.x, oz = claw.z;
        claw.x = best.pos.x + (ox - best.pos.x) * 0.25; claw.z = best.pos.z + (oz - best.pos.z) * 0.25;
        p = probe(); claw.assist = { x: claw.x, z: claw.z }; claw.x = ox; claw.z = oz;
      }
    }
    claw.st = 'down'; claw.stopY = p.y; claw.cand = p.cand; target = null; btn = 1;
  }

  function nextColumn(prefer) {
    let min = Infinity; for (const c of cols) min = Math.min(min, c.stack.length);
    const opts = cols.filter(c => c.stack.length === min);
    return opts.includes(prefer) ? prefer : opts[Math.floor(Math.random() * opts.length)];
  }

  const hubW = new THREE.Vector3();
  function hubLocal() { head.updateWorldMatrix(true, false); head.getWorldPosition(hubW); return group.worldToLocal(hubW); }

  function stepClaw(dt, t, near) {
    const c = claw;
    if (c.st === 'idle') {
      let dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dz = (held.back ? 1 : 0) - (held.fwd ? 1 : 0);
      if (!active && near > 0 && !ctx.reducedMotion) {          // attract: a slow wander over the pit
        target = target || { x: 0, z: 0 };
        target.x = 0.1 + Math.sin(t * 0.31) * 0.24; target.z = -0.05 + Math.sin(t * 0.23 + 1.3) * 0.2;
      }
      if (dx || dz) { target = null; const l = Math.hypot(dx, dz); c.x += dx / l * SPEED * dt; c.z += dz / l * SPEED * dt; }
      else if (target) {
        const ex = target.x - c.x, ez = target.z - c.z, l = Math.hypot(ex, ez), sp = (active ? SPEED : 0.12) * dt;
        if (l <= sp) { c.x = target.x; c.z = target.z; if (active) target = null; } else { c.x += ex / l * sp; c.z += ez / l * sp; }
      }
      c.x = clamp(c.x, -XR, XR); c.z = clamp(c.z, -ZR, ZR);
      c.open = damp(c.open, OPEN, 10, dt);
    } else if (c.st === 'down') {
      c.y -= 0.7 * dt;
      if (c.assist) { c.x = damp(c.x, c.assist.x, 9, dt); c.z = damp(c.z, c.assist.z, 9, dt); }
      if (c.y <= c.stopY) { c.y = c.stopY; c.st = 'close'; c.t = 0; if (c.assist) { c.x = c.assist.x; c.z = c.assist.z; c.assist = null; } }
    } else if (c.st === 'close') {
      c.t += dt;
      const k = clamp(c.t / 0.3, 0, 1);
      c.open = OPEN + ((c.cand ? GRIP : SHUT) - OPEN) * k;
      if (c.cand) { c.cand.pos.x = damp(c.cand.pos.x, c.x, 14, dt); c.cand.pos.z = damp(c.cand.pos.z, c.z, 14, dt); }
      if (c.t > 0.42) {
        if (c.cand) {
          const bk = c.cand; c.grab = bk; bk.st = 'held';
          bk.col.stack.splice(bk.col.stack.indexOf(bk), 1);
          c.slipAt = Math.random() < 0.15 ? rand(0.3, 0.7) : -1;
        } else say('MISSED');
        c.cand = null; c.st = 'up'; c.y0 = c.y;
      }
    } else if (c.st === 'up') {
      c.y += 0.6 * dt;
      if (c.grab && c.slipAt > 0 && (c.y - c.y0) / (REST_Y - c.y0) > c.slipAt) {
        const bk = c.grab; c.grab = null; bk.st = 'fall'; bk.vy = 0; bk.col.stack.push(bk);
        c.open = OPEN * 0.6; shake = 1; say('SLIPPED');
      }
      if (c.y >= REST_Y) { c.y = REST_Y; c.st = c.grab ? 'home' : 'idle'; }
    } else if (c.st === 'home') {
      const ex = CHUTE.x - c.x, ez = CHUTE.z - c.z, l = Math.hypot(ex, ez), sp = 0.55 * dt;
      if (l <= sp) { c.x = CHUTE.x; c.z = CHUTE.z; c.st = 'release'; c.t = 0; } else { c.x += ex / l * sp; c.z += ez / l * sp; }
    } else if (c.st === 'release') {
      c.t += dt;
      if (c.t > 0.25) c.open = damp(c.open, OPEN, 16, dt);
      if (c.t > 0.3 && c.grab) { const bk = c.grab; c.grab = null; bk.st = 'chute'; bk.vy = 0; bk.pos.x = CHUTE.x; bk.pos.z = CHUTE.z; }
      if (c.t > 0.75) c.st = 'idle';
    }
  }

  function stepBlocks(dt) {
    let moving = false;
    for (const bk of blocks) {
      if (bk.st === 'queue') continue;
      if (bk.st === 'rest' || bk.st === 'fall') {
        const idx = bk.col.stack.indexOf(bk), ty = FLOOR + S / 2 + idx * S;
        const tx = bk.col.x + bk.ox, tz = bk.col.z + bk.oz;
        if (bk === claw.cand) { moving = true; }
        else if (bk.pos.y > ty + 1e-4 || bk.vy > 0) {
          bk.st = 'fall'; moving = true;
          bk.vy -= 9.8 * dt; bk.pos.y += bk.vy * dt;
          bk.pos.x = damp(bk.pos.x, tx, 7, dt); bk.pos.z = damp(bk.pos.z, tz, 7, dt);
          bk.sc = Math.min(1, bk.sc + dt * 6);
          if (bk.pos.y <= ty) { bk.pos.y = ty; if (bk.vy < -1.4) bk.vy = -bk.vy * 0.22; else bk.vy = 0; }
        } else {
          bk.pos.y = ty; bk.vy = 0; bk.sc = 1;
          if (Math.abs(bk.pos.x - tx) + Math.abs(bk.pos.z - tz) > 1e-4) { bk.pos.x = damp(bk.pos.x, tx, 10, dt); bk.pos.z = damp(bk.pos.z, tz, 10, dt); moving = true; }
          bk.st = 'rest';
        }
      } else if (bk.st === 'held') {
        const h = hubLocal(); moving = true;
        bk.pos.x = damp(bk.pos.x, h.x, 20, dt); bk.pos.z = damp(bk.pos.z, h.z, 20, dt); bk.pos.y = h.y - 0.15;
      } else if (bk.st === 'chute') {
        moving = true;
        bk.vy -= 9.8 * dt; bk.pos.y += bk.vy * dt;
        if (bk.pos.y < 0.6) { bk.st = 'exit'; bk.t = 0; bk.yaw0 = bk.yaw; }
      } else if (bk.st === 'exit') {
        moving = true;
        bk.t += dt;
        const u = clamp(bk.t / 0.7, 0, 1), e = 1 - Math.pow(1 - u, 3);
        bk.pos.set(EXIT.x, EXIT.y, EXIT.z0 + (EXIT.z1 - EXIT.z0) * e);
        bk.yaw = bk.yaw0 * (1 - e) + 0.12 * e;
        flap.rotation.x = -1.15 * Math.pow(Math.sin(clamp(u / 0.9, 0, 1) * Math.PI), 0.6);
        if (u >= 1) {
          flap.rotation.x = 0;
          if (trayBlock) { trayBlock.st = 'queue'; trayBlock.g.visible = false; }
          bk.st = 'tray'; trayBlock = bk; queue.push(bk);
          ctx.award(bk.it, 'From the claw machine');
          const nb = queue.shift(), col = nextColumn(bk.col);        // a fresh block drops into the pit
          seat(nb, col); nb.st = 'fall'; nb.vy = 0; nb.sc = 0.2;
          nb.pos.set(col.x + nb.ox, 1.66, col.z + nb.oz);
          bk.col = null;
        }
      }
      syncBlock(bk);
    }
    return moving;
  }

  function pose(dt, t) {
    const c = claw;
    // pendulum sway from carriage acceleration
    const vx = (c.x - lastX) / Math.max(dt, 1e-4), vz = (c.z - lastZ) / Math.max(dt, 1e-4);
    const ax = clamp((vx - pvx) / Math.max(dt, 1e-4), -4, 4), az = clamp((vz - pvz) / Math.max(dt, 1e-4), -4, 4);
    pvx = vx; pvz = vz; lastX = c.x; lastZ = c.z;
    swVX += (-34 * swX - 5 * swVX - ax * 1.1) * dt; swX = clamp(swX + swVX * dt, -0.22, 0.22);
    swVZ += (-34 * swZ - 5 * swVZ - az * 1.1) * dt; swZ = clamp(swZ + swVZ * dt, -0.22, 0.22);
    shake = Math.max(0, shake - dt * 2.2);
    bridge.position.z = c.z; carriage.position.x = c.x;
    pivot.rotation.z = swX + Math.sin(t * 46) * 0.05 * shake;
    pivot.rotation.x = -swZ;
    const len = PIVOT_Y - c.y;
    head.position.y = -len; cable.scale.y = Math.max(0.01, len - 0.078);
    for (const pv of prongs) pv.rotation.z = c.open;
    // aim helpers
    const idle = c.st === 'idle';
    aimLine.visible = reticle.visible = idle;
    if (idle) {
      const p = probe();
      reticle.position.set(c.x, p.surf + 0.004, c.z);
      const tipY = c.y - 0.16;
      aimLine.position.set(c.x, tipY, c.z); aimLine.scale.y = Math.max(0.001, tipY - p.surf);
      const s = p.cand ? 1 + Math.sin(t * 9) * 0.08 : 0.8; reticle.scale.set(s, 1, s);
    }
    // cabinet controls echo the input
    const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dz = (held.back ? 1 : 0) - (held.fwd ? 1 : 0);
    stick.rotation.z = damp(stick.rotation.z, -dx * 0.38, 14, dt); stick.rotation.x = damp(stick.rotation.x, dz * 0.38, 14, dt);
    btn = Math.max(0, btn - dt * 3); button.position.y = 0.838 - Math.min(1, btn * 2) * 0.008;
    if (msgT > 0) { msgT -= dt; msg.position.y = 1.66 + (1.5 - msgT) * 0.03; if (msgT <= 0) msg.visible = false; }
  }

  // ————— pointer helpers —————
  const _ray = new THREE.Ray(), _inv = new THREE.Matrix4(), _pt = new THREE.Vector3();
  const cabinet = new THREE.Box3(new THREE.Vector3(-0.56, 0, -0.52), new THREE.Vector3(0.56, 2.24, 0.7));
  function localRay(ray) {
    group.updateWorldMatrix(true, false);
    _inv.copy(group.matrixWorld).invert();
    return _ray.copy(ray).applyMatrix4(_inv);
  }
  function aimPoint(r) {
    if (Math.abs(r.direction.y) < 1e-5) return null;
    const k = (AIM_Y - r.origin.y) / r.direction.y;
    if (k <= 0) return null;
    return _pt.copy(r.origin).addScaledVector(r.direction, k);
  }

  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'fwd', ArrowDown: 'back', a: 'left', d: 'right', w: 'fwd', s: 'back', A: 'left', D: 'right', W: 'fwd', S: 'back' };

  const machine = {
    id: 'claw', title: 'Claw',
    group,
    dock: { position: new THREE.Vector3(0, 1.55, 2.2), target: new THREE.Vector3(0, 1.12, 0) },
    hint: 'Steer with the arrows (or drag on the glass), then DROP. Line the ring up over a block; prizes come out of the left door.',
    controls: [
      { act: 'left', label: '◀', hold: true }, { act: 'fwd', label: '▲', hold: true },
      { act: 'back', label: '▼', hold: true }, { act: 'right', label: '▶', hold: true },
      { act: 'drop', label: 'DROP', primary: true }
    ],

    update(dt, t, s) {
      const near = s ? s.near : 0; active = !!(s && s.active);
      const busy = claw.st !== 'idle' || dirty || msgT > 0 || shake > 0;
      if (!active && near <= 0 && !busy) return;
      stepClaw(dt, t, near);
      pose(dt, t);
      dirty = stepBlocks(dt);
    },

    setActive(on) {
      active = !!on; dragging = false; target = null;
      held.left = held.right = held.fwd = held.back = false;
    },

    press(act) {
      if (act === 'drop') { startDrop(); return; }
      if (claw.st !== 'idle') return;
      const n = 0.06; target = null;
      if (act === 'left') claw.x = clamp(claw.x - n, -XR, XR);
      if (act === 'right') claw.x = clamp(claw.x + n, -XR, XR);
      if (act === 'fwd') claw.z = clamp(claw.z - n, -ZR, ZR);
      if (act === 'back') claw.z = clamp(claw.z + n, -ZR, ZR);
    },

    hold(act, on) { if (act in held) { held[act] = !!on; if (on) target = null; } },

    key(k, down) {
      if (KEYS[k]) { machine.hold(KEYS[k], down); return true; }
      if (k === ' ' || k === 'Spacebar' || k === 'Enter') { if (down) startDrop(); return true; }
      return false;
    },

    pointer(e) {
      const r = localRay(e.ray);
      const inside = r.intersectsBox(cabinet);
      if (e.type === 'down') { dragging = inside; return inside; }
      if (e.type === 'move') {
        if (!dragging) return false;
        if (claw.st === 'idle') {
          const p = aimPoint(r);
          if (p) target = { x: clamp(p.x, -XR, XR), z: clamp(p.z, -ZR, ZR) };
        }
        return true;
      }
      if (e.type === 'up') { const was = dragging; dragging = false; return was; }
      if (e.type === 'tap') { if (!inside) return false; target = null; startDrop(); return true; }
      return false;
    },

    dispose() {
      texts.forEach(t => { t.removeFromParent(); t.dispose(); });
      group.traverse(o => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
      blockGeo.dispose(); edgeGeo.dispose(); prongGeo.dispose();
      ownMats.forEach(m => m.dispose());
      group.removeFromParent();
    }
  };
  return machine;
}
