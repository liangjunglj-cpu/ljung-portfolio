// The background city: a white architectural study model either side of the walkway.
// Detailed typologies + space frames + nine easter-egg models of the author's own projects.
// Everything is merged per chunk (z-band × side): one massing mesh + one ink-line set always on,
// one detail mesh + one detail-line set switched by camera distance.
import * as THREE from 'three';

/* ───────────────────────── palette (vertex colours, linear) ───────────────────────── */
const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const PAPER = lin(0xffffff), GLASS = lin(0xdce0e3), SHADE = lin(0xe4e4e1), INK = lin(0x1c1c1c), GREY = lin(0xbfc3c6);

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ───────────────────────── templates ───────────────────────── */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL24 = new THREE.CylinderGeometry(1, 1, 1, 24);
const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8);
const OCTA = new THREE.OctahedronGeometry(1, 0);
const HEX = new THREE.CircleGeometry(1, 6);
const BOX_E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
const NX = [1, 0, 0], NXn = [-1, 0, 0], NY = [0, 1, 0], NYn = [0, -1, 0], NZ = [0, 0, 1], NZn = [0, 0, -1];
const edgeCache = new Map();
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4(), _m3 = new THREE.Matrix3(),
  _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

/* ───────────────────────── geometry builder ───────────────────────── */
const mkLayer = () => ({ pos: [], nor: [], col: [], idx: [], lines: [] });
class Builder {
  constructor() { this.mass = mkLayer(); this.det = mkLayer(); this.frame(0, 0, 0, 0); }
  /** local frame: rotate about Y then translate. Local +X = "front". */
  frame(x, y, z, ry = 0) { this.c = Math.cos(ry); this.s = Math.sin(ry); this.tx = x; this.ty = y; this.tz = z; return this; }
  _w(p) { return [this.c * p[0] + this.s * p[2] + this.tx, p[1] + this.ty, -this.s * p[0] + this.c * p[2] + this.tz]; }
  line(ax, ay, az, bx, by, bz, det = false) {
    const a = (det ? this.det : this.mass).lines, c = this.c, s = this.s;
    a.push(c * ax + s * az + this.tx, ay + this.ty, -s * ax + c * az + this.tz, c * bx + s * bz + this.tx, by + this.ty, -s * bx + c * bz + this.tz);
  }
  poly(pts, closed = false, det = false) {
    for (let i = 0; i < pts.length - 1; i++) this.line(...pts[i], ...pts[i + 1], det);
    if (closed) this.line(...pts[pts.length - 1], ...pts[0], det);
  }
  _face(W, col, det, n) {
    const L = det ? this.det : this.mass, P = L.pos, base = P.length / 3, A = W[0], B = W[1], D = W[W.length - 1];
    let nx = (B[1] - A[1]) * (D[2] - A[2]) - (B[2] - A[2]) * (D[1] - A[1]);
    let ny = (B[2] - A[2]) * (D[0] - A[0]) - (B[0] - A[0]) * (D[2] - A[2]);
    let nz = (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (n) {
      const hx = this.c * n[0] + this.s * n[2], hz = -this.s * n[0] + this.c * n[2];
      if (nx * hx + ny * n[1] + nz * hz < 0) { W.reverse(); nx = -nx; ny = -ny; nz = -nz; }
    }
    for (const w of W) { P.push(w[0], w[1], w[2]); L.nor.push(nx, ny, nz); L.col.push(col[0], col[1], col[2]); }
    L.idx.push(base, base + 1, base + 2);
    if (W.length === 4) L.idx.push(base, base + 2, base + 3);
  }
  quad(a, b, c, d, col = PAPER, det = false, n = null) { this._face([this._w(a), this._w(b), this._w(c), this._w(d)], col, det, n); }
  tri(a, b, c, col = PAPER, det = false, n = null) { this._face([this._w(a), this._w(b), this._w(c)], col, det, n); }
  /** both faces of a sheet (sails, treads). */
  sheet(pts, col = PAPER, det = false) {
    const f = pts.length === 4 ? 'quad' : 'tri';
    this[f](...pts, col, det, null); this[f](...pts.slice().reverse(), col, det, null);
  }
  /** axis-aligned box in the local frame; (x,z) centre, y = underside. */
  box(x, y, z, w, h, d, col = PAPER, edges = true, det = false) {
    const x0 = x - w / 2, x1 = x + w / 2, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
    const P = [[x0, y, z0], [x1, y, z0], [x0, y1, z0], [x1, y1, z0], [x0, y, z1], [x1, y, z1], [x0, y1, z1], [x1, y1, z1]];
    this.quad(P[1], P[3], P[7], P[5], col, det, NX); this.quad(P[0], P[4], P[6], P[2], col, det, NXn);
    this.quad(P[2], P[6], P[7], P[3], col, det, NY); if (y + this.ty > 0.01) this.quad(P[0], P[1], P[5], P[4], col, det, NYn);
    this.quad(P[4], P[5], P[7], P[6], col, det, NZ); this.quad(P[0], P[2], P[3], P[1], col, det, NZn);
    if (edges) for (const e of BOX_E) this.line(...P[e[0]], ...P[e[1]], det);
  }
  /** any geometry through a local Matrix4. edgeThr = 0 → no edge lines. */
  geo(g, m, col = PAPER, edgeThr = 20, det = false) {
    const L = det ? this.det : this.mass, pos = g.attributes.position, nor = g.attributes.normal, base = L.pos.length / 3, c = this.c, s = this.s;
    _m3.getNormalMatrix(m);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(m); _n.fromBufferAttribute(nor, i).applyMatrix3(_m3).normalize();
      L.pos.push(c * _v.x + s * _v.z + this.tx, _v.y + this.ty, -s * _v.x + c * _v.z + this.tz);
      L.nor.push(c * _n.x + s * _n.z, _n.y, -s * _n.x + c * _n.z); L.col.push(col[0], col[1], col[2]);
    }
    if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i++) L.idx.push(base + ix[i]); }
    else for (let i = 0; i < pos.count; i++) L.idx.push(base + i);
    if (edgeThr) {
      const key = g.uuid + ':' + edgeThr;
      let e = edgeCache.get(key); if (!e) { e = new THREE.EdgesGeometry(g, edgeThr).attributes.position.array; edgeCache.set(key, e); }
      for (let i = 0; i < e.length; i += 3) { _v.set(e[i], e[i + 1], e[i + 2]).applyMatrix4(m); L.lines.push(c * _v.x + s * _v.z + this.tx, _v.y + this.ty, -s * _v.x + c * _v.z + this.tz); }
    }
  }
  /** a square (or round) stick between two local points. */
  beam(a, b, t, col = PAPER, edgeThr = 0, det = false, g = UNIT_BOX) {
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _v.length(); if (len < 1e-4) return;
    _q.setFromUnitVectors(_up, _v.divideScalar(len));
    _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(t, len, t));
    this.geo(g, _m, col, edgeThr, det);
  }
  cyl(x, y, z, r, h, col = PAPER, edgeThr = 30, det = false, g = CYL24) {
    _m.compose(_p.set(x, y + h / 2, z), _q.identity(), _s.set(r, h, r)); this.geo(g, _m, col, edgeThr, det);
  }
  node(x, y, z, r = 0.14, det = true) { _m.compose(_p.set(x, y, z), _q.identity(), _s.set(r, r, r)); this.geo(OCTA, _m, INK, 0, det); }
  circle(x, y, z, r, seg = 28, det = false) {
    for (let i = 0; i < seg; i++) { const a = i / seg * 6.2832, b = (i + 1) / seg * 6.2832; this.line(x + Math.cos(a) * r, y, z + Math.sin(a) * r, x + Math.cos(b) * r, y, z + Math.sin(b) * r, det); }
  }
  static mesh(L, material) {
    if (!L.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(L.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(L.col, 3));
    g.setIndex(L.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(L.idx, 1) : new THREE.Uint16BufferAttribute(L.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    const m = new THREE.Mesh(g, material); m.raycast = () => {}; m.matrixAutoUpdate = false;
    return m;
  }
  static lines(L, material) {
    if (!L.lines.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(L.lines, 3)); g.computeBoundingSphere();
    const l = new THREE.LineSegments(g, material); l.raycast = () => {}; l.matrixAutoUpdate = false;
    return l;
  }
}

/* ───────────────────────── facade helpers (V = {x,z,w,d,y,h}) ───────────────────────── */
// faces: 0 = +X (front, toward the walkway), 1 = −X, 2 = +Z, 3 = −Z
function FF(V, f) {
  const hw = V.w / 2, hd = V.d / 2;
  if (f === 0) return { len: V.d, n: NX, at: (u, o) => [V.x + hw + o, V.z - hd + u] };
  if (f === 1) return { len: V.d, n: NXn, at: (u, o) => [V.x - hw - o, V.z - hd + u] };
  if (f === 2) return { len: V.w, n: NZ, at: (u, o) => [V.x - hw + u, V.z + hd + o] };
  return { len: V.w, n: NZn, at: (u, o) => [V.x - hw + u, V.z - hd - o] };
}
const OFF = 0.045;
function gridFace(B, V, f, su, sv, det = true, vert = true, horiz = true, off = OFF) {
  const F = FF(V, f);
  if (vert) { const nu = Math.max(1, Math.round(F.len / su)); for (let i = 1; i < nu; i++) { const p = F.at(F.len * i / nu, off); B.line(p[0], V.y, p[1], p[0], V.y + V.h, p[1], det); } }
  if (horiz) { const nv = Math.max(1, Math.round(V.h / sv)), a = F.at(0, off), b = F.at(F.len, off); for (let j = 1; j < nv; j++) { const y = V.y + V.h * j / nv; B.line(a[0], y, a[1], b[0], y, b[1], det); } }
}
function panel(B, V, f, u0, u1, ya, yb, col = GLASS, det = true, outline = true, off = OFF) {
  const F = FF(V, f), a = F.at(u0, off), b = F.at(u1, off);
  B.quad([a[0], ya, a[1]], [b[0], ya, b[1]], [b[0], yb, b[1]], [a[0], yb, a[1]], col, det, F.n);
  if (outline) { const o = off + 0.01, c = F.at(u0, o), e = F.at(u1, o); B.poly([[c[0], ya, c[1]], [e[0], ya, e[1]], [e[0], yb, e[1]], [c[0], yb, c[1]]], true, det); }
}
function faceBox(B, V, f, u, y, lu, h, depth, col = PAPER, edges = false, det = true, off = 0) {
  const c = FF(V, f).at(u, off + depth / 2);
  if (f < 2) B.box(c[0], y, c[1], depth, h, lu, col, edges, det); else B.box(c[0], y, c[1], lu, h, depth, col, edges, det);
}
function diagHatch(B, V, f, sp, det = true, off = OFF) {
  const F = FF(V, f), L = F.len, H = V.h;
  for (let c = -H + sp / 2; c < L; c += sp) {
    const u0 = Math.max(c, 0), u1 = Math.min(c + H, L); if (u1 - u0 < 0.05) continue;
    const a = F.at(u0, off), b = F.at(u1, off);
    B.line(a[0], V.y + (u0 - c), a[1], b[0], V.y + (u1 - c), b[1], det);
    B.line(a[0], V.y + H - (u0 - c), a[1], b[0], V.y + H - (u1 - c), b[1], det);
  }
}
function wire(B, V, det = false) {
  const x0 = V.x - V.w / 2, x1 = V.x + V.w / 2, z0 = V.z - V.d / 2, z1 = V.z + V.d / 2, y0 = V.y, y1 = V.y + V.h;
  const P = [[x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0], [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1]];
  for (const e of BOX_E) B.line(...P[e[0]], ...P[e[1]], det);
}

/** square-on-square offset space frame: top grid, bottom grid half a module in, diagonals, node spheres. */
function spaceFrame(B, x, z, y, w, d, mod, depth, nodes = true) {
  const nx = Math.max(2, Math.round(w / mod)), nz = Math.max(2, Math.round(d / mod)), mx = w / nx, mz = d / nz, x0 = x - w / 2, z0 = z - d / 2, yt = y + depth;
  for (let i = 0; i <= nx; i++) B.line(x0 + i * mx, yt, z0, x0 + i * mx, yt, z0 + d);
  for (let j = 0; j <= nz; j++) B.line(x0, yt, z0 + j * mz, x0 + w, yt, z0 + j * mz);
  for (let i = 0; i < nx; i++) B.line(x0 + (i + .5) * mx, y, z0 + .5 * mz, x0 + (i + .5) * mx, y, z0 + d - .5 * mz);
  for (let j = 0; j < nz; j++) B.line(x0 + .5 * mx, y, z0 + (j + .5) * mz, x0 + w - .5 * mx, y, z0 + (j + .5) * mz);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const bx = x0 + (i + .5) * mx, bz = z0 + (j + .5) * mz;
    B.line(bx, y, bz, x0 + i * mx, yt, z0 + j * mz); B.line(bx, y, bz, x0 + (i + 1) * mx, yt, z0 + j * mz);
    B.line(bx, y, bz, x0 + i * mx, yt, z0 + (j + 1) * mz); B.line(bx, y, bz, x0 + (i + 1) * mx, yt, z0 + (j + 1) * mz);
    if (nodes) B.node(bx, y, bz);
  }
  if (nodes) for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) B.node(x0 + i * mx, yt, z0 + j * mz);
}
function pergola(B, x, z, y, w, d, h, det = false) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, n = Math.max(1, Math.round(d / 3));
  for (let i = 0; i <= n; i++) { const zz = z0 + d * i / n; B.box(x0, y, zz, .14, h, .14, PAPER, false, det); B.box(x1, y, zz, .14, h, .14, PAPER, false, det); B.line(x0, y, zz, x0, y + h, zz, det); B.line(x1, y, zz, x1, y + h, zz, det); }
  B.box(x0, y + h, z, .16, .22, d + .6, PAPER, true, det); B.box(x1, y + h, z, .16, .22, d + .6, PAPER, true, det);
  const m = Math.max(2, Math.round(d / .7));
  for (let i = 0; i <= m; i++) { const zz = z0 + d * i / m; B.line(x0 - .4, y + h + .26, zz, x1 + .4, y + h + .26, zz, det); }
}

