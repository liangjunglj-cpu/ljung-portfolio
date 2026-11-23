// Site detail for the walk: street furniture, scale figures, orange accents and ground refinement.
// Everything is baked into three merged draws per station band (lit solids · flat/unlit · ink lines)
// plus one water plane, so the whole layer costs ~19 draws (+ a handful of shadow draws) at most.
//
//   createProps(ctx, opts) → { group, update(dt, t, s), colliders, dispose(), stats }
//   ctx  = { THREE, kit, renderer, camera, isMobile, reducedMotion }      s = { camera }
//   opts = { figures: true, labels: true }
//   colliders = [{ x, z, r }] circles (metres) for the free-walk mode.
import * as T from 'three';

const PAL = {
  paper: 0xffffff, shade: 0xe6e6e3, mid: 0xcfcfcb, ink: 0x111111, steel: 0xb9b9b5,
  orange: 0xff4d00, burnt: 0xc2410c, amber: 0xf59e0b, peach: 0xffb08a, water: 0xd6e0e4
};
const { paper: PAPER, shade: SHADE, ink: INK, orange: ORANGE, burnt: BURNT, amber: AMBER, peach: PEACH } = PAL;

export function createProps(ctx = {}, opts = {}) {
  const THREE = ctx.THREE || T;
  const isMobile = !!ctx.isMobile;
  const kit = ctx.kit || null;
  const withFigures = opts.figures !== false, withLabels = opts.labels !== false;

  const group = new THREE.Group(); group.name = 'props';
  const colliders = [];

  /* ───────────── seeded random ───────────── */
  let seed = 20261123;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a);

  /* ───────────── station bands (z0 near → z1 far) ───────────── */
  const ZB = [14, -10, -56, -92, -124, -149, -200];
  const zones = ZB.slice(0, -1).map((z0, i) => ({ z0, z1: ZB[i + 1], sp: [], sn: [], sc: [], fp: [], fc: [], fu: [], lp: [], lc: [], objs: [] }));
  const zoneAt = z => zones.find(q => z <= q.z0 && z > q.z1) || (z > ZB[0] ? zones[0] : zones[zones.length - 1]);

  /* ───────────── label atlas (one canvas for every sign) ───────────── */
  const AS = 1024, WU = 12 / AS, WV = 1 - 1012 / AS;
  const tiles = {};
  const TOTEMS = [
    { no: '01', name: 'LATEST', z: -9.4 }, { no: '02', name: 'FIELD', z: -56.6 }, { no: '03', name: 'ARCADE', z: -94.2 },
    { no: '04', name: 'INDEX', z: -124.6 }, { no: '05', name: 'CONTACT', z: -146.6 }
  ];
  TOTEMS.forEach((t, i) => { tiles['totem' + i] = [4 + i * 204, 4, 200, 560]; });
  tiles.kiosk = [4, 600, 640, 112];
  tiles.kioskSide = [4, 730, 320, 112];
  let canvas = null, atlas = null;
  function drawAtlas(mono, disp) {
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, AS, AS);
    const sp = (px) => { try { g.letterSpacing = px + 'px'; } catch (e) { /* older canvas */ } };
    TOTEMS.forEach((t, i) => {
      const [x, y, w, h] = tiles['totem' + i];
      g.fillStyle = '#fff'; g.fillRect(x, y, w, h);
      g.fillStyle = '#111'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      sp(-4); g.font = `700 132px ${disp}`; g.fillText(t.no, x + 18, y + 136);
      sp(5); g.font = `500 29px ${mono}`; g.fillText(t.name, x + 22, y + 192);
      g.fillStyle = '#ff4d00'; g.fillRect(x + 22, y + 214, w - 44, 5);
      // arrow: "ahead", drawn so it never depends on a glyph
      g.strokeStyle = '#111'; g.lineWidth = 7; g.lineCap = 'square'; g.lineJoin = 'miter';
      const ax = x + 22, ay = y + 282;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + 96, ay); g.moveTo(ax + 64, ay - 30); g.lineTo(ax + 96, ay); g.lineTo(ax + 64, ay + 30); g.stroke();
      const ch = Math.round(8 - t.z);
      g.fillStyle = '#8a8a8a'; sp(2.5); g.font = `400 17px ${mono}`;
      g.fillText(`CH 0+${String(ch).padStart(3, '0')}`, x + 22, y + 356);
      g.fillText('LJ · WALK', x + 22, y + 382);
      g.fillStyle = '#111'; g.fillRect(x + 22, y + h - 40, 26, 26);
      g.fillStyle = '#ff4d00'; g.fillRect(x + 54, y + h - 40, 26, 26);
    });
    { const [x, y, w, h] = tiles.kiosk;
      g.fillStyle = '#111'; g.fillRect(x, y, w, h);
      g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left'; sp(9); g.font = `500 44px ${mono}`;
      g.fillText('KOPI · TOKENS', x + 34, y + h / 2 + 3);
      g.fillStyle = '#ff4d00'; g.fillRect(x + w - 86, y + 34, 44, 44); }
    { const [x, y, w, h] = tiles.kioskSide;
      g.fillStyle = '#fff'; g.fillRect(x, y, w, h);
      g.fillStyle = '#111'; g.textBaseline = 'middle'; g.textAlign = 'left'; sp(6); g.font = `500 30px ${mono}`;
      g.fillText('OPEN LATE', x + 20, y + h / 2 - 16);
      g.fillStyle = '#8a8a8a'; sp(3); g.font = `400 19px ${mono}`; g.fillText('1 TOKEN = 1 ROOM', x + 20, y + h / 2 + 24); }
    sp(0);
    g.fillStyle = '#fff'; g.fillRect(0, 1000, 24, 24);
    if (atlas) atlas.needsUpdate = true;
  }
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas'); canvas.width = canvas.height = AS;
    drawAtlas('ui-monospace, Menlo, Consolas, monospace', '"Space Grotesk", Arial, sans-serif');
    atlas = new THREE.CanvasTexture(canvas);
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = ctx.renderer ? Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy()) : 4;
    if (kit && kit.FONTS && typeof FontFace !== 'undefined') {
      Promise.all([
        new FontFace('PropsMono', `url(${kit.FONTS.monoMed})`, { weight: '500' }).load(),
        new FontFace('PropsMono', `url(${kit.FONTS.mono})`, { weight: '400' }).load(),
        new FontFace('PropsDisp', `url(${kit.FONTS.disp})`, { weight: '700' }).load()
      ]).then(ff => { ff.forEach(f => document.fonts.add(f)); if (!disposed) drawAtlas('PropsMono, monospace', 'PropsDisp, sans-serif'); }).catch(() => {});
    }
  }
  const tileUV = k => { const [x, y, w, h] = tiles[k]; return [(x + 1) / AS, 1 - (y + h - 1) / AS, (x + w - 1) / AS, 1 - (y + 1) / AS]; };

  /* ───────────── builder ───────────── */
  const M = new THREE.Matrix4(), L = new THREE.Matrix4(), W = new THREE.Matrix4(), N3 = new THREE.Matrix3();
  const v = new THREE.Vector3(), v2 = new THREE.Vector3(), s2 = new THREE.Vector3(), q = new THREE.Quaternion(), eu = new THREE.Euler();
  const xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
  let Z = zones[0];
  const colCache = {};
  const col = hex => colCache[hex] || (colCache[hex] = new THREE.Color(hex));

  /** set the current object frame (world position, yaw, uniform scale, optional roll) */
  function place(x, z, ry = 0, s = 1, rz = 0, y = 0) {
    M.compose(v.set(x, y, z), q.setFromEuler(eu.set(0, ry, rz, 'YXZ')), s2.set(s, s, s)); Z = zoneAt(z);
  }
  function world(z) { M.identity(); Z = zoneAt(z); }
  /** local (lx, lz) of a frame at (x, z, ry) → world [x, z] */
  const toW = (x, z, ry, lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];

  const G = {}, EC = new Map();
  const geo = (key, make) => { if (!G[key]) { const g = make(); G[key] = g.index ? g.toNonIndexed() : g; if (g.index) g.dispose(); } return G[key]; };
  const gBox = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
  const gCyl = (n, ratio) => geo(`cyl${n}_${ratio.toFixed(3)}`, () => new THREE.CylinderGeometry(ratio, 1, 1, n));
  const gSph = d => geo('sph' + d, () => new THREE.IcosahedronGeometry(1, d));
  const gCone = n => geo('cone' + n, () => new THREE.ConeGeometry(1, 1, n));
  const gTorus = (tube, rs, ts) => { const k = `tor${tube}_${rs}_${ts}`; if (!G[k]) { const t = new THREE.TorusGeometry(1, tube, rs, ts); G[k] = t.toNonIndexed(); G[k].computeVertexNormals(); t.dispose(); } return G[k]; };
  function edgesOf(g, thr) {
    const k = thr | 0; let m = EC.get(g); if (!m) EC.set(g, m = {});
    if (!m[k]) { const e = new THREE.EdgesGeometry(g, thr); m[k] = e.attributes.position.array.slice(); e.dispose(); }
    return m[k];
  }
  function emit(g, local, hex, flat = false) {
    W.multiplyMatrices(M, local);
    const p = g.attributes.position, n = g.attributes.normal, c = col(hex);
    if (flat) {
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(W); Z.fp.push(v.x, v.y, v.z); Z.fc.push(c.r, c.g, c.b); Z.fu.push(WU, WV); }
      return;
    }
    N3.getNormalMatrix(W);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(W); Z.sp.push(v.x, v.y, v.z); Z.sc.push(c.r, c.g, c.b);
      v.fromBufferAttribute(n, i).applyMatrix3(N3).normalize(); Z.sn.push(v.x, v.y, v.z);
    }
  }
  function emitEdges(g, local, thr, hex, a) {
    W.multiplyMatrices(M, local);
    const e = edgesOf(g, thr), c = col(hex);
    for (let i = 0; i < e.length; i += 3) { v.set(e[i], e[i + 1], e[i + 2]).applyMatrix4(W); Z.lp.push(v.x, v.y, v.z); Z.lc.push(c.r, c.g, c.b, a); }
  }
  /** box centred at (x, y, z) in the current frame */
  function bx(w, h, d, x, y, z, hex = PAPER, { ry = 0, rx = 0, rz = 0, edges = true, ea = 0.9, ec = INK, flat = false } = {}) {
    L.compose(v2.set(x, y, z), q.setFromEuler(eu.set(rx, ry, rz, 'YXZ')), s2.set(w, h, d));
    emit(gBox(), L, hex, flat);
    if (edges && !flat) emitEdges(gBox(), L, 1, ec, ea);
  }
  /** upright cylinder centred at (x, y, z) */
  function cyl(rT, rB, h, x, y, z, hex = PAPER, { n = 10, edges = false, ea = 0.8, ec = INK, thr = 50, flat = false } = {}) {
    const g = gCyl(n, rT / rB);
    L.compose(v2.set(x, y, z), q.identity(), s2.set(rB, h, rB));
    emit(g, L, hex, flat);
    if (edges && !flat) emitEdges(g, L, thr, ec, ea);
  }
  /** tapered limb from a → b (arrays), radius r0 at a and r1 at b; sz squashes it front-to-back */
  function limb(a, b, r0, r1, hex = PAPER, { n = 6, sz = 1, edges = false, ea = 0.8, flat = false } = {}) {
    ya.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = ya.length(); if (len < 1e-5) return; ya.divideScalar(len);
    xa.set(1, 0, 0); if (Math.abs(ya.x) > 0.95) xa.set(0, 0, 1);
    xa.addScaledVector(ya, -xa.dot(ya)).normalize(); za.crossVectors(xa, ya);
    L.makeBasis(xa.multiplyScalar(r0), ya.multiplyScalar(len), za.multiplyScalar(r0 * sz));
    L.setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    const g = gCyl(n, r1 / r0);
    emit(g, L, hex, flat);
    if (edges) emitEdges(g, L, 50, INK, ea);
  }
  function sph(x, y, z, r, hex = PAPER, { d = 1, sy = 1, sx = 1, edges = false, ea = 0.3, rot = false } = {}) {
    if (rot) q.setFromEuler(eu.set(rnd() * 3, rnd() * 3, rnd() * 3)); else q.identity();
    L.compose(v2.set(x, y, z), q, s2.set(r * sx, r * sy, r));
    emit(gSph(d), L, hex);
    if (edges) emitEdges(gSph(d), L, 1, INK, ea);
  }
  /** ink line in the current frame */
  function ln(x1, y1, z1, x2, y2, z2, hex = INK, a = 0.85) {
    const c = col(hex);
    v.set(x1, y1, z1).applyMatrix4(M); Z.lp.push(v.x, v.y, v.z); Z.lc.push(c.r, c.g, c.b, a);
    v.set(x2, y2, z2).applyMatrix4(M); Z.lp.push(v.x, v.y, v.z); Z.lc.push(c.r, c.g, c.b, a);
  }
  function poly(pts, hex = INK, a = 0.85, closed = false) {
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const p = pts[i], r = pts[(i + 1) % pts.length]; ln(p[0], p[1], p[2], r[0], r[1], r[2], hex, a); }
  }
  /** circle of lines: axis 'x' → in the y-z plane, 'y' → flat, 'z' → in the x-y plane */
  function ring(cx, cy, cz, r, n, axis = 'y', hex = INK, a = 0.85, a0 = 0, a1 = Math.PI * 2) {
    for (let i = 0; i < n; i++) {
      const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n;
      const c0 = Math.cos(t0) * r, s0 = Math.sin(t0) * r, c1 = Math.cos(t1) * r, s1 = Math.sin(t1) * r;
      if (axis === 'x') ln(cx, cy + s0, cz + c0, cx, cy + s1, cz + c1, hex, a);
      else if (axis === 'z') ln(cx + c0, cy + s0, cz, cx + c1, cy + s1, cz, hex, a);
      else ln(cx + c0, cy, cz + s0, cx + c1, cy, cz + s1, hex, a);
    }
  }
  /** unlit quad (bl, br, tr, tl), optionally mapped to an atlas tile */
  function fq(p0, p1, p2, p3, hex = PAPER, uv = null) {
    const c = col(hex), u = uv || [WU, WV, WU, WV];
    const P = [p0, p1, p2, p0, p2, p3], U = [[u[0], u[1]], [u[2], u[1]], [u[2], u[3]], [u[0], u[1]], [u[2], u[3]], [u[0], u[3]]];
    for (let i = 0; i < 6; i++) { v.set(P[i][0], P[i][1], P[i][2]).applyMatrix4(M); Z.fp.push(v.x, v.y, v.z); Z.fc.push(c.r, c.g, c.b); Z.fu.push(U[i][0], U[i][1]); }
  }
  /** lit double-sided plate from 3–4 points */
  function plate(pts, hex) {
    const c = col(hex), tris = pts.length === 4 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 2]];
    const w = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(M));
    for (const t of tris) {
      const a = w[t[0]], b = w[t[1]], d = w[t[2]];
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
      for (const [seq, sg] of [[[a, b, d], 1], [[a, d, b], -1]]) for (const p of seq) { Z.sp.push(p.x, p.y, p.z); Z.sn.push(n.x * sg, n.y * sg, n.z * sg); Z.sc.push(c.r, c.g, c.b); }
    }
  }
  const GY = 0.011, FY = 0.008;
  const gl = (x1, z1, x2, z2, a = 0.16, hex = INK) => ln(x1, GY, z1, x2, GY, z2, hex, a);
  const gq = (x0, z0, x1, z1, hex = ORANGE, y = FY) => fq([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], hex);
  const grect = (x0, z0, x1, z1, a = 0.16, hex = INK) => { gl(x0, z0, x1, z0, a, hex); gl(x1, z0, x1, z1, a, hex); gl(x1, z1, x0, z1, a, hex); gl(x0, z1, x0, z0, a, hex); };
  /** 45° hatch clipped to a rectangle (zmin < zmax) */
  function hatch(x0, x1, zmin, zmax, step, a = 0.1, flip = false) {
    const w = x1 - x0;
    for (let c = zmin - w; c < zmax; c += step) {
      const zA = Math.max(c, zmin), zB = Math.min(c + w, zmax); if (zB - zA < 0.05) continue;
      const xA = x0 + (zA - c), xB = x0 + (zB - c);
      if (flip) gl(x1 - (xA - x0), zA, x1 - (xB - x0), zB, a); else gl(xA, zA, xB, zB, a);
    }
  }
  const addCol = (x, z, r) => colliders.push({ x: +x.toFixed(2), z: +z.toFixed(2), r });
  function colLine(x, z, ry, len, r) {
    const n = Math.max(1, Math.round(len / (r * 1.5)));
    for (let k = 0; k < n; k++) { const t = ((k + 0.5) / n - 0.5) * len; const [wx, wz] = toW(x, z, ry, t, 0); addCol(wx, wz, r); }
  }

  /* ───────────── furniture ───────────── */
  /** long timber-slat bench, seat faces local +z */
  function bench(x, z, ry, { len = 2.4, back = false } = {}) {
    place(x, z, ry);
    bx(len, 0.06, 0.46, 0, 0.43, 0);
    for (const dz of [-0.138, -0.046, 0.046, 0.138]) ln(-len / 2, 0.462, dz, len / 2, 0.462, dz, INK, 0.55);
    const legs = len > 2.7 ? [-len / 2 + 0.28, 0, len / 2 - 0.28] : [-len / 2 + 0.28, len / 2 - 0.28];
    for (const lx of legs) bx(0.045, 0.4, 0.38, lx, 0.2, 0, INK, { edges: false });
    if (back) {
      bx(len, 0.3, 0.035, 0, 0.8, -0.235, PAPER, { rx: -0.14 });
      for (const dy of [-0.07, 0.03]) ln(-len / 2, 0.8 + dy, -0.212 - dy * 0.14, len / 2, 0.8 + dy, -0.212 - dy * 0.14, INK, 0.5);
      for (const lx of legs) bx(0.045, 0.56, 0.04, lx, 0.68, -0.25, INK, { rx: -0.14, edges: false });
    }
    colLine(x, z, ry, len, 0.42);
  }
  /** low seat wall with a slatted timber top */
  function seatWall(x, z, ry, { len = 3, accent = false } = {}) {
    place(x, z, ry);
    bx(len, 0.42, 0.44, 0, 0.21, 0);
    bx(len - 0.5, 0.035, 0.36, 0, 0.438, 0, accent ? PEACH : PAPER, { ea: 0.7 });
    for (const dz of [-0.09, 0, 0.09]) ln(-len / 2 + 0.25, 0.458, dz, len / 2 - 0.25, 0.458, dz, INK, 0.45);
    colLine(x, z, ry, len, 0.42);
  }
  /** slim light pole; the arm points along local +x */
  function lamp(x, z, ry, { h = 3.15 } = {}) {
    place(x, z, ry);
    cyl(0.026, 0.04, h, 0, h / 2, 0, INK, { n: 8 });
    cyl(0.085, 0.095, 0.03, 0, 0.015, 0, INK, { n: 10 });
    bx(0.92, 0.03, 0.05, 0.44, h - 0.02, 0, INK, { edges: false });
    bx(0.56, 0.045, 0.15, 0.68, h - 0.06, 0, PAPER, { ea: 0.8 });
    bx(0.5, 0.012, 0.085, 0.68, h - 0.09, 0, ORANGE, { flat: true });       // glow strip under the head
    bx(0.014, 0.62, 0.022, 0.036, h - 0.75, 0, ORANGE, { flat: true });     // and a slim one on the pole
    addCol(x, z, 0.15);
  }
  function bollard(x, z, tip = ORANGE) {
    place(x, z);
    cyl(0.062, 0.07, 0.74, 0, 0.37, 0, PAPER, { n: 10, edges: true, ea: 0.65 });
    cyl(0.064, 0.064, 0.1, 0, 0.79, 0, tip, { n: 10 });
    addCol(x, z, 0.16);
  }
  function bin(x, z) {
    place(x, z);
    cyl(0.2, 0.165, 0.78, 0, 0.39, 0, PAPER, { n: 12, edges: true, ea: 0.75 });
    cyl(0.205, 0.205, 0.035, 0, 0.8, 0, INK, { n: 12 });
    cyl(0.12, 0.12, 0.012, 0, 0.822, 0, SHADE, { n: 12 });
    addCol(x, z, 0.3);
  }
  function fountain(x, z, ry) {
    place(x, z, ry);
    bx(0.26, 0.84, 0.26, 0, 0.42, 0);
    cyl(0.21, 0.13, 0.07, 0, 0.875, 0, PAPER, { n: 12, edges: true, ea: 0.75 });
    cyl(0.17, 0.17, 0.008, 0, 0.912, 0, PAL.water, { n: 12 });
    limb([0, 0.9, -0.14], [0, 1.02, -0.1], 0.012, 0.012, INK); limb([0, 1.02, -0.1], [0, 1.0, -0.02], 0.012, 0.01, INK);
    bx(0.05, 0.05, 0.012, 0, 0.62, 0.133, ORANGE, { flat: true });
    addCol(x, z, 0.3);
  }
  /** planter box with low shrubs; orange = planted in the accent family */
  function planter(x, z, ry, { len = 1.8, orange = true, round = false } = {}) {
    place(x, z, ry);
    const fam = orange ? [ORANGE, AMBER, BURNT, ORANGE, PEACH, ORANGE] : [PAPER, PAPER, SHADE];
    if (round) {
      cyl(0.5, 0.38, 0.52, 0, 0.26, 0, PAPER, { n: 14, edges: true, ea: 0.8 });
      cyl(0.46, 0.46, 0.012, 0, 0.5, 0, SHADE, { n: 14 });
      for (let i = 0; i < 5; i++) { const a = i * 1.7 + rnd(), r = rr(0.13, 0.2), d = i ? 0.22 : 0; sph(Math.cos(a) * d, 0.5 + r * 0.72, Math.sin(a) * d, r, fam[i % fam.length], { d: 0, sy: rr(0.85, 1.1), edges: true, ea: 0.28, rot: true }); }
      addCol(x, z, 0.55);
    } else {
      bx(len, 0.5, 0.56, 0, 0.25, 0);
      bx(len - 0.1, 0.012, 0.46, 0, 0.5, 0, SHADE, { edges: false });
      const n = Math.max(3, Math.round(len / 0.3));
      for (let i = 0; i < n; i++) {
        const lx = ((i + 0.5) / n - 0.5) * (len - 0.3) + rr(-0.05, 0.05), r = rr(0.12, 0.2);
        sph(lx, 0.5 + r * 0.6, rr(-0.1, 0.1), r, fam[(i + (seed & 3)) % fam.length], { d: 0, sy: rr(0.8, 1.15), edges: true, ea: 0.28, rot: true });
      }
      if (orange) for (let i = 0; i < Math.round(len / 0.4) + 1; i++) {             // grass tufts drawn in line
        const lx = rr(-len / 2 + 0.15, len / 2 - 0.15), lz = rr(-0.18, 0.18), hh = rr(0.35, 0.6);
        for (const k of [-1, 0, 1]) ln(lx, 0.5, lz, lx + k * 0.07 + rr(-0.02, 0.02), 0.5 + hh * (k ? 0.8 : 1), lz + rr(-0.05, 0.05), i % 2 ? BURNT : ORANGE, 0.8);
      }
      colLine(x, z, ry, len, 0.42);
    }
  }
  /** wayfinding totem; the sign faces local +z */
  function totem(x, z, ry, i) {
    place(x, z, ry);
    bx(0.36, 2.2, 0.09, 0, 1.1, 0);
    bx(0.36, 0.06, 0.09, 0, 2.23, 0, ORANGE, { edges: false });
    bx(0.5, 0.03, 0.2, 0, 0.015, 0, INK, { edges: false });
    if (withLabels && atlas) { const w = 0.3, h = 0.84, y0 = 1.3, zf = 0.0495; fq([-w / 2, y0, zf], [w / 2, y0, zf], [w / 2, y0 + h, zf], [-w / 2, y0 + h, zf], PAPER, tileUV('totem' + i)); }
    addCol(x, z, 0.26);
  }
  /** line-drawn bicycle (or solid tubes when tubes = true); the bike runs along local z */
  function bike(x, z, ry, { hex = INK, tubes = false, lean = 0 } = {}) {
    place(x, z, ry, 1, lean);
    const R = [0, 0.34, -0.52], B = [0, 0.3, -0.07], S = [0, 0.86, -0.2], H = [0, 0.86, 0.33], Hb = [0, 0.66, 0.39], F = [0, 0.34, 0.52];
    const bars = [[R, B], [B, S], [S, H], [B, Hb], [R, S], [Hb, F], [H, Hb], [H, [0, 0.98, 0.29]], [[-0.23, 0.98, 0.29], [0.23, 0.98, 0.29]], [S, [0, 0.93, -0.22]], [[0, 0.935, -0.34], [0, 0.935, -0.12]]];
    if (tubes) {
      for (const [a, b] of bars) limb(a, b, 0.016, 0.016, hex, { n: 5 });
      for (const hub of [R, F]) { L.compose(v2.set(hub[0], hub[1], hub[2]), q.setFromEuler(eu.set(0, Math.PI / 2, 0)), s2.set(0.33, 0.33, 0.33)); emit(gTorus(0.05, 5, 22), L, hex); }
      for (const hub of [R, F]) for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ln(0, hub[1], hub[2], 0, hub[1] + Math.sin(a) * 0.32, hub[2] + Math.cos(a) * 0.32, hex, 0.55); }
    } else {
      for (const [a, b] of bars) ln(a[0], a[1], a[2], b[0], b[1], b[2], hex, 0.95);
      for (const hub of [R, F]) {
        ring(0, hub[1], hub[2], 0.34, 20, 'x', hex, 0.95); ring(0, hub[1], hub[2], 0.31, 20, 'x', hex, 0.4);
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ln(0, hub[1], hub[2], 0, hub[1] + Math.sin(a) * 0.31, hub[2] + Math.cos(a) * 0.31, hex, 0.35); }
      }
    }
  }
  /** row of hoops along local x; bikes: [{ i, hex, tubes }] parked against hoop i */
  function bikeRack(x, z, ry, n = 4, bikes = []) {
    const gap = 0.78, x0 = -(n - 1) * gap / 2;
    place(x, z, ry);
    for (let i = 0; i < n; i++) {
      const hx = x0 + i * gap;
      limb([hx, 0, -0.3], [hx, 0.74, -0.3], 0.022, 0.022, INK); limb([hx, 0, 0.3], [hx, 0.74, 0.3], 0.022, 0.022, INK);
      limb([hx, 0.74, -0.3], [hx, 0.74, 0.3], 0.022, 0.022, INK);
    }
    ln(x0 - 0.3, GY, -0.42, x0 + (n - 1) * gap + 0.3, GY, -0.42, INK, 0.2); ln(x0 - 0.3, GY, 0.42, x0 + (n - 1) * gap + 0.3, GY, 0.42, INK, 0.2);
    colLine(x, z, ry, (n - 1) * gap + 0.5, 0.5);
    for (const b of bikes) {
      const [wx, wz] = toW(x, z, ry, x0 + b.i * gap + 0.13, b.dz || 0.05);
      bike(wx, wz, ry + (b.flip ? Math.PI : 0), { hex: b.hex || INK, tubes: !!b.tubes, lean: b.flip ? 0.1 : -0.1 });
    }
  }
  /** café table under a parasol */
  function cafeTable(x, z, hex, chairs = []) {
    place(x, z, rr(0, 0.6));
    cyl(0.2, 0.22, 0.02, 0, 0.01, 0, INK, { n: 12 });
    cyl(0.4, 0.4, 0.03, 0, 0.735, 0, PAPER, { n: 16, edges: true, ea: 0.8 });
    cyl(0.018, 0.022, 2.5, 0, 1.25, 0, INK, { n: 6 });
    L.compose(v2.set(0, 2.44, 0), q.identity(), s2.set(1.28, 0.34, 1.28)); emit(gCone(8), L, hex); emitEdges(gCone(8), L, 50, INK, 0.5);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8 * 0; ln(0, 2.61, 0, Math.sin(a) * 1.28, 2.27, Math.cos(a) * 1.28, INK, 0.32); }
    cyl(0.03, 0.03, 0.08, 0, 2.65, 0, INK, { n: 6 });
    addCol(x, z, 0.45);
    const out = [];
    for (const c of chairs) {
      const cx = x + Math.sin(c.a) * 0.78, cz = z + Math.cos(c.a) * 0.78, cry = c.a + Math.PI;   // chair faces the table
      chair(cx, cz, cry, c.hex || ORANGE); out.push({ x: cx, z: cz, ry: cry });
    }
    return out;
  }
  function chair(x, z, ry, hex = ORANGE) {
    place(x, z, ry);
    bx(0.4, 0.028, 0.38, 0, 0.45, 0, hex, { edges: false });
    bx(0.4, 0.3, 0.024, 0, 0.82, -0.215, hex, { rx: -0.13, edges: false });
    for (const sx of [-0.19, 0.19]) { ln(sx, 0, 0.2, sx, 0.97, -0.24, INK, 0.9); ln(sx, 0, -0.24, sx, 0.45, 0.17, INK, 0.9); }
    ln(-0.19, 0.2, 0.11, 0.19, 0.2, 0.11, INK, 0.6);
    addCol(x, z, 0.28);
  }
  /** queue posts with an orange belt drawn between them */
  function queue(pts) {
    pts.forEach((p, i) => {
      place(p[0], p[1]);
      cyl(0.14, 0.15, 0.02, 0, 0.01, 0, INK, { n: 10 }); cyl(0.02, 0.024, 0.94, 0, 0.47, 0, INK, { n: 6 }); cyl(0.034, 0.034, 0.05, 0, 0.955, 0, ORANGE, { n: 8 });
      addCol(p[0], p[1], 0.16);
      if (i) { world(p[1]); const o = pts[i - 1]; for (const y of [0.9, 0.87, 0.84]) ln(o[0], y, o[1], p[0], y, p[1], ORANGE, 1); }
    });
  }
  /** the small orange-roofed kiosk; the hatch faces local +z */
  function kiosk(x, z, ry) {
    place(x, z, ry);
    bx(2.4, 2.3, 2.0, 0, 1.15, 0);
    bx(3.1, 0.1, 3.0, 0, 2.47, 0.4, ORANGE, { ea: 0.55 });                 // roof slab, cantilevered over the counter
    bx(2.4, 0.07, 2.0, 0, 2.335, 0, INK, { edges: false });                // shadow gap
    bx(1.7, 0.86, 0.03, 0, 1.52, 1.0, INK, { edges: false });              // the open hatch
    bx(2.4, 0.3, 0.02, 0, 2.14, 1.0, INK, { edges: false });               // fascia
    bx(1.9, 0.05, 0.42, 0, 1.06, 1.12, ORANGE, { ea: 0.5 });               // counter
    bx(0.03, 0.9, 0.03, -0.92, 0.55, 1.28, INK, { edges: false }); bx(0.03, 0.9, 0.03, 0.92, 0.55, 1.28, INK, { edges: false });
    for (let k = 1; k < 6; k++) ln(-1.2 + k * 0.4, 0.02, 1.004, -1.2 + k * 0.4, 1.02, 1.004, INK, 0.28);   // boarded base
    if (withLabels && atlas) {
      fq([-1.2, 2.0, 1.012], [0.4, 2.0, 1.012], [0.4, 2.28, 1.012], [-1.2, 2.28, 1.012], PAPER, tileUV('kiosk'));
      const s = tileUV('kioskSide'); fq([1.206, 1.25, 0.8], [1.206, 1.25, -0.2], [1.206, 1.6, -0.2], [1.206, 1.6, 0.8], PAPER, s);
    }
    cyl(0.16, 0.16, 0.34, 0.55, 1.255, 1.12, PAPER, { n: 10, edges: true, ea: 0.7 });       // an urn on the counter
    bx(0.22, 0.3, 0.2, -0.5, 1.235, 1.14, PAPER, { ea: 0.7 });
    for (const [cx, cz] of [[-0.75, -0.55], [0.75, -0.55], [-0.75, 0.6], [0.75, 0.6]]) { const [wx, wz] = toW(x, z, ry, cx, cz); addCol(wx, wz, 0.95); }
  }
  /** Corten-like folded plate on a low plinth */
  function foldedPlate(x, z, ry) {
    place(x, z, ry);
    bx(3.0, 0.08, 1.5, 0, 0.04, 0);
    const y0 = 0.08;
    const A0 = [-1.2, y0, -0.3], A1 = [-1.05, 2.5, 0.05], B0 = [-0.35, y0, 0.45], B1 = [-0.5, 1.45, 0.5], C0 = [0.4, y0, -0.4], C1 = [0.55, 2.95, -0.1], D0 = [1.2, y0, 0.32], D1 = [1.08, 1.15, 0.36];
    plate([A0, B0, B1, A1], BURNT); plate([B0, C0, C1, B1], 0xd9480a); plate([C0, D0, D1, C1], BURNT);
    poly([A0, A1, B1, C1, D1, D0], INK, 0.55); poly([B0, B1], INK, 0.45); poly([C0, C1], INK, 0.45); poly([A0, B0, C0, D0], INK, 0.45);
    for (const lx of [-0.8, 0, 0.8]) { const [wx, wz] = toW(x, z, ry, lx, 0); addCol(wx, wz, 0.7); }
  }
  /** a square-section ring standing on edge (the plane of the ring contains local x and y) */
  function ringSculpture(x, z, ry, R = 1.2, hex = ORANGE, y = 0) {
    place(x, z, ry);
    L.compose(v2.set(0, y + R + 0.02, 0), q.identity(), s2.set(R, R, R * 1.25));
    emit(gTorus(0.085, 4, isMobile ? 32 : 48), L, hex);
    ring(0, y + R + 0.02, 0, R * 1.086, 48, 'z', INK, 0.45); ring(0, y + R + 0.02, 0.107 * R, R, 48, 'z', INK, 0.3); ring(0, y + R + 0.02, -0.107 * R, R, 48, 'z', INK, 0.3);
    addCol(x, z, 0.5);
  }

  /* ───────────── scale figures ───────────── */
  let figureCount = 0;
  /**
   * White model person; faces local +z. pose: stand | walk | sit.
   * ua / eb = [left, right] upper-arm swing and elbow bend (radians, forward positive).
   */
  function figure(x, z, ry, o = {}) {
    if (!withFigures) return;
    if (isMobile && !o.m) return;
    const { pose = 'stand', h = 1.7, seat = 0.45, coat = false, lean = 0, cam = false, inw = 0, ab = 0.08, tint = PAPER, flip = false } = o;
    let ua = o.ua, eb = o.eb;
    const s = h / 1.7; place(x, z, ry, s);
    const TH = 0.42, SH = 0.43, c = tint;
    let legs;
    if (pose === 'walk') { legs = [[0.38, 0.05], [-0.3, 0.5]]; ua = ua || [0.42, -0.36]; eb = eb || [0.3, 0.2]; }
    else if (pose === 'sit') { legs = [[1.5, 1.42], [1.5, 1.52]]; ua = ua || [0.3, 0.3]; eb = eb || [1.05, 1.0]; }
    else { legs = [[0.04, 0], [-0.03, 0]]; ua = ua || [0.05, 0.04]; eb = eb || [0.14, 0.12]; }
    if (flip) { legs = [legs[1], legs[0]]; ua = [ua[1], ua[0]]; eb = [eb[1], eb[0]]; }
    let hipY = pose === 'sit' ? seat / s + 0.085 : 1;
    const J = legs.map(([a, b], i) => {
      const sg = i ? 1 : -1, hx = sg * 0.086;
      const k = [hx, -TH * Math.cos(a), TH * Math.sin(a)], an = [hx, k[1] - SH * Math.cos(a - b), k[2] + SH * Math.sin(a - b)];
      return { hx, k, an };
    });
    if (pose !== 'sit') hipY = 0.06 - Math.min(J[0].an[1], J[1].an[1]);
    for (const j of J) {
      const hip = [j.hx, hipY, 0], k = [j.hx, hipY + j.k[1], j.k[2]], an = [j.hx, hipY + j.an[1], j.an[2]];
      limb(hip, k, 0.08, 0.06, c); limb(k, an, 0.058, 0.04, c);
      sph(k[0], k[1], k[2], 0.059, c, { d: 0 });
      bx(0.085, 0.05, 0.22, an[0], Math.max(0.025, an[1] - 0.035), an[2] + 0.055, c, { edges: false });
    }
    const Ct = [0, hipY + 0.52 * Math.cos(lean), 0.52 * Math.sin(lean)];
    limb([0, hipY - 0.07, 0], Ct, 0.158, 0.19, c, { n: 8, sz: 0.62 });
    if (coat && pose !== 'sit') limb([0, hipY - 0.4, 0], [0, hipY + 0.14, 0], 0.215, 0.158, c, { n: 8, sz: 0.66 });
    limb(Ct, [Ct[0], Ct[1] + 0.09, Ct[2] + 0.005], 0.05, 0.044, c);
    sph(0, Ct[1] + 0.165, Ct[2] + 0.012 + lean * 0.08, 0.098, c, { d: 1, sy: 1.14 });
    for (let i = 0; i < 2; i++) {
      const sg = i ? 1 : -1, u = ua[i], e = eb[i];
      const S = [sg * 0.2, Ct[1] - 0.045, Ct[2]];
      const E = [S[0] + sg * 0.28 * Math.sin(ab), S[1] - 0.28 * Math.cos(u), S[2] + 0.28 * Math.sin(u)];
      const Hd = [E[0] + sg * 0.26 * Math.sin(ab) * 0.3 - sg * inw, E[1] - 0.26 * Math.cos(u + e), E[2] + 0.26 * Math.sin(u + e)];
      sph(S[0], S[1], S[2], 0.062, c, { d: 1 });
      limb(S, E, 0.052, 0.042, c); limb(E, Hd, 0.04, 0.032, c); sph(Hd[0], Hd[1], Hd[2], 0.04, c, { d: 0 });
      if (cam && i === 1) bx(0.14, 0.09, 0.08, 0, Hd[1] + 0.02, Hd[2] + 0.03, INK, { edges: false });
    }
    figureCount++;
    if (pose !== 'sit') addCol(x, z, 0.28 * s);
  }

  /* ───────────── ground patterns ───────────── */
  /** station threshold: an orange inlay strip, two tactile bands, three paving joints */
  function threshold(z, half = 5) {
    world(z);
    gq(-half, z - 0.03, -0.5, z + 0.03); gq(0.5, z - 0.03, half, z + 0.03);
    for (const sg of [-1, 1]) {
      const x0 = sg > 0 ? 0.55 : -1.75, x1 = x0 + 1.2;
      gq(x0, z + 0.22, x1, z + 0.52, PEACH);
      for (let k = 0; k <= 12; k++) gl(x0 + k * 0.1, z + 0.22, x0 + k * 0.1, z + 0.52, 0.3);
      grect(x0, z + 0.22, x1, z + 0.52, 0.45);
    }
    for (const dz of [-0.6, 0.9, 1.5]) { gl(-half, z + dz, -0.5, z + dz, 0.13); gl(0.5, z + dz, half, z + dz, 0.13); }
  }
  /** soft kerb lines either side of the walk */
  function kerb(z0, z1, a = 0.2) {
    for (const zn of zones) {
      const a0 = Math.min(z0, zn.z0), a1 = Math.max(z1, zn.z1); if (a0 <= a1) continue;
      Z = zn; M.identity();
      for (const sx of [-1.5, 1.5]) ln(sx, GY, a0, sx, GY, a1, INK, a);
    }
  }

  /* ════════════════════════ 00 · entrance ════════════════════════ */
  {
    world(6); gq(-5.6, 5.97, -0.5, 6.03); gq(0.5, 5.97, 5.6, 6.03);
    for (const bxp of [-5.2, -4.0, -2.8, 3.9, 5.1]) bollard(bxp, 6.5);
    bench(4.9, 1.7, -Math.PI / 2, { len: 2.6 });
    lamp(4.95, 4.0, Math.PI);
    planter(4.9, -0.5, Math.PI / 2, { len: 1.5 });
    figure(-6.0, -0.9, 2.2, { pose: 'stand', cam: true, ua: [1.2, 1.2], eb: [1.3, 1.3], inw: 0.14, ab: 0.3, m: true });       // photographing the name
    figure(5.0, -2.3, Math.PI + 0.55, { pose: 'stand', coat: true, ua: [-0.25, -0.25], eb: [-0.2, -0.2], m: true });         // at the entrance print
    figure(-2.7, 3.6, Math.PI + 0.1, { pose: 'walk', h: 1.76 });
    figure(4.9, 2.1, -Math.PI / 2, { pose: 'sit', h: 1.66 });
    totem(2.25, -9.4, -0.12, 0);
  }

  /* ════════════════════════ 01 · latest — a viewing bay across the walk from every film ════════════════════════ */
  {
    threshold(-10.6);
    kerb(-11.6, -56.4);
    const stands = [[-1, -17], [1, -28], [-1, -39], [1, -50]];
    stands.forEach(([side, z], i) => {
      // paving mat under the stand
      place(side * 2.7, z, -side * 0.42);
      const mw = 2.55, md = 1.25;
      poly([[-mw, GY, -md], [mw, GY, -md], [mw, GY, md], [-mw, GY, md]], INK, 0.2, true);
      if (!isMobile) for (let k = -3; k <= 3; k++) ln(k * 0.64, GY, -md, k * 0.64, GY, md, INK, 0.1);
      // the bay opposite
      const bxs = -side * 4.65, face = side * Math.PI / 2;            // seat faces the stand
      world(z); grect(bxs - 0.75, z - 2.6, bxs + 0.75, z + 2.6, 0.16);
      hatch(Math.min(bxs - 0.75, bxs + 0.75), Math.max(bxs - 0.75, bxs + 0.75), z - 2.6, z + 2.6, isMobile ? 0.6 : 0.3, 0.07, side > 0);
      lamp(bxs + (-side) * 0.05, z - 2.25, side > 0 ? 0 : Math.PI);
      if (i === 0) { bench(bxs, z, face, { len: 2.6 }); bin(bxs, z + 2.1); figure(bxs, z - 0.5, face, { pose: 'sit', m: true }); }
      if (i === 1) { bench(bxs, z, face, { len: 2.6, back: true }); planter(bxs, z + 2.05, Math.PI / 2, { len: 1.3 }); figure(bxs, z + 0.45, face, { pose: 'sit', h: 1.64, coat: true, m: true }); figure(bxs, z - 0.25, face, { pose: 'sit', h: 1.76, ua: [0.3, 0.9], eb: [1.05, 0.5] }); }
      if (i === 2) { seatWall(bxs, z + 0.2, Math.PI / 2, { len: 2.8, accent: true }); planter(bxs, z + 2.15, 0, { round: true });
        figure(2.45, -37.3, -Math.PI / 2 - 0.25, { pose: 'stand', h: 1.74, ua: [0.05, 0.8], eb: [0.15, 0.55], m: true });      // a couple looking across at the film
        figure(2.85, -38.1, -Math.PI / 2 - 0.1, { pose: 'stand', h: 1.62, coat: true }); }
      if (i === 3) { bench(bxs, z - 0.1, face, { len: 2.0 }); bikeRack(bxs - 0.05, z + 2.55, 0, 3, isMobile ? [{ i: 1 }] : [{ i: 0 }, { i: 2, flip: true }]);
        figure(-2.95, -45.5, Math.PI - 0.5, { pose: 'stand', h: 1.72, ua: [0.05, 0.75], eb: [0.15, 0.3], ab: 0.3, m: true });   // one with a bike
        bike(-2.47, -45.82, Math.PI - 0.5, { hex: ORANGE, tubes: true, lean: -0.06 }); addCol(-2.47, -45.82, 0.5); }
    });
    figure(-2.15, -33.4, Math.PI - 0.05, { pose: 'walk', h: 1.75, coat: true, m: true });
  }

  /* ════════════════════════ 02 · field — prints stand in two gravel beds ════════════════════════ */
  {
    totem(2.25, -56.6, -0.12, 1);
    threshold(-57.8);
    kerb(-59, -91.2);
    world(-75);
    for (const sg of [-1, 1]) {
      const x0 = sg > 0 ? 1.75 : -5.25, x1 = x0 + 3.5;
      grect(x0, -89.4, x1, -61.0, 0.2);
      hatch(x0, x1, -89.4, -61.0, isMobile ? 0.9 : 0.45, 0.085, sg > 0);
    }
    for (const gz of [-68.8, -77.1, -85.4]) { world(gz); gq(-1.66, gz - 0.025, -0.5, gz + 0.025); gq(0.5, gz - 0.025, 1.66, gz + 0.025); gl(-5.25, gz, -1.7, gz, 0.2); gl(1.7, gz, 5.25, gz, 0.2); }
    lamp(-4.7, -59.4, 0); lamp(4.9, -89.95, Math.PI);
    figure(-1.72, -66.2, Math.PI / 2 + 0.25, { pose: 'stand', h: 1.74, coat: true, ua: [-0.25, -0.25], eb: [-0.2, -0.2], m: true });   // looking at a print
    figure(-1.8, -67.0, Math.PI / 2 + 0.1, { pose: 'stand', h: 1.12, ua: [0.05, 1.5], eb: [0.1, 0.2] });                           // a child pointing
    figure(1.85, -79.4, -Math.PI / 2 - 0.3, { pose: 'stand', h: 1.66, ua: [0.1, 0.1], eb: [1.5, 1.5], inw: 0.12, m: true });
    seatWall(-3.7, -90.9, 0, { len: 2.8 }); seatWall(3.7, -90.9, 0, { len: 2.8, accent: true });
  }

  /* ════════════════════════ 03 · arcade forecourt ════════════════════════ */
  {
    totem(-2.25, -94.2, 0.12, 2);
    fountain(4.5, -94.6, -Math.PI / 2); bin(-4.5, -94.6);
    kerb(-92.6, -97.6);
    world(-98);
    gq(-8.75, -98.03, -0.5, -97.97); gq(0.5, -98.03, 8.75, -97.97);
    for (const sg of [-1, 1]) { const x0 = sg > 0 ? 0.55 : -1.75; gq(x0, -97.7, x0 + 1.2, -97.4, PEACH); for (let k = 0; k <= 12; k++) gl(x0 + k * 0.1, -97.7, x0 + k * 0.1, -97.4, 0.3); grect(x0, -97.7, x0 + 1.2, -97.4, 0.45); }
    for (let k = -5; k <= 5; k++) gl(k * 1.75, -98.4, k * 1.75, -106.45, 0.13);
    for (let k = 0; k <= 5; k++) gl(-8.75, -98.4 - k * 1.61, 8.75, -98.4 - k * 1.61, 0.13);
    for (let k = 0; k < 5; k++) for (const sg of [-1, 1]) bollard(sg * (2.5 + k * 1.3), -97.55);
    lamp(-8.9, -98.9, 0); lamp(8.9, -98.9, Math.PI);

    // café terrace (left): three tables under orange parasols
    const A = cafeTable(-4.7, -100.5, ORANGE, [{ a: 0.5, hex: ORANGE }, { a: 2.7, hex: PEACH }, { a: 4.5, hex: ORANGE }]);
    const B = cafeTable(-7.0, -102.6, AMBER, isMobile ? [{ a: 1.2, hex: ORANGE }] : [{ a: 1.2, hex: ORANGE }, { a: 3.6, hex: PEACH }]);
    const C = cafeTable(-4.5, -104.0, BURNT, isMobile ? [{ a: 5.2, hex: PEACH }] : [{ a: 5.2, hex: PEACH }, { a: 2.3, hex: ORANGE }]);
    figure(A[0].x, A[0].z, A[0].ry, { pose: 'sit', h: 1.68, m: true });
    void B; void C;
    kiosk(-10.6, -103.3, 0.95);
    figure(-9.15, -102.3, 0.95 + Math.PI, { pose: 'stand', h: 1.7, ua: [0.05, 0.9], eb: [0.1, 0.6], m: true });     // ordering at the hatch

    // right: sculpture, a long bench, the queue, bikes
    foldedPlate(6.9, -101.2, 0.35);
    bench(7.4, -104.3, 0, { len: 3.0, back: true });
    figure(8.0, -104.28, 0, { pose: 'sit', h: 1.72, m: true });
    queue([[4.6, -106.15], [4.6, -104.9], [4.6, -103.65], [3.3, -103.65]]);
    figure(4.05, -105.35, Math.PI, { pose: 'stand', h: 1.76, coat: true, m: true });
    figure(4.0, -104.6, Math.PI - 0.2, { pose: 'stand', h: 1.18 });
    bikeRack(10.3, -101.6, Math.PI / 2, 4, isMobile ? [{ i: 1 }] : [{ i: 0 }, { i: 1, hex: ORANGE, flip: true }, { i: 3 }]);

    // planters down both sides of the slab
    planter(-8.75, -109.3, Math.PI / 2, { len: 2.6, orange: true }); planter(-8.75, -114.7, Math.PI / 2, { len: 2.6, orange: false });
    planter(8.75, -109.3, Math.PI / 2, { len: 2.6, orange: false }); planter(8.75, -114.7, Math.PI / 2, { len: 2.6, orange: true });
    seatWall(-5.2, -119.4, 0, { len: 3.4 });
    kerb(-119.6, -123.9);
  }

  /* ════════════════════════ 04 · archive — a reading room carpet in front of the cabinet ════════════════════════ */
  {
    totem(-2.25, -124.6, 0.12, 3);
    kerb(-124, -132.4);
    threshold(-127.8);
    world(-137);
    grect(-4.2, -140.9, 4.2, -132.6, 0.2);
    for (let zz = -133.4; zz > -140.8; zz -= 0.8) gl(-4.2, zz, 4.2, zz, 0.1);
    gq(-4.2, -132.63, -0.5, -132.57); gq(0.5, -132.63, 4.2, -132.57);
    seatWall(-5.0, -136.4, Math.PI / 2, { len: 3.2, accent: true }); seatWall(5.0, -136.4, Math.PI / 2, { len: 3.2 });
    lamp(-4.75, -140.7, 0); lamp(4.75, -140.7, Math.PI);
    planter(-5.0, -133.4, 0, { round: true }); bin(5.0, -133.6);
    figure(-3.85, -139.5, Math.PI + 0.2, { pose: 'stand', h: 1.74, ua: [0.05, 1.25], eb: [0.1, 0.4], m: true });    // reaching for a drawer
    figure(5.0, -136.0, -Math.PI / 2, { pose: 'sit', h: 1.68, seat: 0.46, coat: false, m: true });
    totem(-4.4, -146.6, 0.3, 4);
    kerb(-146.2, -148.9);
  }

  /* ════════════════════════ 05 · finale — a long basin on the museum side, crop marks round the sign-off ════════════════════════ */
  const pool = { x0: 1.95, x1: 5.05, z0: -160.6, z1: -150.4 };
  {
    kerb(-149, -161.2);
    threshold(-162.2);
    // basin
    const { x0, x1, z0, z1 } = pool, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cw = 0.22, ch = 0.14;
    place(cx, cz);
    bx(x1 - x0 + cw, ch, cw, 0, ch / 2, (z1 - z0) / 2); bx(x1 - x0 + cw, ch, cw, 0, ch / 2, -(z1 - z0) / 2);
    bx(cw, ch, z1 - z0 - cw, -(x1 - x0) / 2, ch / 2, 0); bx(cw, ch, z1 - z0 - cw, (x1 - x0) / 2, ch / 2, 0);
    for (const sx of [-0.85, 0, 0.85]) bx(0.62, 0.05, 0.62, sx, 0.1, 0.9, PAPER, { ea: 0.7 });             // stepping stones
    world(cz);
    const wy = 0.092;
    for (const [rx, rz, n] of [[cx - 0.5, z1 - 2.2, 3], [cx + 0.6, cz - 0.8, 2]]) for (let k = 1; k <= n; k++) ring(rx, wy, rz, 0.22 * k, 18, 'y', INK, 0.22 - k * 0.04);
    ringSculpture(cx, z0 + 1.7, 0.5, 1.2, ORANGE, 0.06);
    world(cz);
    for (let k = 0; k < 7; k++) { const zz = z0 + 2.2 + k * 0.3, w = 0.5 - k * 0.055; ln(cx + 0.35 + k * 0.12 - w, wy, zz, cx + 0.35 + k * 0.12 + w, wy, zz, PEACH, 0.8 - k * 0.08); }   // the ring, broken on the water
    for (let k = 0; k < 6; k++) addCol(cx, z0 + 0.9 + k * 1.7, 1.5);
    bench(-3.5, -155.5, Math.PI / 2, { len: 2.8 });
    lamp(-4.75, -152.6, 0);
    planter(-3.5, -158.2, Math.PI / 2, { len: 1.5 });
    figure(-3.5, -155.1, Math.PI / 2, { pose: 'sit', h: 1.7, m: true });
    // crop marks and a hairline frame round the sign-off
    world(-170);
    const fx = 9.8, fz0 = -177.5, fz1 = -163.5, tk = 0.9;
    grect(-fx, fz0, fx, fz1, 0.1);
    for (const sx of [-1, 1]) for (const zz of [fz0, fz1]) { const dz = zz === fz0 ? -1 : 1;
      gl(sx * fx, zz + dz * 0.25, sx * fx, zz + dz * (0.25 + tk), 1, ORANGE); gl(sx * (fx + 0.25), zz, sx * (fx + 0.25 + tk), zz, 1, ORANGE); }
    bench(-3.4, -179.3, 0, { len: 2.8 }); bench(3.4, -179.3, 0, { len: 2.8 });
    figure(-3.0, -179.28, 0, { pose: 'sit', h: 1.72, m: true });
    figure(-7.9, -164.4, 2.6, { pose: 'stand', h: 1.74, coat: true, m: true });
    figure(8.5, -170.0, -0.5, { pose: 'stand', h: 1.7, ua: [-0.25, -0.25], eb: [-0.2, -0.2] });                 // at the last print
    bollard(-10.4, -175.5); bollard(10.4, -175.5);
  }

  /* ───────────── bake ───────────── */
  const solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const flatMat = new THREE.MeshBasicMaterial({ vertexColors: true, map: atlas, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true });
  const waterMat = new THREE.MeshStandardMaterial({ color: PAL.water, roughness: 0.18, metalness: 0 });
  const stats = { draws: 0, shadowCasters: 0, triangles: 0, lineSegments: 0, figures: figureCount };
  const noRay = o => { o.raycast = () => {}; return o; };
  const f32 = (arr, n) => new THREE.BufferAttribute(new Float32Array(arr), n);
  zones.forEach((zn, i) => {
    if (zn.sp.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', f32(zn.sp, 3)); g.setAttribute('normal', f32(zn.sn, 3)); g.setAttribute('color', f32(zn.sc, 3));
      const m = noRay(new THREE.Mesh(g, solidMat)); m.castShadow = true; m.receiveShadow = true; m.name = `props-solid-${i}`;
      group.add(m); zn.objs.push(m); stats.draws++; stats.shadowCasters++; stats.triangles += zn.sp.length / 9;
    }
    if (zn.fp.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', f32(zn.fp, 3)); g.setAttribute('color', f32(zn.fc, 3)); g.setAttribute('uv', f32(zn.fu, 2));
      const m = noRay(new THREE.Mesh(g, flatMat)); m.name = `props-flat-${i}`;
      group.add(m); zn.objs.push(m); stats.draws++; stats.triangles += zn.fp.length / 9;
    }
    if (zn.lp.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', f32(zn.lp, 3)); g.setAttribute('color', f32(zn.lc, 4));
      const m = noRay(new THREE.LineSegments(g, lineMat)); m.name = `props-lines-${i}`;
      group.add(m); zn.objs.push(m); stats.draws++; stats.lineSegments += zn.lp.length / 6;
    }
    zn.sp = zn.sn = zn.sc = zn.fp = zn.fc = zn.fu = zn.lp = zn.lc = null;
  });
  { const w = pool.x1 - pool.x0 - 0.2, d = pool.z1 - pool.z0 - 0.2;
    const water = noRay(new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat));
    water.rotation.x = -Math.PI / 2; water.position.set((pool.x0 + pool.x1) / 2, 0.085, (pool.z0 + pool.z1) / 2); water.receiveShadow = true; water.name = 'props-water';
    group.add(water); zones[5].objs.push(water); stats.draws++; }
  for (const k in G) G[k].dispose();
  stats.triangles = Math.round(stats.triangles); stats.colliders = colliders.length;

  /* ───────────── per frame: hide the bands that are deep in the fog ───────────── */
  let scene = null, disposed = false;
  function update(dt, t, s = {}) {
    const cam = (s && s.camera) || ctx.camera; if (!cam) return;
    if (!scene) { let p = group.parent; while (p && p.parent) p = p.parent; scene = p || null; }
    const far = scene && scene.fog && scene.fog.far ? scene.fog.far : 85;
    const cz = cam.position.z, aerial = cam.position.y > 9;
    for (const zn of zones) {
      const d = cz > zn.z0 ? cz - zn.z0 : cz < zn.z1 ? zn.z1 - cz : 0;
      const vis = aerial || d < far - 6;
      if (zn.vis !== vis) { zn.vis = vis; for (const o of zn.objs) o.visible = vis; }
    }
  }
  function dispose() {
    disposed = true;
    group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    solidMat.dispose(); flatMat.dispose(); lineMat.dispose(); waterMat.dispose(); if (atlas) atlas.dispose();
    if (group.parent) group.parent.remove(group);
  }

  return { group, update, colliders, dispose, stats, pool };
}
