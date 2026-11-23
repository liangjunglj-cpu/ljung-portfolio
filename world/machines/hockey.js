// M.04 — Air hockey. Long axis along Z: the player stands at +Z, the far rail (−Z) has goal slots,
// each one a project. 2D physics in the table plane; the mallet follows the pointer on the near half.
import * as THREE from 'three';

const HW = 0.55, HL = 1.0;            // playfield half width (x) / half length (z)
const SY = 0.8;                       // playfield height
const PR = 0.035, PH = 0.012;         // puck radius / height
const MR = 0.055;                     // mallet radius
const RAIL_T = 0.05, RAIL_H = 0.036;
const POST_R = 0.011;
const WALL_Z = -HL;
const E = 0.9;                        // restitution
const VMAX = 6.4;
const GOALIE_Z = -HL + 0.15, GOALIE_HALF = 0.05, GOALIE_R = 0.018;
const FROM = 'Scored on the air hockey table';

export function createHockey(ctx) {
  const { kit, items } = ctx;
  const { mat, COLORS } = kit;
  const reduced = !!ctx.reducedMotion;
  const N = ctx.isMobile ? 3 : 5;
  const CELL = HW * 2 / N, GW = Math.min(CELL * 0.62, PR * 7);

  const group = new THREE.Group(); group.name = 'machine-hockey';
  const ownMats = [];
  const own = m => { ownMats.push(m); return m; };
  const edgeLight = own(new THREE.LineBasicMaterial({ color: 0x8f8f8f }));
  const dotMat = own(new THREE.MeshBasicMaterial({ color: 0xbdbdba }));
  const pocketMat = own(new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 1 }));

  const put = (o, x, y, z, parent = group) => { o.position.set(x, y, z); parent.add(o); return o; };
  const cyl = (r1, r2, h, material, seg = 32, edges = true, edgeMat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), material);
    m.castShadow = true; m.receiveShadow = true; if (edges) kit.edged(m, edgeMat ? { material: edgeMat } : undefined); return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ───────────── cabinet ───────────── */
  const BW = (HW + RAIL_T) * 2, BL = (HL + RAIL_T) * 2, BODY_H = 0.16;
  put(kit.box(BW, BODY_H, BL, mat.paper), 0, SY - BODY_H / 2, 0);
  // a recessed plinth line under the body
  put(kit.box(BW - 0.08, 0.03, BL - 0.08, mat.shade), 0, SY - BODY_H - 0.015, 0);
  const LX = BW / 2 - 0.085, LZ = BL / 2 - 0.13, LEG_TOP = SY - BODY_H - 0.03;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    put(kit.box(0.085, LEG_TOP - 0.03, 0.085, mat.paper), sx * LX, (LEG_TOP + 0.03) / 2, sz * LZ);
    put(cyl(0.03, 0.036, 0.03, mat.ink, 16, false), sx * LX, 0.015, sz * LZ);
    put(kit.box(0.1, 0.012, 0.1, mat.shade), sx * LX, LEG_TOP - 0.25, sz * LZ);   // leg collar
  }
  for (const sx of [-1, 1]) put(kit.box(0.03, 0.045, LZ * 2 - 0.085, mat.paper), sx * LX, 0.2, 0);
  for (const sz of [-1, 1]) put(kit.box(LX * 2 - 0.085, 0.045, 0.03, mat.paper), 0, 0.2, sz * LZ);
  // blower housing slung under the bed, with vent slits
  put(kit.box(0.4, 0.15, 0.52, mat.shade), 0, LEG_TOP - 0.075, 0);
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) put(kit.box(0.004, 0.07, 0.014, mat.ink, { edges: false, cast: false }), sx * 0.201, LEG_TOP - 0.075, -0.1 + i * 0.04);
  put(cyl(0.012, 0.012, LEG_TOP - 0.15 - 0.2, mat.steel, 10, false), 0.12, (LEG_TOP - 0.15 + 0.2) / 2, 0.18);   // duct / cable drop
  // puck return on the near apron + name plate
  put(kit.box(0.24, 0.06, 0.012, mat.ink, { edges: false, cast: false }), 0.3, SY - 0.085, BL / 2 + 0.002);
  put(kit.box(0.27, 0.085, 0.008, mat.paper), 0.3, SY - 0.085, BL / 2 + 0.001);
  put(kit.label('AIR HOCKEY', { font: 'disp', size: 0.052, anchorX: 'left', letterSpacing: -0.02 }), -BW / 2 + 0.05, SY - 0.075, BL / 2 + 0.0012);
  put(kit.label('M.04', { font: 'monoMed', size: 0.016, anchorX: 'left', anchorY: 'bottom', letterSpacing: 0.1, color: COLORS.soft }), -BW / 2 + 0.052, SY - 0.04, BL / 2 + 0.0012);
  group.add(kit.line(V(-BW / 2 + 0.05, SY - 0.118, BL / 2 + 0.0012), V(-0.14, SY - 0.118, BL / 2 + 0.0012), mat.lineOrange));
  // screws along the side aprons
  {
    const g = new THREE.CylinderGeometry(0.008, 0.008, 0.005, 10).rotateZ(Math.PI / 2);
    const zs = [-0.9, -0.45, 0, 0.45, 0.9], im = new THREE.InstancedMesh(g, mat.steel, zs.length * 4), m4 = new THREE.Matrix4(); let i = 0;
    for (const sx of [-1, 1]) for (const z of zs) for (const y of [SY - 0.03, SY - BODY_H + 0.03]) im.setMatrixAt(i++, m4.makeTranslation(sx * (BW / 2 + 0.002), y, z));
    im.raycast = () => {}; group.add(im);
  }

  /* ───────────── playfield ───────────── */
  const Y0 = SY + 0.0009;
  {
    // perforation: tiny dots on a 50 mm grid (one instanced draw)
    const g = new THREE.CircleGeometry(0.0024, 6).rotateX(-Math.PI / 2);
    const nx = 21, nz = 39, im = new THREE.InstancedMesh(g, dotMat, nx * nz), m4 = new THREE.Matrix4(); let i = 0;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) im.setMatrixAt(i++, m4.makeTranslation(-0.5 + a * 0.05, SY + 0.0005, -0.95 + b * 0.05));
    im.raycast = () => {}; group.add(im);
    // markings
    const arc = (cx, cz, r, a0, a1, material, n = 48) => {
      const pts = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push(V(cx + Math.cos(a) * r, Y0, cz + Math.sin(a) * r)); }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material); l.raycast = () => {}; group.add(l); return l;
    };
    group.add(kit.line(V(-HW, Y0, 0), V(HW, Y0, 0), mat.line));
    arc(0, 0, 0.16, 0, Math.PI * 2, mat.line, 64);
    arc(0, 0, 0.012, 0, Math.PI * 2, mat.line, 12);
    arc(0, HL, 0.24, Math.PI, Math.PI * 2, mat.lineSoft);            // near crease
    arc(0, -HL, 0.42, 0, Math.PI, mat.lineSoft);                      // far zone
    for (const sz of [-1, 1]) group.add(kit.line(V(-HW, Y0, sz * 0.5), V(HW, Y0, sz * 0.5), mat.lineSoft));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) arc(sx * 0.3, sz * 0.5, 0.012, 0, Math.PI * 2, mat.lineSoft, 12);
  }
  // rails
  const RY = SY + RAIL_H / 2;
  for (const sx of [-1, 1]) put(kit.box(RAIL_T, RAIL_H, BL, mat.paper), sx * (HW + RAIL_T / 2), RY, 0);
  put(kit.box(HW * 2, RAIL_H, RAIL_T, mat.paper), 0, RY, HL + RAIL_T / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(kit.box(RAIL_T + 0.012, RAIL_H + 0.008, RAIL_T + 0.012, mat.shade), sx * (HW + RAIL_T / 2), SY + (RAIL_H + 0.008) / 2, sz * (HL + RAIL_T / 2));
  {
    const t = kit.label('MOVE THE MALLET  ·  SCORE A SLOT TO OPEN THAT ROOM', { font: 'mono', size: 0.0125, color: COLORS.soft, letterSpacing: 0.08 });
    t.rotation.x = -Math.PI / 2; put(t, 0, SY + RAIL_H + 0.0006, HL + RAIL_T / 2);
  }

  /* ───────────── far rail: slots, posts, pocket, label plates ───────────── */
  const goals = [];
  {
    let lx = -HW;
    for (let i = 0; i < N; i++) {
      const x = -HW + CELL * (i + 0.5);
      const seg = (a, b) => { if (b - a > 0.004) put(kit.box(b - a, RAIL_H, RAIL_T, mat.paper), (a + b) / 2, RY, WALL_Z - RAIL_T / 2); };
      seg(lx, x - GW / 2); lx = x + GW / 2;
      if (i === N - 1) seg(lx, HW);
      for (const s of [-1, 1]) put(cyl(POST_R, POST_R, RAIL_H + 0.012, mat.ink, 24, true, edgeLight), x + s * GW / 2, SY + (RAIL_H + 0.012) / 2, WALL_Z);
      // slot throat (dark) + thin orange goal line
      const throat = put(new THREE.Mesh(new THREE.PlaneGeometry(GW, RAIL_T).rotateX(-Math.PI / 2), pocketMat), x, SY + 0.0006, WALL_Z - RAIL_T / 2);
      throat.receiveShadow = true; throat.raycast = () => {};
      const strip = put(new THREE.Mesh(new THREE.BoxGeometry(GW - POST_R * 2, 0.0012, 0.007), mat.orange), x, SY + 0.0014, WALL_Z + 0.003);
      strip.raycast = () => {};
      // upright plate behind the slot
      const pg = new THREE.Group(); pg.rotation.x = -0.32; put(pg, x, SY + 0.155, WALL_Z - 0.2);
      const pw = Math.min(CELL - 0.016, 0.3), ph = 0.2;
      pg.add(kit.box(pw, ph, 0.008, mat.paper));
      const code = put(kit.label('', { font: 'disp', size: 0.058, anchorY: 'top', letterSpacing: -0.02 }), 0, ph / 2 - 0.02, 0.0048, pg);
      const title = put(kit.label('', { font: 'monoMed', size: N === 3 ? 0.026 : 0.0235, anchorY: 'top', maxWidth: pw - 0.016, textAlign: 'center', lineHeight: 1.25, letterSpacing: 0 }), 0, ph / 2 - 0.1, 0.0048, pg);
      const no = put(kit.label('', { font: 'mono', size: 0.011, color: COLORS.soft, anchorX: 'left', anchorY: 'bottom', letterSpacing: 0.08 }), -pw / 2 + 0.008, -ph / 2 + 0.007, 0.0048, pg);
      const hw = pw / 2 - 0.004, hh = ph / 2 - 0.004;
      const frame = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([V(-hw, -hh, 0.0048), V(hw, -hh, 0.0048), V(hw, hh, 0.0048), V(-hw, hh, 0.0048)]), mat.lineOrange);
      frame.raycast = () => {}; frame.visible = false; pg.add(frame);
      pg.add(kit.line(V(-pw / 2 + 0.008, ph / 2 - 0.088, 0.0048), V(pw / 2 - 0.008, ph / 2 - 0.088, 0.0048), mat.lineSoft));
      // stem holding the plate
      put(kit.box(0.014, 0.1, 0.014, mat.steel, { edges: false }), x, SY + 0.02, WALL_Z - 0.185);
      goals.push({ x, item: null, strip, code, title, no, frame });
    }
    // catch pocket behind the rail
    const PZ0 = WALL_Z - RAIL_T, PD = 0.12, PY = SY - 0.05;
    put(kit.box(BW, 0.012, PD, pocketMat, { edges: false }), 0, PY, PZ0 - PD / 2);
    put(kit.box(BW, 0.1, 0.012, mat.paper), 0, PY + 0.044, PZ0 - PD);
    for (const sx of [-1, 1]) put(kit.box(0.012, 0.1, PD, mat.paper), sx * (BW / 2 - 0.006), PY + 0.044, PZ0 - PD / 2);
    put(kit.box(BW, BODY_H - 0.06, PD, mat.shade), 0, PY - 0.006 - (BODY_H - 0.06) / 2, PZ0 - PD / 2);
  }
  // header plate behind the goals
  const HZ = WALL_Z - 0.245, HY = 1.3;
  for (const sx of [-1, 1]) put(cyl(0.009, 0.009, HY + 0.06 - (SY - 0.1), mat.steel, 10, false), sx * 0.5, (HY + 0.06 + SY - 0.1) / 2, HZ - 0.016);
  put(kit.box(1.1, 0.15, 0.012, mat.paper), 0, HY, HZ);
  put(kit.label('AIR HOCKEY', { font: 'disp', size: 0.094, anchorX: 'left', letterSpacing: -0.02 }), -0.52, HY - 0.004, HZ + 0.0068);
  put(kit.label('M.04', { font: 'monoMed', size: 0.022, anchorX: 'right', anchorY: 'top', letterSpacing: 0.08 }), 0.52, HY + 0.058, HZ + 0.0068);
  const scoreLabel = put(kit.label('GOALS 00', { font: 'monoMed', size: 0.018, anchorX: 'right', anchorY: 'bottom', letterSpacing: 0.06 }), 0.52, HY - 0.058, HZ + 0.0068);
  group.add(kit.line(V(-0.52, HY - 0.062, HZ + 0.0068), V(0.2, HY - 0.062, HZ + 0.0068), mat.lineOrange));

  // goalie: a small block hanging from a rod across the far end
  const rodY = SY + 0.07;
  { const r = cyl(0.005, 0.005, BW, mat.steel, 8, false); r.rotation.z = Math.PI / 2; put(r, 0, rodY, GOALIE_Z); }
  for (const sx of [-1, 1]) put(kit.box(0.02, rodY + 0.012 - SY - RAIL_H, 0.02, mat.shade), sx * (HW + RAIL_T / 2), (rodY + 0.012 + SY + RAIL_H) / 2, GOALIE_Z);
  const goalieG = new THREE.Group(); put(goalieG, 0, SY, GOALIE_Z);
  put(kit.box((GOALIE_HALF + GOALIE_R) * 2, 0.03, GOALIE_R * 2, mat.ink, { edges: false }), 0, 0.017, 0, goalieG).add(
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry((GOALIE_HALF + GOALIE_R) * 2, 0.03, GOALIE_R * 2)), edgeLight));
  put(kit.box(0.012, rodY - SY - 0.03, 0.012, mat.steel, { edges: false }), 0, (rodY - SY + 0.03) / 2, 0, goalieG);
  put(kit.box(0.03, 0.02, 0.026, mat.paper), 0, rodY - SY, 0, goalieG);

  /* ───────────── puck + mallet ───────────── */
  const puckG = new THREE.Group(); group.add(puckG);
  put(cyl(PR, PR, PH, mat.ink, 32, true, edgeLight), 0, PH / 2, 0, puckG);
  {
    const pts = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; pts.push(V(Math.cos(a) * PR * 0.55, PH + 0.0004, Math.sin(a) * PR * 0.55)); }
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), edgeLight); l.raycast = () => {}; puckG.add(l);
  }
  const malG = new THREE.Group(); group.add(malG);
  put(cyl(MR, MR, 0.02, mat.paper), 0, 0.01, 0, malG);
  put(cyl(MR - 0.012, MR - 0.006, 0.008, mat.paper), 0, 0.024, 0, malG);
  put(cyl(0.02, 0.026, 0.045, mat.paper), 0, 0.05, 0, malG);
  { const k = new THREE.Mesh(new THREE.SphereGeometry(0.026, 20, 14), mat.ink); k.castShadow = true; put(k, 0, 0.088, 0, malG); }

  // "GOAL" call-out floating over the far half
  const goalText = put(kit.label('', { font: 'disp', size: 0.085, maxWidth: 1.05, textAlign: 'center', lineHeight: 1.05, letterSpacing: -0.02 }), 0, SY + 0.26, 0.05);
  goalText.rotation.x = -0.55; goalText.visible = false;

  /* ───────────── state ───────────── */
  const puck = { x: 0, z: -0.4, vx: 0, vz: 0.7 };
  const mal = { x: 0, z: HL - 0.22, vx: 0, vz: 0 };
  const aim = { x: mal.x, z: mal.z };
  const goalie = { x: 0, vx: 0 };
  const keys = {};
  let scored = null, stall = 0, count = 0, isActive = false;

  function relabel() {
    const pool = items.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    goals.forEach((g, i) => {
      g.item = pool[i % pool.length];
      g.code.text = g.item.code; g.title.text = g.item.title.toUpperCase(); g.no.text = 'N° ' + g.item.no;
      g.code.sync(); g.title.sync(); g.no.sync();
    });
  }
  function serve() {
    puck.x = kit.rand(-0.04, 0.04); puck.z = -0.42; puck.vx = kit.rand(-0.16, 0.16); puck.vz = 0.7; stall = 0;
    puckG.visible = true; puckG.scale.setScalar(1);
  }
  function clearScore() {
    if (!scored) return;
    scored.g.strip.scale.set(1, 1, 1); scored.g.frame.visible = false;
    scored.g.code.color = COLORS.ink; goalText.visible = false; scored = null;
  }
  function score(g, real) {
    scored = { g, t: 0, x: puck.x, real };
    if (real) {
      count++; scoreLabel.text = 'GOALS ' + String(count).padStart(2, '0'); scoreLabel.sync();
      goalText.text = 'GOAL\n' + g.item.title.toUpperCase(); goalText.fillOpacity = 1; goalText.visible = true; goalText.sync();
      ctx.award(g.item, FROM);
    }
    g.frame.visible = true; g.code.color = COLORS.orange;
  }

  function physics(dt, t, active) {
    // goalie drifts slowly along the far rail
    const gx0 = goalie.x; goalie.x = Math.sin(t * 0.75) * (HW - 0.16); goalie.vx = (goalie.x - gx0) / dt;

    if (active) {
      const ks = 1.1 * dt;
      if (keys.ArrowLeft) aim.x -= ks; if (keys.ArrowRight) aim.x += ks;
      if (keys.ArrowUp) aim.z -= ks; if (keys.ArrowDown) aim.z += ks;
    } else if (puck.z > 0.02 && !scored) {              // attract: a ghost player knocks the puck about
      const behind = mal.z > puck.z + 0.07 && Math.abs(mal.x - puck.x) < 0.05;
      aim.x = puck.x + Math.sin(t * 1.3) * 0.02; aim.z = behind ? puck.z - 0.2 : puck.z + 0.14;
    } else { aim.x = puck.x * 0.5; aim.z = HL - 0.25; }
    aim.x = kit.clamp(aim.x, -HW + MR, HW - MR); aim.z = kit.clamp(aim.z, MR, HL - MR);
    const mx0 = mal.x, mz0 = mal.z, k = 1 - Math.exp(-(active ? 22 : 5) * dt);
    mal.x += (aim.x - mal.x) * k; mal.z += (aim.z - mal.z) * k;
    mal.vx = (mal.x - mx0) / dt; mal.vz = (mal.z - mz0) / dt;

    if (scored) return;
    const sub = 8, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      const f = (s + 1) / sub, mx = mx0 + (mal.x - mx0) * f, mz = mz0 + (mal.z - mz0) * f;
      puck.x += puck.vx * h; puck.z += puck.vz * h;
      if (puck.x < -HW + PR) { puck.x = -HW + PR; puck.vx = Math.abs(puck.vx) * E; }
      if (puck.x > HW - PR) { puck.x = HW - PR; puck.vx = -Math.abs(puck.vx) * E; }
      if (puck.z > HL - PR) { puck.z = HL - PR; puck.vz = -Math.abs(puck.vz) * E; }
      const g = goals.find(g => Math.abs(puck.x - g.x) < GW / 2 - POST_R - PR * 0.2);
      if (puck.z < WALL_Z + PR && !g) { puck.z = WALL_Z + PR; puck.vz = Math.abs(puck.vz) * E; }
      for (const gg of goals) for (const sgn of [-1, 1]) {            // rounded posts at the slot edges
        const px = gg.x + sgn * GW / 2, dx = puck.x - px, dz = puck.z - WALL_Z, d = Math.hypot(dx, dz), R = PR + POST_R;
        if (d < R && d > 0) {
          const nx = dx / d, nz = dz / d; puck.x = px + nx * R; puck.z = WALL_Z + nz * R;
          const vn = puck.vx * nx + puck.vz * nz; if (vn < 0) { puck.vx -= (1 + E) * vn * nx; puck.vz -= (1 + E) * vn * nz; }
        }
      }
      if (g && puck.z < WALL_Z - PR * 0.6) { score(g, active); break; }
      // mallet
      {
        const dx = puck.x - mx, dz = puck.z - mz, d = Math.hypot(dx, dz), R = PR + MR;
        if (d < R && d > 0) {
          const nx = dx / d, nz = dz / d; puck.x = mx + nx * R; puck.z = mz + nz * R;
          const vn = (puck.vx - mal.vx) * nx + (puck.vz - mal.vz) * nz;
          if (vn < 0) { puck.vx -= (1 + E) * vn * nx; puck.vz -= (1 + E) * vn * nz; }
        }
      }
      // goalie (capsule along x)
      {
        const cx = kit.clamp(puck.x, goalie.x - GOALIE_HALF, goalie.x + GOALIE_HALF);
        const dx = puck.x - cx, dz = puck.z - GOALIE_Z, d = Math.hypot(dx, dz), R = PR + GOALIE_R;
        if (d < R && d > 0) {
          const nx = dx / d, nz = dz / d; puck.x = cx + nx * R; puck.z = GOALIE_Z + nz * R;
          const vn = (puck.vx - goalie.vx) * nx + puck.vz * nz;
          if (vn < 0) { puck.vx -= (1 + E) * vn * nx; puck.vz -= (1 + E) * vn * nz; }
        }
      }
      const sp = Math.hypot(puck.vx, puck.vz); if (sp > VMAX) { puck.vx *= VMAX / sp; puck.vz *= VMAX / sp; }
    }
    const fr = Math.pow(0.72, dt); puck.vx *= fr; puck.vz *= fr;
    // a puck that dies on the far half (out of reach) drifts back on the air cushion
    if (puck.z < MR && Math.hypot(puck.vx, puck.vz) < 0.12) { stall += dt; if (stall > 1.2) puck.vz += 0.5 * dt; } else stall = 0;
  }

  function update(dt, t, s) {
    if (!s.active && !(s.near > 0)) return;
    dt = Math.min(Math.max(dt, 1e-4), 1 / 30);
    const active = !!s.active;
    physics(dt, t, active);

    if (scored) {
      scored.t += dt;
      const g = scored.g, u = scored.t, fade = Math.max(0, 1 - u / 1.1);
      // the puck slips through the slot and drops into the pocket
      const a = Math.min(1, u / 0.22);
      puck.x = kit.damp(puck.x, g.x, 14, dt); puck.z = Math.min(puck.z, WALL_Z - PR * 0.6) - dt * 0.5 * (1 - a);
      puckG.position.set(puck.x, SY - a * a * 0.045, Math.max(puck.z, WALL_Z - RAIL_T - 0.06));
      puckG.visible = u < 0.5;
      g.strip.scale.set(1, 1, 1 + 2.5 * fade);
      g.frame.visible = reduced ? true : (Math.floor(u * 9) % 2 === 0);
      if (scored.real) { goalText.fillOpacity = Math.min(1, fade * 1.6); goalText.position.y = SY + 0.26 + (reduced ? 0 : (1 - fade) * 0.05); }
      if (u > 1.1) { clearScore(); relabel(); serve(); }
    }
    if (!scored) puckG.position.set(puck.x, SY, puck.z);
    malG.position.set(mal.x, SY, mal.z);
    goalieG.position.x = goalie.x;
  }

  /* ───────────── input ───────────── */
  const inv = new THREE.Matrix4(), lray = new THREE.Ray(), pt = new THREE.Vector3();
  function aimAt(ray) {
    group.updateWorldMatrix(true, false); inv.copy(group.matrixWorld).invert(); lray.copy(ray).applyMatrix4(inv);
    if (Math.abs(lray.direction.y) < 1e-5) return;
    const t = (SY + 0.02 - lray.origin.y) / lray.direction.y; if (t < 0) return;
    lray.at(t, pt); aim.x = pt.x; aim.z = pt.z;
  }

  relabel(); serve();
  puckG.position.set(puck.x, SY, puck.z); malG.position.set(mal.x, SY, mal.z);

  return {
    id: 'hockey', title: 'Air hockey', group,
    dock: { position: new THREE.Vector3(0, SY + 1.55, HL + 1.3), target: new THREE.Vector3(0, SY, -0.12) },
    hint: 'Move the mallet with your pointer (or arrow keys). Score in a slot to open that room.',
    controls: [{ act: 'puck', label: 'NEW PUCK', primary: true }],
    update,
    setActive(on) {
      isActive = !!on; for (const k in keys) keys[k] = false;
      if (on) { aim.x = mal.x; aim.z = mal.z; if (scored && !scored.real) { clearScore(); serve(); } }
    },
    press(act) { if (act === 'puck') { clearScore(); serve(); } },
    hold() {},
    key(k, down) {
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') { keys[k] = !!down; return true; }
      if (k === ' ' || k === 'Enter' || k === 'n' || k === 'N') { if (down) { clearScore(); serve(); } return true; }
      return false;
    },
    pointer(e) {
      if (e.type === 'down' || e.type === 'move') { aimAt(e.ray); return true; }
      return false;
    },
    dispose() {
      const geos = new Set();
      group.traverse(o => {
        if (o.geometry) geos.add(o.geometry);
        if (o.isMesh && typeof o.sync === 'function' && typeof o.dispose === 'function') o.dispose();   // troika text
        else if (o.isInstancedMesh) o.dispose();
      });
      geos.forEach(g => g.dispose());
      ownMats.forEach(m => m.dispose());
      group.clear();
    },
    // for scripted tests
    debug: () => ({ puck, mal, aim, goals, goalie, WALL_Z, GW, get scored() { return scored; }, get active() { return isActive; } })
  };
}