function roofKit(B, V, r, tall = false) {
  const y = V.y + V.h, w = V.w, d = V.d, t = .25, ph = .7;
  B.box(V.x, y, V.z + d / 2 - t / 2, w, ph, t); B.box(V.x, y, V.z - d / 2 + t / 2, w, ph, t);
  B.box(V.x + w / 2 - t / 2, y, V.z, t, ph, d - 2 * t); B.box(V.x - w / 2 + t / 2, y, V.z, t, ph, d - 2 * t);
  if (w < 5 || d < 5) return;
  const iw = w - 2.4, id = d - 2.4;
  // plant + stair core
  const pw = Math.min(iw * .45, 2 + r() * 3), pd = Math.min(id * .45, 2 + r() * 4), px = V.x + (r() - .5) * (iw - pw), pz = V.z + (r() - .5) * (id - pd), pH = 1.4 + r() * 1.6;
  B.box(px, y, pz, pw, pH, pd);
  for (let i = 1; i < 4; i++) B.line(px - pw / 2 - .03, y + pH * i / 4, pz - pd / 2 - .03, px + pw / 2 + .03, y + pH * i / 4, pz - pd / 2 - .03, true);
  if (r() < .6) B.box(V.x - (px - V.x) * .8, y, V.z - (pz - V.z) * .8, 1.6, 2.4, 2.2);
  const k = r();
  if (k < .28) {           // skylight
    const sw = iw * .4, sd = id * .35, sx = V.x - (px - V.x) * .5, sz = V.z - (pz - V.z) * .4;
    B.box(sx, y, sz, sw, .35, sd, GLASS, true, true);
    for (let i = 1; i < 5; i++) B.line(sx - sw / 2 + sw * i / 5, y + .38, sz - sd / 2, sx - sw / 2 + sw * i / 5, y + .38, sz + sd / 2, true);
  } else if (k < .55) {    // solar rows
    for (let zz = V.z - id / 2 + .6; zz < V.z + id / 2 - .4; zz += 1.5) { if (Math.abs(zz - pz) < pd / 2 + .8) continue; B.quad([V.x - iw / 2, y + .25, zz], [V.x + iw / 2, y + .25, zz], [V.x + iw / 2, y + .8, zz + .9], [V.x - iw / 2, y + .8, zz + .9], GREY, true, NY); B.line(V.x - iw / 2, y + .8, zz + .9, V.x + iw / 2, y + .8, zz + .9, true); }
  } else if (k < .72) {    // roof garden pergola
    pergola(B, V.x - (px - V.x) * .6, V.z - (pz - V.z) * .5, y, Math.min(4, iw * .4), Math.min(7, id * .5), 2.5, true);
  } else {                 // vents
    for (let i = 0; i < 5; i++) B.box(V.x + (r() - .5) * iw * .8, y, V.z + (r() - .5) * id * .8, .8, .6, .8, PAPER, true, true);
  }
  if (tall && r() < .6) { const ax = px, az = pz, ah = 5 + r() * 7; B.line(ax, y + pH, az, ax, y + pH + ah, az); B.line(ax - .6, y + pH + ah * .6, az, ax + .6, y + pH + ah * .6, az); }
}

