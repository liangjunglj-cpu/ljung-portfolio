// M.03 — Brick table. A waist-high build table with a stud baseplate; every project is a 2×N brick.
// Aim with the pointer (snaps to the stud grid), R rotates, Space / tap drops. Bricks stack on a heightmap.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const COLS = 16, ROWS = 12;          // baseplate studs (x, z)
const P = 0.05;                      // stud pitch
const BH = 0.058;                    // brick height
const STUD_R = 0.015, STUD_H = 0.009;
const MAX_LAYERS = 6;                // tower limit
const TABLE_H = 0.9, PLATE_T = 0.012;
const PLATE_Y = TABLE_H + PLATE_T;   // top of the baseplate (local y)
const HOVER = 0.17;                  // how far the held brick floats above its landing spot
const GAP = 0.003;                   // visual gap between neighbouring bricks
const FROM = 'From the brick table';

export function createBricks(ctx) {
  const { kit, items } = ctx;
  const { mat, COLORS } = kit;
  const reduced = !!ctx.reducedMotion;

  const group = new THREE.Group(); group.name = 'machine-bricks';
  const ownMats = [];
  const own = m => { ownMats.push(m); return m; };
  const edgeLight = own(new THREE.LineBasicMaterial({ color: 0x8f8f8f }));
  const dashMat = own(new THREE.LineDashedMaterial({ color: COLORS.ink, dashSize: 0.011, gapSize: 0.008 }));
  const guideMat = own(new THREE.LineBasicMaterial({ color: COLORS.orange }));

  const put = (o, x, y, z, parent = group) => { o.position.set(x, y, z); parent.add(o); return o; };
  const cyl = (r1, r2, h, material, seg = 24, edges = true) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), material);
    m.castShadow = true; m.receiveShadow = true; if (edges) kit.edged(m); return m;
  };

  /* ───────────── table ───────────── */
  const TW = 1.22, TD = 0.92;
  put(kit.box(TW, 0.04, TD, mat.paper), 0, TABLE_H - 0.02, 0);
  const LX = TW / 2 - 0.065, LZ = TD / 2 - 0.06;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    put(kit.box(0.05, TABLE_H - 0.052, 0.05, mat.paper), sx * LX, (TABLE_H - 0.04 + 0.012) / 2, sz * LZ);
    put(kit.box(0.064, 0.012, 0.064, mat.ink, { edges: false }), sx * LX, 0.006, sz * LZ);
  }
  for (const sz of [-1, 1]) put(kit.box(LX * 2 - 0.05, 0.09, 0.02, mat.shade), 0, TABLE_H - 0.085, sz * LZ);
  for (const sx of [-1, 1]) {
    put(kit.box(0.02, 0.09, LZ * 2 - 0.05, mat.shade), sx * LX, TABLE_H - 0.085, 0);
    put(kit.box(0.024, 0.03, LZ * 2 - 0.05, mat.paper), sx * LX, 0.17, 0);
  }
  put(kit.box(LX * 2 - 0.024, 0.03, 0.024, mat.paper), 0, 0.17, 0);
  // a shallow shelf slung under the top
  put(kit.box(LX * 2 - 0.2, 0.012, LZ * 2 - 0.16, mat.shade), 0, 0.5, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(cyl(0.005, 0.005, 0.31, mat.steel, 8, false), sx * (LX - 0.12), 0.655, sz * (LZ - 0.1));

  // screws: aprons (axis z / x) and baseplate corners (axis y)
  {
    const g = new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 10);
    const pts = [];
    const qz = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    const qx = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
    const q0 = new THREE.Quaternion();
    for (const sz of [-1, 1]) for (const x of [-LX + 0.07, -0.15, 0.15, LX - 0.07]) pts.push([x, TABLE_H - 0.085, sz * (LZ + 0.011), qz]);
    for (const sx of [-1, 1]) for (const z of [-LZ + 0.07, 0, LZ - 0.07]) pts.push([sx * (LX + 0.011), TABLE_H - 0.085, z, qx]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push([sx * (COLS * P / 2 + 0.012), PLATE_Y + 0.001, sz * (ROWS * P / 2 + 0.012), q0]);
    const im = new THREE.InstancedMesh(g, mat.steel, pts.length);
    const m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    pts.forEach((p, i) => im.setMatrixAt(i, m4.compose(v.set(p[0], p[1], p[2]), p[3], one)));
    im.raycast = () => {}; group.add(im);
  }

  /* ───────────── baseplate ───────────── */
  const plateW = COLS * P + 0.05, plateD = ROWS * P + 0.05;
  const plate = put(kit.box(plateW, PLATE_T, plateD, mat.shade), 0, TABLE_H + PLATE_T / 2, 0);
  plate.castShadow = false;
  const plateG = new THREE.Group(); plateG.position.y = PLATE_Y; group.add(plateG);   // origin: plate top centre
  {
    const g = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 20);
    const im = new THREE.InstancedMesh(g, mat.shade, COLS * ROWS);
    const m4 = new THREE.Matrix4(); const SEG = 20; const ring = [];
    let i = 0;
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const x = (c + 0.5 - COLS / 2) * P, z = (r + 0.5 - ROWS / 2) * P;
      im.setMatrixAt(i++, m4.makeTranslation(x, STUD_H / 2, z));
      for (let k = 0; k < SEG; k++) {
        const a0 = k / SEG * Math.PI * 2, a1 = (k + 1) / SEG * Math.PI * 2;
        ring.push(x + Math.cos(a0) * STUD_R, STUD_H + 0.0003, z + Math.sin(a0) * STUD_R, x + Math.cos(a1) * STUD_R, STUD_H + 0.0003, z + Math.sin(a1) * STUD_R);
      }
    }
    im.receiveShadow = true; im.raycast = () => {};
    plateG.add(im);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3));
    const rings = new THREE.LineSegments(rg, mat.line); rings.raycast = () => {}; plateG.add(rings);
  }
  // column index (hex) printed on the table in front of the plate — one text, spaced to the stud pitch
  {
    const s = 0.012, t = kit.label('0123456789ABCDEF', { font: 'mono', size: s, color: COLORS.soft, anchorX: 'left', letterSpacing: (P - 0.6 * s) / s });
    t.rotation.x = -Math.PI / 2; put(t, -COLS * P / 2 + (P - 0.6 * s) / 2, TABLE_H + 0.0006, plateD / 2 + 0.022);
    const o = kit.line(new THREE.Vector3(-COLS * P / 2, TABLE_H + 0.0006, plateD / 2 + 0.008), new THREE.Vector3(COLS * P / 2, TABLE_H + 0.0006, plateD / 2 + 0.008), mat.lineOrange);
    group.add(o);
  }

  /* ───────────── header plate ───────────── */
  const SIGN_Z = -TD / 2 + 0.03, SIGN_Y = 1.42;
  for (const sx of [-1, 1]) {
    put(cyl(0.008, 0.008, SIGN_Y + 0.06 - TABLE_H, mat.steel, 10, false), sx * 0.5, (SIGN_Y + 0.06 + TABLE_H) / 2, SIGN_Z);
    put(kit.box(0.04, 0.008, 0.04, mat.ink, { edges: false }), sx * 0.5, TABLE_H + 0.004, SIGN_Z);
  }
  put(kit.box(1.06, 0.17, 0.012, mat.paper), 0, SIGN_Y, SIGN_Z + 0.014);
  const signZ = SIGN_Z + 0.0208;
  put(kit.label('BRICKS', { font: 'disp', size: 0.092, anchorX: 'left', letterSpacing: -0.02 }), -0.495, SIGN_Y - 0.004, signZ);
  put(kit.label('M.03', { font: 'monoMed', size: 0.022, anchorX: 'right', anchorY: 'top', letterSpacing: 0.08 }), 0.495, SIGN_Y + 0.066, signZ);
  put(kit.label('EVERY PROJECT IS A BRICK', { font: 'mono', size: 0.0135, color: COLORS.soft, anchorX: 'right', anchorY: 'top', letterSpacing: 0.08 }), 0.495, SIGN_Y + 0.034, signZ);
  const status = put(kit.label('0 PLACED', { font: 'monoMed', size: 0.018, anchorX: 'right', anchorY: 'bottom', letterSpacing: 0.06 }), 0.495, SIGN_Y - 0.066, signZ);
  group.add(kit.line(new THREE.Vector3(-0.495, SIGN_Y - 0.07, signZ), new THREE.Vector3(0.14, SIGN_Y - 0.07, signZ), mat.lineOrange));

  /* ───────────── instruction plate (left) ───────────── */
  {
    const g = new THREE.Group(); g.rotation.x = -1.05;
    put(g, -(COLS * P / 2 + 0.105), TABLE_H + 0.034, 0.27);
    g.add(kit.box(0.15, 0.12, 0.005, mat.paper));
    put(kit.label('M.03 — HOW TO', { font: 'monoMed', size: 0.0085, anchorX: 'left', anchorY: 'top', letterSpacing: 0.08 }), -0.066, 0.051, 0.0032, g);
    put(kit.label('POINT TO AIM\nR  ROTATE 90°\nSPACE / TAP  DROP\nTAP A SIDE  REOPEN', { font: 'mono', size: 0.0078, color: COLORS.ink, anchorX: 'left', anchorY: 'top', lineHeight: 1.55, letterSpacing: 0.04 }), -0.066, 0.031, 0.0032, g);
    g.add(kit.line(new THREE.Vector3(-0.066, 0.037, 0.0032), new THREE.Vector3(0.066, 0.037, 0.0032), mat.lineOrange));
    put(kit.box(0.13, 0.05, 0.008, mat.shade), -(COLS * P / 2 + 0.105), TABLE_H + 0.025, 0.215);
  }

  /* ───────────── brick geometry (cached per length) ───────────── */
  const geoCache = new Map();
  function brickGeo(n) {
    if (geoCache.has(n)) return geoCache.get(n);
    const parts = [new THREE.BoxGeometry(n * P - GAP, BH, 2 * P - GAP).translate(0, BH / 2, 0)];
    for (let i = 0; i < n; i++) for (const s of [-1, 1])
      parts.push(new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 24).translate((i + 0.5 - n / 2) * P, BH + STUD_H / 2, s * P / 2));
    const geo = mergeGeometries(parts); parts.forEach(p => p.dispose());
    const e = { geo, edges: new THREE.EdgesGeometry(geo, 20) };
    geoCache.set(n, e); return e;
  }
  const lengthOf = it => kit.clamp(Math.round(it.title.length / 3.4) + 1, 2, 5);

  function makeBrick(item, dark) {
    const n = lengthOf(item), { geo, edges } = brickGeo(n);
    const obj = new THREE.Group();
    const mesh = new THREE.Mesh(geo, dark ? mat.ink : mat.paper);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const el = new THREE.LineSegments(edges, dark ? edgeLight : mat.line); el.raycast = () => {};
    obj.add(mesh, el);
    const texts = [];
    const L = n * P - GAP, D = 2 * P - GAP;
    const col = dark ? 0xffffff : COLORS.ink, sub = dark ? 0xb8b8b8 : COLORS.soft;
    const ts = Math.min(0.021, (L - 0.018) / (item.title.length * 0.6));
    for (const s of [1, -1]) {
      const side = new THREE.Group(); side.position.z = s * (D / 2 + 0.0007); side.rotation.y = s > 0 ? 0 : Math.PI;
      const code = kit.label(item.code, { font: 'monoMed', size: 0.0105, color: sub, anchorX: 'left', anchorY: 'top', letterSpacing: 0.1 });
      code.position.set(-L / 2 + 0.008, BH - 0.008, 0);
      const title = kit.label(item.title, { font: 'disp', size: ts, color: col, anchorX: 'left', anchorY: 'bottom' });
      title.position.set(-L / 2 + 0.008, 0.008, 0);
      side.add(code, title); texts.push(code, title); obj.add(side);
    }
    for (const s of [1, -1]) {
      const no = kit.label(item.no, { font: 'disp', size: 0.024, color: col });
      no.position.set(s * (L / 2 + 0.0007), BH / 2, 0); no.rotation.y = s * Math.PI / 2;
      texts.push(no); obj.add(no);
    }
    return { item, n, obj, mesh, texts, rot: 0, cx: 0, cz: 0, layer: 0, vy: 0, sq: -1, pop: 0 };
  }
  function freeBrick(rec) {
    rec.obj.removeFromParent();
    rec.texts.forEach(t => t.dispose());
  }

  /* ───────────── loose bricks in a tray (right) ───────────── */
  {
    const tx = COLS * P / 2 + 0.105, ty = TABLE_H;
    put(kit.box(0.16, 0.006, 0.36, mat.shade), tx, ty + 0.003, 0.02);
    for (const sx of [-1, 1]) put(kit.box(0.006, 0.022, 0.36, mat.paper), tx + sx * 0.077, ty + 0.011, 0.02);
    for (const sz of [-1, 1]) put(kit.box(0.148, 0.022, 0.006, mat.paper), tx, ty + 0.011, 0.02 + sz * 0.177);
    const loose = (n, dark, x, y, z, ry) => {
      const { geo, edges } = brickGeo(n);
      const m = new THREE.Mesh(geo, dark ? mat.ink : mat.paper); m.castShadow = m.receiveShadow = true; m.raycast = () => {};
      const l = new THREE.LineSegments(edges, dark ? edgeLight : mat.line); l.raycast = () => {}; m.add(l);
      m.rotation.y = ry; put(m, x, y, z);
    };
    loose(3, false, tx, ty + 0.006, -0.065, Math.PI / 2 + 0.05);
    loose(2, true, tx - 0.004, ty + 0.006, 0.115, Math.PI / 2 - 0.12);
    loose(2, false, tx + 0.006, ty + 0.006 + BH, -0.05, Math.PI / 2 + 0.42);
  }

  /* ───────────── ghost + guide lines ───────────── */
  const ghostGeo = new THREE.BufferGeometry();
  ghostGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(72), 3));
  const ghost = new THREE.LineSegments(ghostGeo, dashMat); ghost.raycast = () => {}; ghost.visible = false; ghost.frustumCulled = false; plateG.add(ghost);
  let ghostKey = '';
  function shapeGhost(w, d) {
    const key = w + 'x' + d; if (key === ghostKey) return; ghostKey = key;
    const x = w * P / 2 - GAP / 2, z = d * P / 2 - GAP / 2, y0 = 0.0008, y1 = BH;
    const c = [[-x, -z], [x, -z], [x, z], [-x, z]], a = ghostGeo.attributes.position.array; let i = 0;
    const seg = (ax, ay, az, bx, by, bz) => { a[i++] = ax; a[i++] = ay; a[i++] = az; a[i++] = bx; a[i++] = by; a[i++] = bz; };
    for (let k = 0; k < 4; k++) {
      const p = c[k], q = c[(k + 1) % 4];
      seg(p[0], y0, p[1], q[0], y0, q[1]); seg(p[0], y1, p[1], q[0], y1, q[1]); seg(p[0], y0, p[1], p[0], y1, p[1]);
    }
    ghostGeo.attributes.position.needsUpdate = true; ghost.computeLineDistances();
  }
  const guideGeo = new THREE.BufferGeometry();
  guideGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(24 + 24), 3));
  const guide = new THREE.LineSegments(guideGeo, guideMat); guide.raycast = () => {}; guide.visible = false; guide.frustumCulled = false; plateG.add(guide);

  /* ───────────── game state ───────────── */
  const heights = new Uint8Array(COLS * ROWS);
  let placed = [], order = [], cur = null, fall = null, seq = 0, msg = '', nextIn = -1, activeNow = false;
  const fw = b => (b.rot ? 2 : b.n), fd = b => (b.rot ? b.n : 2);
  const cellX = b => (b.cx + fw(b) / 2 - COLS / 2) * P, cellZ = b => (b.cz + fd(b) / 2 - ROWS / 2) * P;
  function landLayer(b) {
    let h = 0; const w = fw(b), d = fd(b);
    for (let x = b.cx; x < b.cx + w; x++) for (let z = b.cz; z < b.cz + d; z++) h = Math.max(h, heights[z * COLS + x]);
    return h;
  }
  function clampCell(b) { b.cx = kit.clamp(b.cx, 0, COLS - fw(b)); b.cz = kit.clamp(b.cz, 0, ROWS - fd(b)); }
  function setStatus() {
    const s = msg || `${String(placed.length).padStart(2, '0')} PLACED${cur ? ' · NEXT ' + cur.item.code : ''}`;
    if (status.text !== s) { status.text = s; status.color = msg ? COLORS.orange : COLORS.ink; status.sync(); }
  }
  function say(m) { if (msg !== m) { msg = m; setStatus(); } }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function next() {
    if (!order.length) order = shuffle(items.slice());
    const b = makeBrick(order.shift(), seq++ % 2 === 1);
    b.mesh.raycast = () => {};               // the held brick never blocks the pointer
    b.cx = Math.floor((COLS - b.n) / 2); b.cz = ROWS / 2 - 1;
    b.obj.position.set(cellX(b), landLayer(b) * BH + HOVER + 0.12, cellZ(b));
    b.obj.scale.setScalar(reduced ? 1 : 0.5); b.pop = 0;
    plateG.add(b.obj); cur = b; setStatus();
  }
  function move(dx, dz) { if (!cur) return; cur.cx += dx; cur.cz += dz; clampCell(cur); say(''); }
  function rotate() {
    if (!cur) return;
    const mx = cur.cx + fw(cur) / 2, mz = cur.cz + fd(cur) / 2;
    cur.rot = cur.rot ? 0 : 1;
    cur.cx = Math.round(mx - fw(cur) / 2); cur.cz = Math.round(mz - fd(cur) / 2); clampCell(cur); say('');
  }
  function drop() {
    if (!cur || fall) return;
    const l = landLayer(cur);
    if (l >= MAX_LAYERS) { say('TOWER FULL — MOVE OR RESET'); return; }
    fall = cur; cur = null; fall.layer = l; fall.vy = 0;
    fall.obj.position.x = cellX(fall); fall.obj.position.z = cellZ(fall);
    fall.obj.rotation.y = snapAngle(fall); fall.obj.scale.setScalar(1);
    if (reduced) fall.obj.position.y = l * BH;
  }
  function land(b) {
    b.obj.position.y = b.layer * BH;
    const w = fw(b), d = fd(b);
    for (let x = b.cx; x < b.cx + w; x++) for (let z = b.cz; z < b.cz + d; z++) heights[z * COLS + x] = b.layer + 1;
    delete b.mesh.raycast; b.mesh.userData.brick = b;
    placed.push(b); b.sq = reduced ? -1 : 0;
    fall = null; nextIn = reduced ? 0.05 : 0.2;
    msg = ''; setStatus();
    ctx.award(b.item, FROM);
  }
  function reset() {
    placed.forEach(freeBrick); placed = []; heights.fill(0);
    if (fall) { freeBrick(fall); fall = null; }
    if (cur) { freeBrick(cur); cur = null; }
    order = []; seq = 0; msg = ''; nextIn = -1; next();
  }
  // rotation target nearest the current angle (the brick is symmetric under a half turn)
  function snapAngle(b) { const base = b.rot * Math.PI / 2; return base + Math.round((b.obj.rotation.y - base) / Math.PI) * Math.PI; }

  /* ───────────── input ───────────── */
  const inv = new THREE.Matrix4(), lray = new THREE.Ray(), pt = new THREE.Vector3();
  function rayAt(y) {
    if (Math.abs(lray.direction.y) < 1e-5) return null;
    const t = (y - lray.origin.y) / lray.direction.y; if (t < 0) return null;
    return lray.at(t, pt);
  }
  function aimAt(ray) {
    if (!cur) return;
    group.updateWorldMatrix(true, false); inv.copy(group.matrixWorld).invert(); lray.copy(ray).applyMatrix4(inv);
    let y = PLATE_Y; const w = fw(cur), d = fd(cur), ox = cur.cx, oz = cur.cz;
    for (let i = 0; i < 3; i++) {
      const p = rayAt(y); if (!p) break;
      cur.cx = Math.round(p.x / P + COLS / 2 - w / 2); cur.cz = Math.round(p.z / P + ROWS / 2 - d / 2); clampCell(cur);
      const ny = PLATE_Y + Math.min(landLayer(cur), MAX_LAYERS) * BH;
      if (ny === y) break; y = ny;
    }
    if (cur.cx !== ox || cur.cz !== oz) say('');
  }
  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'fwd', ArrowDown: 'back', ' ': 'drop', Spacebar: 'drop', Enter: 'drop', r: 'rotate', R: 'rotate' };
  const held = new Set();
  function press(act) {
    if (act === 'reset') return reset();
    if (act === 'left') move(-1, 0); else if (act === 'right') move(1, 0);
    else if (act === 'fwd') move(0, -1); else if (act === 'back') move(0, 1);
    else if (act === 'rotate') rotate(); else if (act === 'drop') drop();
  }

  /* ───────────── frame ───────────── */
  function update(dt, t, s) {
    if (!s.active && !(s.near > 0)) return;
    dt = Math.min(dt, 1 / 30);
    const active = !!s.active;

    if (nextIn >= 0) { nextIn -= dt; if (nextIn < 0 && !cur) next(); }

    if (cur) {
      const l = landLayer(cur), full = l >= MAX_LAYERS, o = cur.obj;
      const ty = l * BH + HOVER + (reduced ? 0 : Math.sin(t * 2.2) * 0.006);
      o.position.x = kit.damp(o.position.x, cellX(cur), 22, dt);
      o.position.z = kit.damp(o.position.z, cellZ(cur), 22, dt);
      o.position.y = kit.damp(o.position.y, ty, 12, dt);
      if (!active && !reduced) o.rotation.y += dt * 0.5;                      // attract: slow turn above the plate
      else o.rotation.y = kit.damp(o.rotation.y, snapAngle(cur), 18, dt);
      if (cur.pop < 1) { cur.pop = Math.min(1, cur.pop + dt * 6); o.scale.setScalar(reduced ? 1 : 0.5 + 0.5 * (1 - Math.pow(1 - cur.pop, 3))); }

      const show = active && !full;
      ghost.visible = show; guide.visible = active;
      if (active) {
        const w = fw(cur), d = fd(cur), x = cellX(cur), z = cellZ(cur), hx = w * P / 2 - GAP / 2, hz = d * P / 2 - GAP / 2;
        shapeGhost(w, d); ghost.position.set(x, l * BH, z);
        const a = guideGeo.attributes.position.array, yb = o.position.y, yl = l * BH; let i = 0;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { a[i++] = x + sx * hx; a[i++] = yb; a[i++] = z + sz * hz; a[i++] = x + sx * hx; a[i++] = full ? yb : yl; a[i++] = z + sz * hz; }
        // footprint outline in orange on the landing surface
        const yf = l * BH + (l ? STUD_H : 0) + 0.0012, c = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
        for (let k = 0; k < 4; k++) { const p = c[k], q = c[(k + 1) % 4]; a[i++] = x + p[0]; a[i++] = full ? yb : yf; a[i++] = z + p[1]; a[i++] = x + q[0]; a[i++] = full ? yb : yf; a[i++] = z + q[1]; }
        guideGeo.attributes.position.needsUpdate = true;
      }
    } else { ghost.visible = false; guide.visible = false; }

    if (fall) {
      const o = fall.obj, ty = fall.layer * BH;
      fall.vy -= 9.8 * dt; o.position.y += fall.vy * dt;
      if (o.position.y <= ty) land(fall);
    }
    for (const b of placed) {
      if (b.sq < 0) continue;
      b.sq += dt / 0.2;
      if (b.sq >= 1) { b.sq = -1; b.obj.scale.set(1, 1, 1); continue; }
      const k = Math.sin(b.sq * Math.PI) * (1 - b.sq);
      b.obj.scale.set(1 + k * 0.07, 1 - k * 0.2, 1 + k * 0.07);
    }
    activeNow = active;
  }

  next();

  return {
    id: 'bricks', title: 'Bricks', group,
    dock: { position: new THREE.Vector3(0, PLATE_Y + 1.3, 1.2), target: new THREE.Vector3(0, PLATE_Y + 0.1, -0.02) },
    hint: 'Point to aim the brick, R rotates, tap or Space drops it. Every brick is a project — tap the side of a placed one to reopen it.',
    controls: [{ act: 'left', label: '◀' }, { act: 'fwd', label: '▲' }, { act: 'back', label: '▼' }, { act: 'right', label: '▶' },
      { act: 'rotate', label: '⟳' }, { act: 'drop', label: 'DROP', primary: true }, { act: 'reset', label: 'RESET' }],
    update,
    setActive(on) { activeNow = !!on; held.clear(); if (!on) { ghost.visible = false; guide.visible = false; } },
    press,
    hold() {},
    key(k, down) {
      const act = KEYS[k]; if (!act) return false;
      if (!down) { held.delete(act); return true; }
      if ((act === 'drop' || act === 'rotate') && held.has(act)) return true;   // no auto-repeat for these
      held.add(act); press(act); return true;
    },
    pointer(e) {
      if (e.type === 'up') return false;
      if (e.type === 'tap') {
        const rec = e.hit && e.hit.object && e.hit.object.userData.brick;
        if (rec && e.hit.face && Math.abs(e.hit.face.normal.y) < 0.5) {          // a printed side → reopen its ticket
          if (!reduced) rec.sq = 0.35;
          ctx.award(rec.item, FROM); return true;
        }
        aimAt(e.ray); drop(); return true;
      }
      aimAt(e.ray); return true;
    },
    dispose() {
      placed.forEach(freeBrick); if (cur) freeBrick(cur); if (fall) freeBrick(fall);
      placed = []; cur = fall = null;
      const geos = new Set();
      group.traverse(o => {
        if (o.geometry) geos.add(o.geometry);
        if (o.isMesh && typeof o.sync === 'function' && typeof o.dispose === 'function') o.dispose();   // troika text
        else if (o.isInstancedMesh) o.dispose();
      });
      geoCache.forEach(e => { geos.add(e.geo); geos.add(e.edges); }); geoCache.clear();
      geos.forEach(g => g.dispose());
      ownMats.forEach(m => m.dispose());
      group.clear();
    },
    // for scripted tests
    debug: () => ({ heights, placed, cur, fall, COLS, ROWS, P, PLATE_Y, MAX_LAYERS, get active() { return activeNow; } })
  };
}