/* ───────────────────────── typologies ───────────────────────── */
const T = {};
T.curtain = (B, V, r) => {
  const fh = 3.6 + r() * .4, bay = 1.2 + Math.floor(r() * 3) * .3, k = r();
  B.box(V.x, V.y, V.z, V.w, V.h, V.d, GLASS, true);
  for (let f = 0; f < 4; f++) gridFace(B, V, f, bay, fh);
  if (k < .35) { B.box(V.x, V.y, V.z + V.d / 2 + .2, V.w + .5, V.h + .8, .4); B.box(V.x, V.y, V.z - V.d / 2 - .2, V.w + .5, V.h + .8, .4); }
  else if (k < .7) { const n = 4 + Math.floor(r() * 3); for (let y = V.y + n * fh; y < V.y + V.h - fh; y += n * fh) B.box(V.x, y, V.z, V.w + .4, .7, V.d + .4); }
  else for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(V.x + sx * V.w / 2, V.y, V.z + sz * V.d / 2, .8, V.h + .3, .8);
  B.box(V.x, V.y, V.z, V.w + .3, .5, V.d + .3);
  B.box(V.x, V.y + V.h, V.z, V.w + .3, .45, V.d + .3);
  roofKit(B, { ...V, h: V.h + .45 }, r, true);
};
T.bands = (B, V, r) => {
  const n = Math.max(2, Math.round(V.h / 3.7)), inset = .5 + r() * .5, stag = r() < .35, Vi = { ...V, w: V.w - 2 * inset, d: V.d - 2 * inset };
  B.box(Vi.x, Vi.y, Vi.z, Vi.w, Vi.h, Vi.d, GLASS, false);
  for (let i = 1; i <= n; i++) { const y = V.y + i * V.h / n - .42, sh = stag && i < n ? (i % 2 ? .35 : -.35) : 0; B.box(V.x + sh, y, V.z + sh, V.w, .42, V.d); }
  for (let f = 0; f < 4; f++) gridFace(B, Vi, f, 1.5, 99, true, true, false);
  if (r() < .5) B.box(V.x - V.w / 2 + 1.4, V.y, V.z + (r() - .5) * (V.d - 5), 2.8, V.h + 1.2, 4);       // expressed core
  roofKit(B, V, r, V.h > 24);
};
T.fins = (B, V, r) => {
  const g = Math.min(4.2, V.h * .3), step = .9 + r() * .9, depth = .5 + r() * .4, wave = r() < .5, fh = 3.7;
  const Vg = { ...V, w: V.w - .9, d: V.d - .9 };
  B.box(Vg.x, Vg.y, Vg.z, Vg.w, Vg.h, Vg.d, GLASS, true);
  B.box(V.x, V.y + g, V.z, V.w, .45, V.d); B.box(V.x, V.y + V.h, V.z, V.w, .5, V.d);
  for (let f = 0; f < 4; f++) {
    gridFace(B, Vg, f, 99, fh, true, false, true);
    const F = FF(Vg, f), n = Math.max(2, Math.round(F.len / step));
    for (let i = 0; i <= n; i++) {
      const u = F.len * i / n, dd = wave ? depth * (.4 + .6 * Math.abs(Math.sin(i * .42 + f * 1.3))) : depth;
      faceBox(B, Vg, f, u, V.y + g + .45, .12, V.h - g - .45, dd);
      const p = F.at(u, dd + .01); B.line(p[0], V.y + g + .45, p[1], p[0], V.y + V.h, p[1], true);
    }
  }
  roofKit(B, { ...V, h: V.h + .5 }, r, true);
};
T.balcony = (B, V, r) => {
  const fh = 3.2, n = Math.max(2, Math.floor(V.h / fh)), mode = Math.floor(r() * 3);
  B.box(V.x, V.y, V.z, V.w, V.h, V.d);
  for (const f of [0, 1]) {
    const F = FF(V, f), nb = Math.max(2, Math.round(F.len / (3.2 + r()))), bw = F.len / nb;
    for (let i = 0; i < n; i++) for (let j = 0; j < nb; j++) {
      const y = V.y + i * fh, u0 = j * bw;
      panel(B, V, f, u0 + .4, u0 + bw - .4, y + (i ? .25 : .1), y + 2.6);
      const has = i > 0 && (mode === 0 ? (i + j) % 2 === 0 : mode === 1 ? true : j % 2 === 0);
      if (has) {
        const dep = 1.1; faceBox(B, V, f, u0 + bw / 2, y - .05, bw - .5, .18, dep, PAPER, true, true);
        const a = F.at(u0 + .25, dep), b = F.at(u0 + bw - .25, dep), a0 = F.at(u0 + .25, 0), b0 = F.at(u0 + bw - .25, 0);
        B.poly([[a0[0], y + 1.15, a0[1]], [a[0], y + 1.15, a[1]], [b[0], y + 1.15, b[1]], [b0[0], y + 1.15, b0[1]]], false, true);
        B.line(a[0], y + .13, a[1], a[0], y + 1.15, a[1], true); B.line(b[0], y + .13, b[1], b[0], y + 1.15, b[1], true);
      }
    }
  }
  for (const f of [2, 3]) { const F = FF(V, f), nb = Math.max(1, Math.round(F.len / 4)); for (let i = 0; i < n; i++) for (let j = 0; j < nb; j++) { const u = (j + .5) * F.len / nb; panel(B, V, f, u - .5, u + .5, V.y + i * fh + .8, V.y + i * fh + 2.5); } }
  roofKit(B, V, r);
};
T.punched = (B, V, r) => {
  const fh = 3.6, n = Math.max(2, Math.floor(V.h / fh)), style = Math.floor(r() * 3);
  B.box(V.x, V.y, V.z, V.w, V.h, V.d);
  for (let f = 0; f < 4; f++) {
    const F = FF(V, f), nb = Math.max(2, Math.round(F.len / (style === 1 ? 1.7 : 3.1))), bw = F.len / nb;
    for (let i = 0; i < n; i++) for (let j = 0; j < nb; j++) {
      const y = V.y + i * fh, u = (j + .5) * bw;
      if (i === 0 && f === 0) { panel(B, V, f, u - bw * .42, u + bw * .42, y + .1, y + 3); continue; }
      if (r() > .93) continue;
      if (style === 0) panel(B, V, f, u - .75, u + .75, y + 1, y + 2.7);
      else if (style === 1) panel(B, V, f, u - .35, u + .35, y + .5, y + 3.1);
      else panel(B, V, f, u - bw * .44, u + bw * .44, y + 1.1, y + 2.5);
    }
  }
  B.box(V.x, V.y + V.h, V.z, V.w + .5, .3, V.d + .5);
  roofKit(B, { ...V, h: V.h + .3 }, r);
};
T.diagrid = (B, V, r) => {
  B.box(V.x, V.y, V.z, V.w, V.h, V.d, GLASS, true);
  const mu = 3.4 + r() * 1.6, mv = 7.4;
  for (let f = 0; f < 4; f++) {
    const F = FF(V, f), nu = Math.max(2, Math.round(F.len / mu)), nv = Math.max(2, Math.round(V.h / mv)), du = F.len / nu, dv = V.h / nv;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = F.at(i * du, OFF), b = F.at((i + 1) * du, OFF), y0 = V.y + j * dv, y1 = y0 + dv;
      B.line(a[0], y0, a[1], b[0], y1, b[1]); B.line(b[0], y0, b[1], a[0], y1, a[1]);
    }
    gridFace(B, V, f, 99, 3.7, true, false, true);
  }
  B.box(V.x, V.y + V.h, V.z, V.w + .3, .5, V.d + .3);
  roofKit(B, { ...V, h: V.h + .5 }, r, true);
};
T.stepped = (B, V, r) => {
  const steps = 3 + Math.floor(r() * 3), sh = V.h / steps, sb = Math.min(2.8, (V.w - 5) / (steps - 1));
  for (let i = 0; i < steps; i++) {
    const wi = V.w - i * sb, Vi = { x: V.x - V.w / 2 + wi / 2, z: V.z, w: wi, d: V.d, y: V.y + i * sh, h: sh };
    B.box(Vi.x, Vi.y, Vi.z, Vi.w, Vi.h, Vi.d);
    panel(B, Vi, 0, .5, V.d - .5, Vi.y + .35, Vi.y + sh - .55, GLASS, false, true);
    const F = FF(Vi, 0), nb = Math.round(V.d / 1.6);
    for (let j = 1; j < nb; j++) { const p = F.at(.5 + (V.d - 1) * j / nb, OFF + .01); B.line(p[0], Vi.y + .35, p[1], p[0], Vi.y + sh - .55, p[1], true); }
    for (const f of [2, 3]) { const G = FF(Vi, f), m = Math.max(1, Math.round(G.len / 3.5)); for (let j = 0; j < m; j++) { const u = (j + .5) * G.len / m; for (let y = Vi.y + .9; y < Vi.y + sh - 2; y += 3.3) panel(B, Vi, f, u - .6, u + .6, y, y + 1.7); } }
    if (i < steps - 1) {      // terrace of this step
      const xe = Vi.x + wi / 2 - .1, yt = Vi.y + sh;
      B.poly([[xe - sb + .2, yt + 1.05, V.z - V.d / 2 + .1], [xe, yt + 1.05, V.z - V.d / 2 + .1], [xe, yt + 1.05, V.z + V.d / 2 - .1], [xe - sb + .2, yt + 1.05, V.z + V.d / 2 - .1]], false, true);
      for (let j = 0; j <= 4; j++) { const zz = V.z - V.d / 2 + .1 + (V.d - .2) * j / 4; B.line(xe, yt, zz, xe, yt + 1.05, zz, true); }
      if (sb > 1.6) for (let j = 0; j < 3; j++) B.box(xe - .5, yt, V.z + (r() - .5) * (V.d - 3), .7, .5, 1.6 + r(), PAPER, true, true);
    }
  }
  const top = { x: V.x - V.w / 2 + (V.w - (steps - 1) * sb) / 2, z: V.z, w: V.w - (steps - 1) * sb, d: V.d, y: V.y, h: V.h };
  roofKit(B, top, r);
};
const TOWERS = ['curtain', 'fins', 'bands', 'diagrid', 'screen', 'louvre'];
T.podium = (B, V, r, cv) => {
  const ph = 7 + r() * 3, gh = 4.6;
  B.box(V.x - 1.3, V.y, V.z, V.w - 2.6, gh, V.d - .8, GLASS, false);
  gridFace(B, { x: V.x - 1.3, z: V.z, w: V.w - 2.6, d: V.d - .8, y: V.y, h: gh }, 0, 2.2, 99, true, true, false);
  B.box(V.x, V.y + gh, V.z, V.w, ph - gh, V.d);
  const nc = Math.max(2, Math.round(V.d / 4.5));
  for (let i = 0; i <= nc; i++) B.box(V.x + V.w / 2 - .45, V.y, V.z - V.d / 2 + .45 + (V.d - .9) * i / nc, .45, gh, .45);
  const Vp = { ...V, y: V.y + gh, h: ph - gh };
  panel(B, Vp, 0, .8, V.d - .8, V.y + gh + .9, V.y + ph - .9, GLASS, false, true);
  { const F = FF(Vp, 0), n = Math.round(V.d / .8); for (let i = 1; i < n; i++) { const u = .8 + (V.d - 1.6) * i / n; faceBox(B, Vp, 0, u, V.y + gh + .9, .08, ph - gh - 1.8, .35); } }
  for (const f of [2, 3]) gridFace(B, Vp, f, 3, 99, true, true, false);
  const tw = Math.max(6, V.w * (.5 + r() * .15)), td = Math.max(6, V.d * (.5 + r() * .25));
  const Vt = { x: V.x - V.w / 2 + tw / 2 + .6, z: V.z + (r() - .5) * Math.max(0, V.d - td - 1.5), w: tw, d: td, y: V.y + ph, h: Math.max(8, V.h - ph) };
  T[TOWERS[Math.floor(r() * TOWERS.length)]](B, Vt, r);
  // podium roof terrace
  const y = V.y + ph, fx = V.x + V.w / 2 - .15;
  B.poly([[Vt.x + tw / 2, y + 1.05, V.z - V.d / 2 + .15], [fx, y + 1.05, V.z - V.d / 2 + .15], [fx, y + 1.05, V.z + V.d / 2 - .15], [Vt.x + tw / 2, y + 1.05, V.z + V.d / 2 - .15]], false, true);
  B.poly([[V.x - V.w / 2, y + .02, V.z - V.d / 2], [V.x + V.w / 2, y + .02, V.z - V.d / 2], [V.x + V.w / 2, y + .02, V.z + V.d / 2], [V.x - V.w / 2, y + .02, V.z + V.d / 2]], true);
  const tx = (Vt.x + tw / 2 + fx) / 2, tWid = fx - (Vt.x + tw / 2) - 1.2;
  if (cv && tWid > 2) { for (const sz of [-1, 1]) for (const sx of [-1, 1]) B.box(tx + sx * tWid / 2, y, V.z + sz * (V.d / 2 - 1.2), .2, 4, .2); spaceFrame(B, tx, V.z, y + 4, tWid + 1.2, V.d - 1.2, 2.2, 1.3); }
  else if (tWid > 2.2 && r() < .7) pergola(B, tx, V.z, y, Math.min(4, tWid), Math.min(V.d - 3, 9), 2.6, true);
};
T.colonnade = (B, V, r) => {
  const h = Math.min(V.h, 11), Vc = { ...V, w: V.w - 2.4, d: V.d - 1.2, x: V.x - .6, h };
  for (let k = 0; k < 3; k++) B.box(Vc.x + Vc.w / 2 + .35 + k * .35, V.y, V.z, .35, .45 - k * .15, Vc.d * .7);
  B.box(Vc.x, V.y, Vc.z, Vc.w, .45, Vc.d);
  B.box(Vc.x, V.y + h - 1, Vc.z, Vc.w, 1, Vc.d);
  const Vg = { x: Vc.x, z: Vc.z, w: Vc.w - 4.4, d: Vc.d - 4.4, y: V.y + .45, h: h - 1.45 };
  B.box(Vg.x, Vg.y, Vg.z, Vg.w, Vg.h, Vg.d, GLASS, true);
  for (let f = 0; f < 4; f++) gridFace(B, Vg, f, 1.6, Vg.h / 2);
  const cy = V.y + .45, ch = h - 1.45;
  const nz = Math.max(2, Math.round(Vc.d / 3)), nx = Math.max(2, Math.round(Vc.w / 3));
  for (let i = 0; i <= nz; i++) { const zz = Vc.z - Vc.d / 2 + .4 + (Vc.d - .8) * i / nz; B.box(Vc.x + Vc.w / 2 - .4, cy, zz, .4, ch, .4); B.box(Vc.x - Vc.w / 2 + .4, cy, zz, .4, ch, .4); }
  for (let i = 1; i < nx; i++) { const xx = Vc.x - Vc.w / 2 + .4 + (Vc.w - .8) * i / nx; B.box(xx, cy, Vc.z + Vc.d / 2 - .4, .4, ch, .4); B.box(xx, cy, Vc.z - Vc.d / 2 + .4, .4, ch, .4); }
  // roof lantern
  const lw = Vg.w * .6, ld = Vg.d * .6; B.box(Vc.x, V.y + h, Vc.z, lw, 1.6, ld, GLASS, true); B.box(Vc.x, V.y + h + 1.6, Vc.z, lw + .5, .25, ld + .5);
  for (let f = 0; f < 4; f++) gridFace(B, { x: Vc.x, z: Vc.z, w: lw, d: ld, y: V.y + h, h: 1.6 }, f, 1.2, 99, true, true, false);
  for (let i = 1; i < 6; i++) B.line(Vc.x - Vc.w / 2, V.y + h + .02, Vc.z - Vc.d / 2 + Vc.d * i / 6, Vc.x + Vc.w / 2, V.y + h + .02, Vc.z - Vc.d / 2 + Vc.d * i / 6, true);
};
T.sawtooth = (B, V, r) => {
  const H = Math.min(V.h, 10.5), rh = 2.4, bh = H - rh, n = Math.max(2, Math.round(V.d / 4.6)), dz = V.d / n, x0 = V.x - V.w / 2, x1 = V.x + V.w / 2;
  B.box(V.x, V.y, V.z, V.w, bh, V.d);
  const yb = V.y + bh;
  for (let i = 0; i < n; i++) {
    const z0 = V.z - V.d / 2 + i * dz, z1 = z0 + dz, A = [x0, yb, z0], Bq = [x1, yb, z0], Cq = [x1, yb + rh, z0], D = [x0, yb + rh, z0], E = [x0, yb, z1], Fq = [x1, yb, z1];
    B.quad(A, Bq, Cq, D, GLASS, false, NZn); B.quad(D, Cq, Fq, E, PAPER, false, [0, 1, .4]); B.tri(A, D, E, PAPER, false, NXn); B.tri(Bq, Cq, Fq, PAPER, false, NX);
    B.poly([A, D, Cq, Bq], false); B.line(...D, ...E); B.line(...Cq, ...Fq);
    const m = Math.round(V.w / 1.4); for (let j = 1; j < m; j++) B.line(x0 + V.w * j / m, yb, z0 - OFF, x0 + V.w * j / m, yb + rh, z0 - OFF, true);
  }
  const Vb = { ...V, h: bh }, F = FF(Vb, 0), nb = Math.max(2, Math.round(F.len / 5));
  for (let j = 0; j < nb; j++) { const u = (j + .5) * F.len / nb; if (j % 2) panel(B, Vb, 0, u - 1.6, u + 1.6, V.y + .05, V.y + Math.min(4.2, bh - 1)); else panel(B, Vb, 0, u - 2, u + 2, V.y + bh - 2.2, V.y + bh - .7); }
  for (const f of [1, 2, 3]) { const G = FF(Vb, f); panel(B, Vb, f, 1, G.len - 1, V.y + bh - 2, V.y + bh - .8); gridFace(B, { ...Vb, y: V.y + bh - 2, h: 1.2 }, f, 1.5, 99, true, true, false, OFF + .01); }
};
T.cylinder = (B, V, r) => {
  const R = Math.min(V.w, V.d) / 2 - .4, n = Math.round(V.h / 3.7);
  B.cyl(V.x, V.y, V.z, R, V.h, GLASS, 30);
  for (let i = 2; i < n; i += 2) B.cyl(V.x, V.y + i * V.h / n, V.z, R + .4, .32, PAPER, 30);
  B.cyl(V.x, V.y, V.z, R + .4, .5, PAPER, 30); B.cyl(V.x, V.y + V.h, V.z, R + .4, .5, PAPER, 30);
  for (let i = 0; i < 28; i++) { const a = i / 28 * 6.2832, px = V.x + Math.cos(a) * (R + .04), pz = V.z + Math.sin(a) * (R + .04); B.line(px, V.y, pz, px, V.y + V.h, pz, true); }
  for (let i = 1; i < n; i++) if (i % 2) B.circle(V.x, V.y + i * V.h / n, V.z, R + .04, 28, true);
  B.cyl(V.x, V.y + V.h + .5, V.z, R * .45, 1.8, PAPER, 30); B.circle(V.x, V.y + V.h + 1.5, V.z, R - .3, 28);
  B.line(V.x, V.y + V.h + 2.3, V.z, V.x, V.y + V.h + 9, V.z);
};
T.louvre = (B, V, r) => {
  B.box(V.x, V.y, V.z, V.w - .9, V.h, V.d - .9, GLASS, false);
  B.box(V.x, V.y, V.z - V.d / 2 + .25, V.w, V.h, .5); B.box(V.x, V.y, V.z + V.d / 2 - .25, V.w, V.h, .5);
  B.box(V.x, V.y + V.h - .5, V.z, V.w, .5, V.d - 1);
  const n = Math.round(V.h / 3.8);
  for (let i = 1; i < n; i++) B.box(V.x, V.y + i * V.h / n - .15, V.z, V.w, .28, V.d - 1);
  for (const f of [0, 1]) {
    const F = FF(V, f), a = F.at(.5, .02), b = F.at(F.len - .5, .02);
    for (let y = V.y + 4.4; y < V.y + V.h - .6; y += .5) B.line(a[0], y, a[1], b[0], y, b[1], true);
    const m = Math.round(F.len / 3); for (let j = 1; j < m; j++) { const p = F.at(F.len * j / m, .03); B.line(p[0], V.y, p[1], p[0], V.y + V.h - .5, p[1], true); }
  }
  roofKit(B, V, r, V.h > 24);
};
T.screen = (B, V, r) => {
  const Vi = { ...V, w: V.w - 1.8, d: V.d - 1.8 }, g = 4.4, Vs = { ...V, y: V.y + g, h: V.h - g };
  B.box(Vi.x, Vi.y, Vi.z, Vi.w, Vi.h, Vi.d, GLASS, true);
  B.box(V.x, V.y + g - .4, V.z, V.w, .4, V.d); B.box(V.x, V.y + V.h, V.z, V.w, .45, V.d);
  wire(B, Vs);
  const sp = 1 + r() * .5, diag = r() < .6;
  for (let f = 0; f < 4; f++) {
    if (diag) diagHatch(B, Vs, f, sp, true, 0); else gridFace(B, Vs, f, .55, 99, true, true, false, 0);
    gridFace(B, Vi, f, 99, 3.7, true, false, true);
    gridFace(B, Vs, f, 99, 7.4, false, false, true, 0);
  }
  roofKit(B, { ...V, h: V.h + .45 }, r, true);
};
T.twin = (B, V, r) => {
  const gap = 3.2, da = (V.d - gap) * (.42 + r() * .16), db = V.d - gap - da;
  const Va = { ...V, z: V.z - V.d / 2 + da / 2, d: da }, Vb = { ...V, z: V.z + V.d / 2 - db / 2, d: db, h: V.h * (.68 + r() * .2) };
  T[r() < .5 ? 'curtain' : 'bands'](B, Va, r); T[r() < .5 ? 'fins' : 'bands'](B, Vb, r);
  const zc = V.z - V.d / 2 + da + gap / 2;
  for (const k of [.38, .78]) { const y = V.y + Vb.h * k; B.box(V.x, y, zc, V.w * .4, 3, gap, GLASS, true); B.line(V.x - V.w * .2, y, zc - gap / 2, V.x - V.w * .2, y + 3, zc + gap / 2, true); B.line(V.x + V.w * .2, y, zc - gap / 2, V.x + V.w * .2, y + 3, zc + gap / 2, true); }
};
T.plaza = (B, V, r) => {
  const n = Math.round(V.w / 1.8), m = Math.round(V.d / 1.8);
  for (let i = 1; i < n; i++) B.line(V.x - V.w / 2 + V.w * i / n, V.y + .01, V.z - V.d / 2, V.x - V.w / 2 + V.w * i / n, V.y + .01, V.z + V.d / 2, true);
  for (let j = 1; j < m; j++) B.line(V.x - V.w / 2, V.y + .01, V.z - V.d / 2 + V.d * j / m, V.x + V.w / 2, V.y + .01, V.z - V.d / 2 + V.d * j / m, true);
  pergola(B, V.x + V.w * .18, V.z, V.y, Math.min(4, V.w * .35), V.d * .7, 3);
  // kiosk under a small space-frame roof
  const kx = V.x - V.w * .26; B.box(kx, V.y, V.z, 2.6, 2.8, 4, GLASS, true); gridFace(B, { x: kx, z: V.z, w: 2.6, d: 4, y: V.y, h: 2.8 }, 0, 1, 99);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(kx + sx * 1.9, V.y, V.z + sz * 3, .16, 3.6, .16);
  spaceFrame(B, kx, V.z, V.y + 3.6, 5, 7.6, 1.6, .9);
  for (let i = 0; i < 4; i++) B.box(V.x + V.w * .18, V.y, V.z - V.d * .26 + i * V.d * .17, .5, .45, 1.8, PAPER, true, true);
};
/** mid-rise block under a big rooftop space-frame canopy */
T.canopy = (B, V, r) => {
  const Vb = { ...V, w: V.w - 2.4, d: V.d - 2.4 };
  T.bands(B, Vb, r);
  const y = V.y + V.h, cy = y + 5.2;
  const nx = 2, nz = Math.max(2, Math.round(Vb.d / 7));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    if (i === 1 && j > 0 && j < nz) continue;
    const px = Vb.x - Vb.w / 2 + .6 + (Vb.w - 1.2) * i / nx, pz = Vb.z - Vb.d / 2 + .6 + (Vb.d - 1.2) * j / nz;
    B.box(px, y, pz, .26, 3.4, .26, PAPER, true);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.line(px, y + 3.4, pz, px + sx * 1.3, cy, pz + sz * 1.3);
  }
  spaceFrame(B, V.x, V.z, cy, V.w, V.d, 2.6, 1.9);
  B.quad([V.x - V.w * .3, cy + 1.95, V.z - V.d * .3], [V.x + V.w * .3, cy + 1.95, V.z - V.d * .3], [V.x + V.w * .3, cy + 1.95, V.z + V.d * .3], [V.x - V.w * .3, cy + 1.95, V.z + V.d * .3], PAPER, false, NY);
};
/** free-standing space-frame hall */
T.hall = (B, V) => {
  const h = 8.6, dep = 2.4, mod = 3;
  const nx = Math.round(V.w / 6), nz = Math.round(V.d / 6);
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    if (i > 0 && i < nx && j > 0 && j < nz && (i + j) % 2) continue;
    const px = V.x - V.w / 2 + 1.5 + (V.w - 3) * i / nx, pz = V.z - V.d / 2 + 1.5 + (V.d - 3) * j / nz;
    B.box(px, V.y, pz, .36, h - 2.6, .36);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.line(px, V.y + h - 2.6, pz, px + sx * 1.5, V.y + h, pz + sz * 1.5);
  }
  spaceFrame(B, V.x, V.z, V.y + h, V.w, V.d, mod, dep);
  // glazed room and a paper box under the frame; a roof sheet over the middle third
  const Vg = { x: V.x - 1, z: V.z + 2, w: V.w - 10, d: V.d - 14, y: V.y, h: 6 };
  B.box(Vg.x, Vg.y, Vg.z, Vg.w, Vg.h, Vg.d, GLASS, true); for (let f = 0; f < 4; f++) gridFace(B, Vg, f, 1.5, 3);
  B.box(Vg.x, Vg.y + Vg.h, Vg.z, Vg.w + .6, .3, Vg.d + .6);
  B.box(V.x + V.w / 2 - 5, V.y, V.z - V.d / 2 + 5, 4.5, 3.4, 5);
  const ty = V.y + h + dep + .06;
  B.quad([V.x - V.w / 2, ty, V.z - V.d / 6], [V.x + V.w / 2, ty, V.z - V.d / 6], [V.x + V.w / 2, ty, V.z + V.d / 6], [V.x - V.w / 2, ty, V.z + V.d / 6], PAPER, false, NY);
};

const WEIGHTS = [
  { stepped: 3, balcony: 3, punched: 3, colonnade: 1.6, sawtooth: 1.8, bands: 2, podium: 2, plaza: 1.3, louvre: 1, fins: 1.2 },
  { curtain: 3, fins: 3, bands: 2.5, diagrid: 2, louvre: 2, screen: 2.2, podium: 3, balcony: 2, cylinder: 1.2, twin: 1.6, punched: 1.4 },
  { curtain: 3, fins: 2, diagrid: 3, screen: 2, podium: 2.2, bands: 2, twin: 1.6, cylinder: 1 }
];
function pickType(r, row) {
  const W = WEIGHTS[row]; let tot = 0; for (const k in W) tot += W[k];
  let x = r() * tot; for (const k in W) { x -= W[k]; if (x <= 0) return k; } return 'bands';
}

/* ───────────────────────── easter eggs ───────────────────────── */
// local frame: +X faces the walkway, origin on the ground at the centre of the plot.
const EGGS = [
  { id: 'sail', title: 'Build week — bamboo and sail', tag: 'BUILD WEEK · BAMBOO + SAIL', href: 'art.html', side: -1, a: 15.5, z: -8, hx: 4.5, hz: 4.5, hy: 11 },
  { id: 'atelier', title: 'Atelier 07 — Almond daylight study', tag: 'ALMOND · ATELIER 07', href: 'tools.html#p-almond', side: 1, a: 17.5, z: -27, hx: 6, hz: 7.5, hy: 9 },
  { id: 'wasp', title: 'wasp-mcp — discrete aggregation', tag: 'WASP-MCP · AGGREGATION', href: 'tools.html#p-wasp', side: -1, a: 18, z: -45, hx: 6.5, hz: 6.5, hy: 13 },
  { id: 'w3', title: 'Ginkgo W3 — stilt lattice', tag: 'GINKGO W3 · STILT LATTICE', href: 'tools.html#p-ginkgo', side: 1, a: 18.5, z: -62, hx: 7, hz: 9, hy: 8 },
  { id: 'arcc', title: 'Almond — ARCC Tower', tag: 'ALMOND · ARCC TOWER', href: 'tools.html#p-almond', side: -1, a: 19.5, z: -77, hx: 8, hz: 9, hy: 27 },
  { id: 'studio', title: 'Core Studio 01 — MoMA Singapore, the inverted pyramid', tag: 'CS1 · MOMA SINGAPORE', href: 'studio1.html', side: 1, a: 19.5, z: -87.5, hx: 8, hz: 10, hy: 13 },
  { id: 'w6', title: 'Ginkgo W6 — hull stack', tag: 'GINKGO W6 · HULL STACK', href: 'tools.html#p-ginkgo', side: -1, a: 20, z: -137.5, hx: 8, hz: 10, hy: 18 },
  { id: 'museum', title: 'Museum of Memories — Diomede archive', tag: 'MOM · MUSEUM OF MEMORIES', href: 'museum.html', side: 1, a: 19.5, z: -156, hx: 8, hz: 8, hy: 18 },
  { id: 'w4', title: 'Ginkgo W4 — plug-in spine', tag: 'GINKGO W4 · PLUG-IN SPINE', href: 'tools.html#p-ginkgo', side: -1, a: 20.5, z: -175, hx: 6, hz: 14, hy: 24 }
];
const EGG = {};
EGG.sail = (B, r) => {
  const pole = (a, b, t = .13) => { B.beam(a, b, t, PAPER, 0, false, CYL8); B.line(...a, ...b); };
  const apex = [0, 7.4, 0], feet = [[-2.6, 0, -2.2], [2.4, 0, -2.6], [.4, 0, 3]];
  const tips = feet.map(f => [apex[0] + (apex[0] - f[0]) * .3, apex[1] + (apex[1] - f[1]) * .3, apex[2] + (apex[2] - f[2]) * .3]);
  feet.forEach((f, i) => { pole(f, tips[i]); pole([f[0] * .75 + .3, 0, f[2] * .75 + .2], [tips[i][0] - .2, tips[i][1] - .4, tips[i][2] + .1], .1); });
  for (const k of [.28, .52, .76]) { const P = feet.map(f => [f[0] + (apex[0] - f[0]) * k, f[1] + (apex[1] - f[1]) * k, f[2] + (apex[2] - f[2]) * k]); B.poly(P, true); pole(P[0], P[1], .08); pole(P[1], P[2], .08); }
  const boomA = [-2.8, .9, 1.6], boomB = [3.4, 10.4, -.6]; pole(boomA, boomB, .15);
  const yard = [[3.6, 5.6, -3.4], [-1.2, 8.3, 2.6]]; pole(yard[0], yard[1], .11);
  // sails: sagging triangles of cloth
  const sail = (a, b, c, sag) => {
    const n = 4, pt = (i, j) => { const u = i / n, v = j / n, w = 1 - u - v, s = sag * 4 * Math.min(u, v, w); return [a[0] * w + b[0] * u + c[0] * v, a[1] * w + b[1] * u + c[1] * v - s * 3, a[2] * w + b[2] * u + c[2] * v + s]; };
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) { B.sheet([pt(i, j), pt(i + 1, j), pt(i, j + 1)]); if (i + j < n - 1) B.sheet([pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)]); }
    B.poly([a, b, c], true); B.line(...pt(2, 0), ...pt(0, 2)); B.line(...pt(2, 2), ...pt(2, 0));
  };
  sail(boomB, yard[0], [2.9, 1.7, 2.9], .5); sail([-.2, 8.6, .2], yard[1], [-3.3, 2.3, -2.9], .45); sail(tips[2], [3.3, 3.4, 1.2], [.2, 3, -3.6], .3);
  for (const [a, b] of [[[2.9, 1.7, 2.9], [3.9, 0, 3.9]], [[-3.3, 2.3, -2.9], [-4, 0, -3.9]], [boomB, [4, 0, -3.8]], [yard[0], [3.9, 0, -4]]]) { B.line(...a, ...b); B.box(b[0], 0, b[2], .25, .3, .25); }
  B.circle(0, .03, 0, 3.9, 32);
};
EGG.atelier = (B) => {
  B.box(.4, 0, 0, 11, .3, 14);
  B.box(-.6, .3, 0, 7.6, 6.1, 11.6, GLASS, false);                                    // the room
  B.box(-4.45, .3, 0, .35, 6.1, 12.3);                                                  // north wall
  B.box(-.6, .3, 5.95, 8, 6.1, .35);                                                    // full side wall
  B.box(-2.6, .3, -5.95, 4, 6.1, .35);                                                  // half side wall
  B.box(-.2, 6.4, 0, 9.6, .32, 13.2);                                                   // roof slab
  B.box(1.2, 3.25, 2.9, 4.2, .25, 5.6); B.line(3.25, 3.4, .1, 3.25, 3.4, 5.7);
  const Vg = { x: -.6, z: 0, w: 7.6, d: 11.6, y: .3, h: 6.1 };
  gridFace(B, Vg, 0, 1.45, 3.05, false); gridFace(B, Vg, 3, 1.3, 3.05, false);
  for (let i = 0; i < 8; i++) B.box(4.05, .3, -5.6 + i * 1.6, .2, 6.1, .2);            // the slim colonnade
  B.box(3.9, 3.2, 3, 1.3, .16, 5.6); B.poly([[3.25, 4.3, .25], [4.5, 4.3, .25], [4.5, 4.3, 5.75], [3.25, 4.3, 5.75]]);
  B.box(-2.4, 6.72, 2.6, 1.6, 1, 2.2); B.box(-1, 6.72, -2.8, 2.6, .3, 3.2, GLASS, true);
  B.box(-2.2, .3, -7.2, 3, 2.6, .25); B.box(5.2, .3, -4, 1.2, .45, 2.6);               // garden wall, bench
  // sun path over the house (the daylight study)
  const R = 8.6, arc = []; for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI; arc.push([R * Math.sin(t) * .42 + 1, .3 + R * Math.sin(t) * .96, -R * Math.cos(t) * .82]); }
  B.poly(arc); for (let i = 2; i <= 22; i += 2) { const p = arc[i]; B.line(p[0], p[1], p[2], p[0], p[1] - .35, p[2]); }
  const sp = arc[15]; B.node(sp[0], sp[1], sp[2], .32, false); B.line(sp[0], sp[1], sp[2], 1, 3.4, 0);
};
EGG.wasp = (B, r) => {
  const u = 1.45, occ = new Set(), parts = [], key = (x, y, z) => x + ',' + y + ',' + z, AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const add = (c, ax, dir) => {
    const cells = [0, 1, 2].map(i => [c[0] + AX[ax][0] * i * dir, c[1] + AX[ax][1] * i * dir, c[2] + AX[ax][2] * i * dir]);
    for (const q of cells) if (q[1] < 0 || q[1] > 7 || Math.abs(q[0]) > 3 || Math.abs(q[2]) > 3 || occ.has(key(...q))) return false;
    cells.forEach(q => occ.add(key(...q))); parts.push({ cells, ax }); return true;
  };
  add([0, 0, 0], 1, 1); add([1, 0, 0], 0, 1); add([-1, 0, -1], 2, -1);
  for (let t = 0; t < 900 && parts.length < 34; t++) {
    const p = parts[Math.floor(r() * parts.length)], end = p.cells[r() < .5 ? 0 : 2], ax = (p.ax + 1 + Math.floor(r() * 2)) % 3, dir = r() < .5 ? 1 : -1;
    const o = AX[Math.floor(r() * 3)], sgn = r() < .5 ? 1 : -1;
    add([end[0] + o[0] * sgn, end[1] + o[1] * sgn, end[2] + o[2] * sgn], ax, dir);
  }
  parts.forEach((p, i) => {
    const a = p.cells[0], b = p.cells[2], cx = (a[0] + b[0]) / 2 * u, cy = Math.min(a[1], b[1]) * u + .12, cz = (a[2] + b[2]) / 2 * u, g = u - .07;
    const sz = [g, g, g]; sz[p.ax] = 3 * u - .07;
    B.box(cx, cy, cz, sz[0], sz[1], sz[2], p.ax === 1 ? PAPER : (i % 2 ? GREY : PAPER), true);
    // connection marks at the joints
    for (const k of [-.5, .5]) { const q = [cx, cy + sz[1] / 2, cz]; q[p.ax] += k * u; if (p.ax !== 1) B.circle(q[0], cy + sz[1] + .01, q[2], .22, 8); }
  });
  for (let i = -4; i <= 4; i++) { B.line(i * u, .02, -4 * u, i * u, .02, 4 * u); B.line(-4 * u, .02, i * u, 4 * u, .02, i * u); }
  B.box(0, 0, 0, 8 * u + .6, .1, 8 * u + .6, PAPER, false);
};
EGG.w3 = (B, r) => {
  B.box(0, 0, 0, 13.4, .1, 17.4, GLASS, true);
  for (let i = 0; i < 9; i++) { const z = -8 + i * 2 + .4, x = -5.8 + (i * 3.7 % 9); B.line(x, .12, z, x + 1.6 + (i % 3) * .5, .12, z); }
  const dy = 2.3, stilts = (x0, x1, z0, z1) => { const nx = Math.max(1, Math.round((x1 - x0) / 2.2)), nz = Math.max(1, Math.round((z1 - z0) / 2.2)); for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) { const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz; B.box(x, .1, z, .2, dy - .1 + (((i + j) % 3) === 0 ? 1.1 : 0), .2, PAPER, false); B.line(x, .1, z, x, dy, z); } };
  const rail = (x0, x1, z0, z1) => { const P = [[x0, dy + 1.25, z0], [x1, dy + 1.25, z0], [x1, dy + 1.25, z1], [x0, dy + 1.25, z1]]; B.poly(P, true); B.poly(P.map(p => [p[0], dy + .75, p[2]]), true); };
  const deck = (x, z, w, d, rl = true) => { B.box(x, dy, z, w, .2, d); stilts(x - w / 2 + .25, x + w / 2 - .25, z - d / 2 + .25, z + d / 2 - .25); if (rl) rail(x - w / 2 + .1, x + w / 2 - .1, z - d / 2 + .1, z + d / 2 - .1); const n = Math.round(d / .45); for (let i = 1; i < n; i++) B.line(x - w / 2, dy + .21, z - d / 2 + d * i / n, x + w / 2, dy + .21, z - d / 2 + d * i / n); };
  const house = (x, z, w, d, ridgeZ) => {
    deck(x, z, w + 2.2, d + 2.2);
    B.box(x, dy + .2, z, w, 2.5, d); const V = { x, z, w, d, y: dy + .2, h: 2.5 };
    panel(B, V, 0, .5, d - .5, dy + .6, dy + 2.4, GLASS, false, true); panel(B, V, 2, .6, w - .6, dy + 1.1, dy + 2.3, GLASS, false, true);
    for (let k = 0; k < 5; k++) { const f = 1 - k / 5.2; if (ridgeZ) B.box(x, dy + 2.7 + k * .36, z, (w + 1.5) * f, .36, d + 1.3); else B.box(x, dy + 2.7 + k * .36, z, w + 1.3, .36, (d + 1.5) * f); }
  };
  house(-2.6, -5, 4.2, 4.6, true); house(2.4, 4.4, 4.6, 4.2, false); house(-3.2, 5.2, 3.2, 3.2, true);
  deck(2.6, -4.6, 1.5, 6.4, false); deck(-.2, .2, 4.6, 1.5, false); deck(-3.2, .6, 1.5, 5.2, false); deck(4.6, -.4, 1.5, 3.6, false);
  B.box(5.4, .1, -7, 2.2, .5, 1, PAPER, true); B.line(5.4, .6, -7, 5.4, 2.6, -7);     // a moored boat
};
EGG.arcc = (B) => {
  const mx = -1.2, mz = -2, H = 26, hw = .75;
  B.box(mx, 0, mz, 5, .4, 5); B.box(mx, .4, mz, 3.6, .3, 3.6);
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(s => [mx + s[0] * hw, mz + s[1] * hw]);
  legs.forEach(l => B.beam([l[0], .7, l[1]], [l[0], H, l[1]], .13, INK));
  for (let y = .7; y < H - .1; y += 1.9) for (let i = 0; i < 4; i++) { const a = legs[i], b = legs[(i + 1) % 4], y1 = Math.min(y + 1.9, H); B.line(a[0], y, a[1], b[0], y, b[1]); B.line(a[0], y, a[1], b[0], y1, b[1]); B.line(b[0], y, b[1], a[0], y1, a[1]); }
  // spiral stair up to the ring platform
  const y0 = .7, y1 = 10.6, turns = 2.75, N = 84, Ri = 1.25, Ro = 3.1, pt = (i, R, dy = 0) => { const a = i / N * turns * 6.2832 + 1; return [mx + Math.cos(a) * R, y0 + (y1 - y0) * i / N + dy, mz + Math.sin(a) * R]; };
  for (let i = 0; i < N; i++) {
    const a = pt(i, Ri), b = pt(i, Ro), c = pt(i + 1, Ro), d = pt(i + 1, Ri); c[1] = b[1]; d[1] = a[1];
    B.sheet([a, b, c, d]); B.line(...a, ...b);
    B.line(...pt(i, Ro), ...pt(i + 1, Ro)); B.line(...pt(i, Ro, 1.05), ...pt(i + 1, Ro, 1.05)); B.line(...pt(i, Ri), ...pt(i + 1, Ri));
    if (i % 4 === 0) B.line(...pt(i, Ro), ...pt(i, Ro, 1.05));
  }
  B.cyl(mx, y1, mz, 4.3, .16, PAPER, 30); B.circle(mx, y1 + 1.1, mz, 4.25, 32); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; B.line(mx + Math.cos(a) * 4.25, y1 + .16, mz + Math.sin(a) * 4.25, mx + Math.cos(a) * 4.25, y1 + 1.1, mz + Math.sin(a) * 4.25); }
  B.box(mx + 1.6, 3.2, mz - 1.6, 1.1, 1.9, 1.1);                                        // lift car
  // two-storey office bar hung off the mast
  const V = { x: .4, z: .8, w: 4.6, d: 14.6, y: 11.6, h: 5.6 };
  B.box(V.x, V.y, V.z, V.w - .3, V.h, V.d - .3, GLASS, false);
  for (const y of [V.y - .12, V.y + V.h / 2 - .12, V.y + V.h - .1]) B.box(V.x, y, V.z, V.w, .26, V.d);
  for (const f of [0, 1]) { gridFace(B, V, f, 1.2, 99, false, true, false, -.1); const F = FF(V, f); for (let u = 0; u < F.len - .1; u += 1.2) { const a = F.at(u, -.1), b = F.at(u + .6, -.1), c = F.at(Math.min(u + 1.2, F.len), -.1); B.line(a[0], V.y + V.h - .1, a[1], b[0], V.y + V.h - .75, b[1]); B.line(b[0], V.y + V.h - .75, b[1], c[0], V.y + V.h - .1, c[1]); } }
  B.box(V.x, V.y, V.z + V.d / 2 - .1, V.w, V.h, .2); B.box(V.x, V.y, V.z - V.d / 2 + .1, V.w, V.h, .2);
  // stays and guys
  for (let i = 0; i <= 6; i++) { const z = V.z - V.d / 2 + V.d * i / 6; for (const sx of [-1, 1]) B.line(mx, H - .4 - (i % 2) * 1.6, mz, V.x + sx * V.w / 2, V.y + V.h + .16, z); }
  for (const g of [[-7.4, -7.6], [-7.4, 6.5], [6.4, -8.2]]) { B.line(mx, H - .2, mz, g[0], .3, g[1]); B.box(g[0], 0, g[1], .7, .3, .7); }
  B.box(mx, 19.6, mz, 3.6, 1.9, 2.2); B.box(mx, 19.6, mz, 2.2, 1.9, 3.8); B.line(mx, H, mz, mx, H + 2.6, mz);
  // folded stair down from the bar
  const fl = [[[3.5, 11.6, 6.6], [3.5, 7.8, -1.4]], [[4.8, 7.8, -1.4], [4.8, 4, 6.6]], [[6.1, 4, 6.6], [6.1, .1, -1.4]]];
  fl.forEach(([a, b], i) => {
    B.sheet([[a[0] - .55, a[1], a[2]], [a[0] + .55, a[1], a[2]], [b[0] + .55, b[1], b[2]], [b[0] - .55, b[1], b[2]]]);
    for (const s of [-.55, .55]) { B.line(a[0] + s, a[1], a[2], b[0] + s, b[1], b[2]); B.line(a[0] + s, a[1] + 1, a[2], b[0] + s, b[1] + 1, b[2]); }
    if (i < 2) { const n = fl[i + 1][0]; B.box((b[0] + n[0]) / 2, b[1] - .12, b[2] + (i ? .6 : -.6), 2.5, .14, 1.2); B.line(b[0], b[1], b[2], b[0], 0, b[2]); }
  });
  B.box(3.5, 11.48, 7.4, 1.4, .14, 1.8);
};
EGG.studio = (B) => {
  const frustum = (cx, cz, y0, y1, bw, bd, tw, td, mull) => {
    const b = [[cx - bw / 2, y0, cz - bd / 2], [cx + bw / 2, y0, cz - bd / 2], [cx + bw / 2, y0, cz + bd / 2], [cx - bw / 2, y0, cz + bd / 2]];
    const t = [[cx - tw / 2, y1, cz - td / 2], [cx + tw / 2, y1, cz - td / 2], [cx + tw / 2, y1, cz + td / 2], [cx - tw / 2, y1, cz + td / 2]];
    const N = [NZn, NX, NZ, NXn];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4; B.quad(b[i], b[j], t[j], t[i], GLASS, false, N[i]); B.line(...b[i], ...t[i]); B.line(...b[i], ...b[j]);
      for (let k = 1; k < mull; k++) { const u = k / mull, o = N[i]; B.line(b[i][0] + (b[j][0] - b[i][0]) * u + o[0] * .04, y0, b[i][2] + (b[j][2] - b[i][2]) * u + o[2] * .04, t[i][0] + (t[j][0] - t[i][0]) * u + o[0] * .04, y1, t[i][2] + (t[j][2] - t[i][2]) * u + o[2] * .04); }
      const m = .52, e = o => o * .04; B.line(b[i][0] + (t[i][0] - b[i][0]) * m + e(N[i][0]), y0 + (y1 - y0) * m, b[i][2] + (t[i][2] - b[i][2]) * m + e(N[i][2]), b[j][0] + (t[j][0] - b[j][0]) * m + e(N[i][0]), y0 + (y1 - y0) * m, b[j][2] + (t[j][2] - b[j][2]) * m + e(N[i][2]));
    }
    B.box(cx, y1, cz, tw + .5, .5, td + .5);
  };
  const tube = (x, y, z, r, len, tiltX, tiltZ) => {
    _q.setFromEuler(new THREE.Euler(tiltX, 0, tiltZ)); _m.compose(_p.set(x, y, z), _q, _s.set(r, len, r)); B.geo(CYL24, _m, PAPER, 30);
    const ax = new THREE.Vector3(0, 1, 0).applyQuaternion(_q), top = [x + ax.x * len / 2, y + ax.y * len / 2, z + ax.z * len / 2];
    _m.compose(_p.set(top[0] + ax.x * .02, top[1] + ax.y * .02, top[2] + ax.z * .02), _q, _s.set(r * .82, .02, r * .82)); B.geo(CYL24, _m, INK, 0);
  };
  B.box(0, 0, 0, 15.6, .2, 19.6, PAPER, false);
  frustum(-.8, -2.2, .2, 8.4, 5.6, 5.6, 11.2, 11.2, 5);                 // the inverted pyramid
  tube(1.6, 7, .4, 1.25, 12.5, -.34, -.1);                              // light funnel through its roof
  frustum(.6, 6.4, .2, 5, 4.2, 3, 8.4, 6.2, 4);                         // the lower wing
  tube(1.4, 4.6, 7.4, .9, 9, .32, .12);
  B.box(4.6, 5, -1, 4, .3, 3.4); B.line(6.6, 5, -2.7, 6.6, .2, -2.7); B.line(6.6, 5, .7, 6.6, .2, .7);   // cantilevered deck
  for (let i = 0; i < 7; i++) B.box(7.5 - i * .42, .2, -5.6, .42, .22 * (i + 1), 5.4);                  // amphitheatre steps
  const pit = (x, z, s) => { const P = (k) => [[x - k, .22, z - k], [x + k, .22, z - k], [x + k, .22, z + k], [x - k, .22, z + k]]; const o = P(s), n = P(s * .62); B.poly(o, true); B.poly(n, true); for (let i = 0; i < 4; i++) B.line(...o[i], ...n[i]); };
  pit(6.2, 3.6, 1.3); pit(-6.2, 7.9, 1.2); pit(-6.2, 4.6, 1.2);
};
EGG.w6 = (B, r) => {
  const hull = (x, y, z, L, col = PAPER) => {
    B.box(x, y, z, 2.7, 2.5, L, col, true);
    for (let k = 1; k < L / 1.1; k++) for (const s of [-1, 1]) B.line(x + s * 1.37, y + .15, z - L / 2 + k * 1.1, x + s * 1.37, y + 2.35, z - L / 2 + k * 1.1);
    for (const s of [-1, 1]) { const zz = z + s * (L / 2 + .02); B.line(x, y + .1, zz, x, y + 2.4, zz); B.poly([[x - 1.2, y + .1, zz], [x + 1.2, y + .1, zz], [x + 1.2, y + 2.4, zz], [x - 1.2, y + 2.4, zz]], true); }
  };
  // steel portals
  const portal = (x, z0, z1, h) => { B.box(x, 0, z0, .55, h, .55, SHADE, true); B.box(x, 0, z1, .55, h, .55, SHADE, true); B.box(x, h, (z0 + z1) / 2, .55, .55, z1 - z0 + .55, SHADE, true); };
  portal(-3.6, -9.2, 9.2, 17.2); portal(-.9, -9.2, .3, 12.6);
  B.box(-2.25, 12.6, -9.2, 3.2, .4, .4, SHADE, true); B.box(-2.25, 12.6, .3, 3.2, .4, .4, SHADE, true);
  const lv = k => .5 + k * 2.78;
  for (let k = 0; k < 6; k++) {                     // tall stack
    const sh = (k % 2 ? .55 : -.45), zc = 5 + (k % 3 - 1) * .5;
    hull(-2.2 + sh, lv(k), zc, 7.8, k % 2 ? GREY : PAPER); if (k !== 2) hull(.6 + sh * .6, lv(k), zc + .3 - sh, 7.4, k % 2 ? PAPER : GREY);
    B.box(-.8, lv(k) + 2.5, zc, 6.6, .16, 8.6); B.poly([[2.5, lv(k) + 3.7, zc - 4.3], [2.5, lv(k) + 3.7, zc + 4.3]]);
  }
  for (let k = 1; k < 5; k++) {                     // lower stack, raised on the frame
    const sh = (k % 2 ? -.5 : .4);
    hull(-2.3 + sh, lv(k), -4.6, 7.6, k % 2 ? PAPER : GREY); if (k < 4) hull(.5, lv(k), -4.9 + sh, 7, k % 2 ? GREY : PAPER);
    B.box(-.9, lv(k) + 2.5, -4.7, 6.2, .16, 8.2);
  }
  for (const z of [-8.2, -1.2]) for (const x of [-3.2, 1.2]) B.box(x, 0, z, .3, lv(1), .3, SHADE, true);
  // zig-zag stair up the tall stack
  for (let k = 0; k < 6; k++) { const a = [2.9, lv(k) + (k ? 2.66 : -.5), k % 2 ? 8.4 : 2], b = [2.9, lv(k + 1) + 2.66 - 0, k % 2 ? 2 : 8.4]; if (k === 5) break; B.beam(a, b, .2, SHADE); for (const s of [-.35, .35]) { B.line(a[0] + s, a[1], a[2], b[0] + s, b[1], b[2]); B.line(a[0] + s, a[1] + .95, a[2], b[0] + s, b[1] + .95, b[2]); } }
  hull(5.6, .15, -3.6, 8.6); hull(4.4, .15, 6.2, 5.4, GREY); B.box(5.6, 2.65, -3.6, 2.9, .12, 8.8);
  B.box(-1, 0, 0, 9.5, .15, 19.6, PAPER, false);
};
EGG.museum = (B, r) => {
  const c = 2.2, nx = 5, nz = 5, ny = 6, y0 = 1.7, x0 = -nx * c / 2 - .6, z0 = -nz * c / 2;
  B.box(0, 0, 0, 15.4, .1, 15.4, GLASS, true);
  // an ice-floe outline on the strait, ripples round the piles
  const floe = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.2832; floe.push([Math.cos(a) * (6.3 + (i % 3) * .6), .12, Math.sin(a) * (6 + (i % 2) * .9)]); } B.poly(floe, true);
  // open steel lattice
  for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) { B.line(x0 + i * c, .1, z0 + k * c, x0 + i * c, y0 + ny * c, z0 + k * c); if ((i + k) % 2 === 0) { B.box(x0 + i * c, .1, z0 + k * c, .24, y0, .24, PAPER, false); B.circle(x0 + i * c, .13, z0 + k * c, .55, 10); } }
  for (let j = 0; j <= ny; j++) { const y = y0 + j * c; for (let i = 0; i <= nx; i++) B.line(x0 + i * c, y, z0, x0 + i * c, y, z0 + nz * c); for (let k = 0; k <= nz; k++) B.line(x0, y, z0 + k * c, x0 + nx * c, y, z0 + k * c); }
  // programmed voxels: three drifting clusters of archive cells
  const blobs = [[1.2, .4, 1.1, 1.9], [3.3, 2.4, 2.9, 1.75], [1.6, 4.5, 3.6, 1.6], [4, 4.8, .8, 1.1]];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    if (i === 2 && k === 2) continue;
    let inb = false; for (const b of blobs) if (Math.hypot(i - b[0], (j - b[1]) * 1.25, k - b[2]) < b[3] * (.75 + r() * .45)) inb = true;
    if (!inb) continue;
    const q = r(); B.box(x0 + (i + .5) * c, y0 + j * c + .1, z0 + (k + .5) * c, c - .2, c - .2, c - .2, q < .22 ? GLASS : q < .34 ? GREY : PAPER, true);
  }
  // core, pile field, pipes
  B.cyl(x0 + 2.5 * c, .1, z0 + 2.5 * c, 1, y0 + ny * c + 1.6, GLASS, 30); for (let j = 0; j <= ny; j += 2) B.circle(x0 + 2.5 * c, y0 + j * c, z0 + 2.5 * c, 1.03, 20);
  for (let i = 0; i < 11; i++) { const px = 3.2 + r() * 3.6, pz = 2.6 + r() * 4, ph = 1.4 + r() * 4.2; B.cyl(px, .1, pz, .2 + r() * .14, ph, PAPER, 30, false, CYL8); B.circle(px, .13, pz, .5, 10); }
  B.line(-7.6, .4, -7.2, x0 + 2 * c, y0 + c, z0 + c); B.line(-7.6, .4, -4.6, x0 + c, y0 + 3 * c, z0 + 3 * c); B.line(7.5, .4, -7, x0 + 4 * c, y0 + 2 * c, z0 + 2 * c);
  // hexagonal ice panels on the walkway face
  const hx = x0 + nx * c + .5, R = 1.22, eul = new THREE.Euler(0, Math.PI / 2, 0);
  for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) {
    if ((a * 3 + b) % 5 === 4) continue;
    const zc = z0 + 1.6 + a * R * 1.78 + (b % 2) * R * .89, yc = y0 + 3.2 + b * R * 1.55;
    _q.setFromEuler(eul); _m.compose(_p.set(hx, yc, zc), _q, _s.set(R * .96, R * .96, 1)); B.geo(HEX, _m, (a + b) % 3 ? GLASS : PAPER, 0);
    const P = []; for (let k = 0; k < 6; k++) { const t = k / 6 * 6.2832; P.push([hx + .03, yc + Math.sin(t) * R, zc + Math.cos(t) * R]); } B.poly(P, true);
    B.line(hx, yc, zc, x0 + nx * c, yc, zc);
  }
};
EGG.w4 = (B, r) => {
  const cols = 8, bay = 3.7, L = (cols - 1) * bay, lv = k => 3.4 + k * 2.95, levels = 6, top = lv(levels);
  B.box(0, 0, 0, 10.6, .15, L + 2.4, PAPER, false);
  for (let i = 0; i < cols; i++) for (const sx of [-1.5, 1.5]) B.box(sx, .15, -L / 2 + i * bay, .55, top + .6, .55, SHADE, true);
  for (let k = 0; k <= levels; k++) { for (const sx of [-1.5, 1.5]) B.box(sx, lv(k) - .4, 0, .4, .4, L + 1.6, SHADE, true); for (let i = 0; i < cols; i++) B.line(-1.5, lv(k), -L / 2 + i * bay, 1.5, lv(k), -L / 2 + i * bay); }
  for (let i = 0; i < cols - 1; i += 2) { B.line(-1.5, .15, -L / 2 + i * bay, -1.5, lv(0), -L / 2 + (i + 1) * bay); B.line(1.5, .15, -L / 2 + (i + 1) * bay, 1.5, lv(0), -L / 2 + i * bay); }
  // capsules plugged into both faces
  for (let k = 0; k < levels; k++) for (let i = 0; i < cols - 1; i++) for (const s of [-1, 1]) {
    if (r() < .2) continue;
    const z = -L / 2 + (i + .5) * bay, dep = 3 + (r() < .3 ? .6 : 0), x = s * (1.78 + dep / 2);
    B.box(x, lv(k) + .12, z, dep, 2.55, bay - .5, PAPER, true);
    const fx = x + s * (dep / 2 + .03); B.quad([fx, lv(k) + 1, z - .42], [fx, lv(k) + 1, z + .42], [fx, lv(k) + 1.85, z + .42], [fx, lv(k) + 1.85, z - .42], INK, false, s > 0 ? NX : NXn);
    B.line(x - s * dep / 2, lv(k) + .12, z, x - s * (dep / 2 + .3), lv(k) + .12, z);
  }
  // service gantry and cranes on top
  B.box(0, top + .2, 0, 1.2, .5, L + 3, SHADE, true);
  for (const z of [-L / 2 + 2, L / 2 - 5]) { B.box(0, top + .7, z, .5, 3.2, .5, SHADE, true); B.beam([0, top + 3.7, z - 1.4], [0, top + 3.7, z + 5.2], .32, SHADE, 20); B.line(0, top + 3.9, z, 0, top + 5, z); B.line(0, top + 5, z, 0, top + 3.86, z + 5); B.line(0, top + 5, z, 0, top + 3.86, z - 1.3); B.line(0, top + 3.6, z + 4.6, 0, top + 1.6, z + 4.6); }
  for (const sx of [-.45, .45]) B.line(sx, top + .75, -L / 2 - 1.4, sx, top + .75, L / 2 + 1.4);
  B.box(4, .15, L / 2 - 1.6, 2.6, 2.6, 3.4); B.box(4.2, .15, -L / 2 + 4, 3, 3.4, 4.4, PAPER, true); gridFace(B, { x: 4.2, z: -L / 2 + 4, w: 3, d: 4.4, y: .15, h: 3.4 }, 0, 1.1, 1.1, false);
};

/* ───────────────────────── the city ───────────────────────── */
export function createCity(ctx, opts = {}) {
  const kit = ctx.kit, isMobile = !!ctx.isMobile;
  const seed = opts.seed ?? 20261123, r = rng(seed);
  const detailRange = opts.detailRange ?? (isMobile ? 46 : 70), FADE = 12;
  const group = new THREE.Group(); group.name = 'city';

  const solidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .92, metalness: 0, vertexColors: true });
  const lineMat = new THREE.LineBasicMaterial({ color: kit.COLORS.ink, transparent: true, opacity: .62 });
  const eggLineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .9 });   // ink + the one orange outline in a single draw
  const INKC = lin(kit.COLORS.ink), ORANGE = lin(kit.COLORS.orange);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const DET_OPACITY = .42;

  /* —— reservations: eggs, specials, the clear zones —— */
  const res = [];
  for (const side of [-1, 1]) res.push({ side, a0: 0, a1: 14.5, z0: -126.5, z1: -97.5, hard: true });
  for (const e of EGGS) res.push({ side: e.side, a0: e.a - e.hx, a1: e.a + e.hx, z0: e.z - e.hz, z1: e.z + e.hz });
  const specials = [
    { type: 'hall', side: -1, row: 1, a0: 15.5, a1: 39.5, z0: -124, z1: -93, h: 11 },
    { type: 'canopy', side: 1, row: 1, a0: 26.5, a1: 40.5, z0: -53, z1: -31, h: 17 },
    { type: 'canopy', side: -1, row: 1, a0: 30.5, a1: 44.5, z0: -151, z1: -129, h: 14 },
    { type: 'podium', side: 1, row: 1, a0: 26.5, a1: 42.5, z0: -134, z1: -108, h: 34, cv: true }
  ];
  if (!isMobile) specials.push({ type: 'canopy', side: -1, row: 1, a0: 26.5, a1: 39.5, z0: -24, z1: -4, h: 20 });
  for (const s of specials) res.push({ side: s.side, a0: s.a0, a1: s.a1, z0: s.z0, z1: s.z1 });

  const M = 1.6;
  function clip(lot) {
    for (let pass = 0; pass < 3; pass++) for (const q of res) {
      if (q.side !== lot.side || lot.a1 < q.a0 - M || lot.a0 > q.a1 + M || lot.z1 < q.z0 - M || lot.z0 > q.z1 + M) continue;
      const c = [{ ...lot, a0: q.a1 + M }, { ...lot, a1: q.a0 - M }, { ...lot, z1: q.z0 - M }, { ...lot, z0: q.z1 + M }]
        .filter(l => l.a1 - l.a0 >= 6.5 && l.z1 - l.z0 >= 6.5 && l.a0 >= 11.5).sort((u, v) => (v.a1 - v.a0) * (v.z1 - v.z0) - (u.a1 - u.a0) * (u.z1 - u.z0));
      if (!c.length) return null; lot = c[0];
    }
    return lot;
  }

  /* —— blocks and lots —— */
  const ROWS = [{ a0: 11.5, a1: 22.5, len: 10 }, { a0: 26, a1: 37.5, len: 11.5 }, { a0: 41, a1: 52, len: 12.5 }];
  const lots = [];
  for (const side of [-1, 1]) {
    let z = 14;
    while (z > -212) {
      const z1 = z, z0 = Math.max(z - (30 + r() * 14), -217);
      ROWS.forEach((row, ri) => {
        const span = z1 - z0, gap = 2, n = Math.max(1, Math.round(span / (row.len * (isMobile ? 1.5 : 1)) + (r() - .5) * .7));
        const wts = []; let tot = 0; for (let k = 0; k < n; k++) { wts.push(.75 + r() * .5); tot += wts[k]; }
        let zz = z1;
        for (let k = 0; k < n; k++) {
          const len = (span - (n - 1) * gap) * wts[k] / tot; const a1 = row.a1 + (ri === 2 ? r() * 3 : 0);
          const keep = !(isMobile && ri === 2 && r() < .45);
          if (keep) lots.push({ side, row: ri, a0: row.a0, a1, z0: zz - len, z1: zz });
          zz -= len + gap;
        }
      });
      z = z0 - 6;
    }
  }

  /* —— chunks —— */
  const BAND = 38, chunks = new Map();
  const chunkOf = (side, zc) => {
    const k = side + ':' + Math.max(0, Math.min(5, Math.floor((14 - zc) / BAND)));
    if (!chunks.has(k)) chunks.set(k, { key: k, B: new Builder() }); return chunks.get(k);
  };
  const stats = { buildings: 0, types: {} };
  const footprints = [];                     // axis-aligned boxes for walking collisions (open plazas and halls stay walkable)
  function build(lot, type, h, extra) {
    const w = lot.a1 - lot.a0, d = lot.z1 - lot.z0, ch = chunkOf(lot.side, (lot.z0 + lot.z1) / 2), B = ch.B;
    B.frame(lot.side * (lot.a0 + lot.a1) / 2, 0, (lot.z0 + lot.z1) / 2, lot.side > 0 ? Math.PI : 0);
    B.box(0, 0, 0, w + .9, .14, d + .9, PAPER, true);
    const ins = type === 'plaza' || type === 'hall' ? 0 : .3 + r() * .7;
    const V = { x: 0, z: 0, w: w - 2 * ins, d: d - 2 * ins, y: .14, h };
    T[type](B, V, r, extra);
    stats.buildings++; stats.types[type] = (stats.types[type] || 0) + 1;
    if (type !== 'plaza' && type !== 'hall') footprints.push({ x: lot.side * (lot.a0 + lot.a1) / 2, z: (lot.z0 + lot.z1) / 2, hw: w / 2 + 0.45, hd: d / 2 + 0.45 });
  }
  for (const s of specials) build(s, s.type, s.h, s.cv);
  for (let lot of lots) {
    lot = clip(lot); if (!lot) continue;
    const w = lot.a1 - lot.a0, d = lot.z1 - lot.z0;
    let type = pickType(r, lot.row);
    if (type === 'cylinder' && (Math.abs(w - d) > 4 || Math.min(w, d) < 9)) type = 'curtain';
    if (type === 'twin' && d < 15) type = 'fins';
    if (type === 'podium' && (w < 9.5 || d < 10)) type = 'bands';
    if (type === 'stepped' && w < 9) type = 'punched';
    if ((type === 'colonnade' || type === 'plaza') && (w < 9 || d < 9)) type = 'balcony';
    let h = lot.row === 0 ? 9 + r() * 12 : lot.row === 1 ? 16 + r() * 24 : 22 + Math.pow(r(), 1.4) * 36;
    if (type === 'podium') h += 8;
    if (type === 'sawtooth' || type === 'colonnade') h = 8 + r() * 3;
    if (type === 'plaza') h = 0;
    h = Math.round(h / 3.7) * 3.7 || h;
    // keep the finale's aerial sight-line (26,30,−198) → (−3,0,−112) open
    if (type !== 'plaza') {
      const dx = lot.side * (lot.a0 + lot.a1) / 2 - 26, dz = (lot.z0 + lot.z1) / 2 + 198, t = dx * -.3195 + dz * .9476, lat = Math.abs(dx * .9476 + dz * .3195);
      let cap = 1e3; if (Math.hypot(dx, dz) < 46) cap = 11; else if (t > 0 && lat < 21) cap = Math.max(8, 24 - .3 * t);
      if (h > cap) { h = cap; if (type === 'podium' || type === 'twin' || type === 'cylinder' || type === 'diagrid' || type === 'curtain' || type === 'screen') type = ['stepped', 'punched', 'sawtooth', 'bands'][Math.floor(r() * 4)]; if (type === 'stepped' && w < 9) type = 'punched'; }
    }
    build(lot, type, h);
  }

  /* —— meshes —— */
  const chunkList = [];
  for (const ch of chunks.values()) {
    const g = new THREE.Group(); g.name = 'city-chunk-' + ch.key;
    const mesh = Builder.mesh(ch.B.mass, solidMat), edges = Builder.lines(ch.B.mass, lineMat);
    if (mesh) { mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); }
    if (edges) g.add(edges);
    const detMat = new THREE.LineBasicMaterial({ color: kit.COLORS.ink, transparent: true, opacity: DET_OPACITY });
    const detMesh = Builder.mesh(ch.B.det, solidMat), detLines = Builder.lines(ch.B.det, detMat);
    if (detMesh) { detMesh.receiveShadow = true; detMesh.visible = false; g.add(detMesh); }
    if (detLines) { detLines.visible = false; g.add(detLines); }
    g.matrixAutoUpdate = false;
    group.add(g);
    chunkList.push({ root: g, box: mesh ? mesh.geometry.boundingBox.clone() : new THREE.Box3(), detMesh, detLines, detMat, mesh, edges });
    ch.B = null;
  }

  /* —— eggs —— */
  const eggs = [], hitTargets = [], eggGroup = new THREE.Group(); eggGroup.name = 'city-eggs'; group.add(eggGroup);
  const disposables = [];
  EGGS.forEach((e, i) => {
    const B = new Builder(), er = rng(seed + 97 * (i + 1));
    EGG[e.id](B, er);
    // plaque: a small board on two legs at the walkway edge of the plot
    const pz = e.hz - 2.6, px = e.hx - .25;
    B.box(px, .95, pz, .07, .62, 3.9); B.box(px, 0, pz - 1.6, .07, .95, .07, PAPER, false); B.box(px, 0, pz + 1.6, .07, .95, .07, PAPER, false);
    const root = new THREE.Group(); root.name = 'egg-' + e.id;
    root.position.set(e.side * e.a, 0, e.z); root.rotation.y = e.side > 0 ? Math.PI : 0;
    const ox = e.hx - .15, oz = e.hz - .15, oy = .05, nInk = B.mass.lines.length / 3;
    B.mass.lines.push(-ox, oy, -oz, ox, oy, -oz, ox, oy, -oz, ox, oy, oz, ox, oy, oz, -ox, oy, oz, -ox, oy, oz, -ox, oy, -oz);
    const mesh = Builder.mesh(B.mass, solidMat), lines = Builder.lines(B.mass, eggLineMat);
    const lc = new Float32Array(B.mass.lines.length);
    for (let k = 0; k < lc.length / 3; k++) lc.set(k < nInk ? INKC : ORANGE, k * 3);
    lines.geometry.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh, lines);
    const text = kit.label(e.tag, { size: .21, font: 'monoMed', letterSpacing: .04 });
    text.position.set(px + .045, 1.26, pz); text.rotation.y = Math.PI / 2; root.add(text);
    const data = { id: e.id, title: e.title, href: e.href };
    const hit = new THREE.Mesh(new THREE.BoxGeometry(e.hx * 2, e.hy, e.hz * 2), hitMat);
    hit.position.y = e.hy / 2; hit.name = 'egg-hit-' + e.id; hit.userData.egg = data; root.userData.egg = data; root.add(hit);
    eggGroup.add(root);
    eggs.push({ ...data, object: root, position: root.position.clone(), height: e.hy, text });
    hitTargets.push(hit);
    disposables.push(mesh.geometry, lines.geometry, hit.geometry, text);
  });
  group.updateMatrixWorld(true);

  /* —— LOD: facade detail only near the camera —— */
  const last = new THREE.Vector3(1e9, 0, 0); let tick = 0;
  function update(dt, t, s) {
    const cam = (s && s.camera) || ctx.camera; if (!cam) return;
    if (++tick % 4 && tick > 2) return;
    if (cam.position.distanceToSquared(last) < .04 && tick > 8 && tick % 60) return;
    last.copy(cam.position);
    for (const c of chunkList) {
      const d = c.box.distanceToPoint(cam.position), a = Math.max(0, Math.min(1, 1 - (d - detailRange) / FADE));
      if (c.detLines) { c.detLines.visible = a > .02; c.detMat.opacity = DET_OPACITY * a; }
      if (c.detMesh) c.detMesh.visible = d < detailRange + FADE * .5;
    }
    // nothing is drawn once it is wholly inside the fog
    let sc = group; while (sc.parent) sc = sc.parent;
    const cull = opts.cullDistance ?? (sc.fog && sc.fog.far ? sc.fog.far + 6 : Infinity);
    for (const c of chunkList) c.root.visible = c.box.distanceToPoint(cam.position) < cull;
    for (const e of eggs) { const d = Math.max(0, Math.hypot(e.position.x - cam.position.x, e.position.z - cam.position.z) - 14); e.object.visible = d < cull; e.text.visible = d < 46; }
  }
  update(0, 0, { camera: ctx.camera });

  function dispose() {
    for (const c of chunkList) { for (const o of [c.mesh, c.edges, c.detMesh, c.detLines]) if (o) o.geometry.dispose(); c.detMat.dispose(); }
    for (const d of disposables) d.dispose();
    solidMat.dispose(); lineMat.dispose(); eggLineMat.dispose(); hitMat.dispose();
    group.removeFromParent();
  }

  for (const e of eggs) { if (e.position) footprints.push({ x: e.position.x, z: e.position.z, hw: 3.5, hd: 3.5 }); }
  return { group, update, eggs, hitTargets, dispose, stats, footprints };
}
