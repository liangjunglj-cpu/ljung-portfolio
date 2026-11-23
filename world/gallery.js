// Art + field notes, set into the edge of the city between the trees and the buildings:
// framed panels on stands, rotating three-sided billboards (trilons), a washing line of field-note
// cards, and an easel. Every image is clickable (userData.art → the host opens the viewer).
import * as THREE from 'three';
import { mat, box, label, line, COLORS, damp } from './kit.js';

const loader = new THREE.TextureLoader();
const cache = new Map();
function imageMat(src, renderer) {
  if (!cache.has(src)) {
    const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace;
    if (renderer) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    cache.set(src, new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  }
  return cache.get(src);
}
const fit = (it, maxW, maxH) => { const a = it.w / it.h; let w = maxW, h = w / a; if (h > maxH) { h = maxH; w = h * a; } return { w, h }; };

/** a white mount + thin ink frame + the picture, centred at the origin, facing +Z */
function framed(it, maxW, maxH, renderer, { matte = 0.06, depth = 0.03 } = {}) {
  const g = new THREE.Group();
  const { w, h } = fit(it, maxW, maxH);
  const board = box(w + matte * 2, h + matte * 2, depth, mat.paper); board.position.z = -depth / 2; g.add(board);
  const t = 0.022;
  for (const [fw, fh, fx, fy] of [[w + matte * 2 + t * 2, t, 0, h / 2 + matte + t / 2], [w + matte * 2 + t * 2, t, 0, -(h / 2 + matte + t / 2)],
    [t, h + matte * 2, -(w / 2 + matte + t / 2), 0], [t, h + matte * 2, w / 2 + matte + t / 2, 0]]) {
    const b = box(fw, fh, depth + 0.01, mat.ink, { edges: false, cast: false }); b.position.set(fx, fy, -depth / 2); g.add(b);
  }
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), imageMat(it.src, renderer));
  plane.position.z = 0.002; plane.userData.art = it; g.add(plane);
  return { g, plane, w, h };
}

export function createGallery(ctx, ART, { x = 9.4 } = {}) {
  const group = new THREE.Group();
  const units = [], hit = [], colliders = [];
  const R = ctx.renderer;

  // where things stand along the walk (z, side): kept clear of stations, trees and the props
  const SLOTS = [
    { z: -1, side: -1, kind: 'panel', i: 0 }, { z: -9, side: 1, kind: 'trilon', i: 0 },
    { z: -22, side: -1, kind: 'panel', i: 1 }, { z: -34, side: 1, kind: 'panel', i: 2 },
    { z: -45, side: -1, kind: 'panel', i: 3 }, { z: -56, side: 1, kind: 'notes' },
    { z: -67, side: -1, kind: 'panel', i: 4 }, { z: -79, side: 1, kind: 'panel', i: 5 },
    { z: -91, side: -1, kind: 'easel' }, { z: -128, side: 1, kind: 'panel', i: 6 },
    { z: -134, side: -1, kind: 'trilon', i: 1 }, { z: -152, side: -1, kind: 'panel', i: 7 },
    { z: -184, side: 1, kind: 'panel', i: 8 }
  ];

  for (const s of SLOTS) {
    const root = new THREE.Group();
    root.position.set(s.side * x, 0, s.z);
    root.rotation.y = s.side < 0 ? 0.93 : -0.93;            // turned toward the walkway and the approach
    group.add(root);
    const u = { root, z: s.z, kind: s.kind, items: [], hov: 0, hovered: false, t0: Math.random() * 10 };

    if (s.kind === 'panel') {
      const it = ART.panels[s.i];
      const f = framed(it, 1.9, 1.75, R);
      const lift = 0.62;
      f.g.position.y = lift + f.h / 2 + 0.06; root.add(f.g);
      for (const sx of [-1, 1]) { const leg = box(0.03, lift + f.h * 0.7, 0.03, mat.ink, { edges: false }); leg.position.set(sx * f.w * 0.32, (lift + f.h * 0.7) / 2, -0.06); root.add(leg); }
      const foot = box(f.w * 0.8, 0.03, 0.36, mat.paper); foot.position.set(0, 0.015, -0.06); root.add(foot);
      const k = label('ART · @LJUNGART', { size: 0.055, font: 'monoMed', anchorX: 'left', anchorY: 'bottom', color: COLORS.soft });
      k.position.set(-f.w / 2 - 0.06, lift + f.h + 0.2, 0.01); root.add(k);
      const cap = label(it.cap, { size: 0.058, font: 'mono', anchorX: 'left', anchorY: 'top', maxWidth: f.w + 0.12, lineHeight: 1.35, color: COLORS.ink });
      cap.position.set(-f.w / 2 - 0.06, lift - 0.04, 0.01); root.add(cap);
      const under = new THREE.Mesh(new THREE.PlaneGeometry(f.w + 0.12, 0.012), mat.orange); under.position.set(0, lift - 0.0, 0.012); under.scale.x = 0.001; root.add(under);
      u.frame = f.g; u.under = under; u.items.push(it); hit.push(f.plane);
    }

    if (s.kind === 'trilon') {
      const faces = ART.trilons[s.i], fw = 1.45, fh = 1.55, apo = fw / (2 * Math.tan(Math.PI / 3));
      const ped = box(1.0, 0.75, 1.0, mat.paper); ped.position.y = 0.375; root.add(ped);
      const capRing = box(1.04, 0.04, 1.04, mat.orange, { edges: false }); capRing.position.y = 0.77; root.add(capRing);
      const prism = new THREE.Group(); prism.position.y = 0.8 + fh / 2 + 0.05; root.add(prism);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(fw / Math.sqrt(3), fw / Math.sqrt(3), fh + 0.1, 3), mat.paper);
      body.castShadow = true; body.receiveShadow = true; prism.add(body);
      faces.forEach((it, k) => {
        const th = Math.PI / 3 + k * 2 * Math.PI / 3;
        const f = framed(it, fw - 0.16, fh - 0.12, R, { matte: 0.03, depth: 0.012 });
        f.g.position.set(Math.sin(th) * (apo + 0.008), 0, Math.cos(th) * (apo + 0.008)); f.g.rotation.y = th;
        prism.add(f.g); hit.push(f.plane); u.items.push(it);
      });
      const top = box(0.12, 0.25, 0.12, mat.ink, { edges: false }); top.position.y = 0.8 + fh + 0.25; root.add(top);
      const cap = label('', { size: 0.058, font: 'mono', anchorX: 'center', anchorY: 'middle', maxWidth: 0.92, textAlign: 'center', lineHeight: 1.3 });
      cap.position.set(0, 0.42, 0.505); root.add(cap);
      const kick = label('STUDIES · ROTATING', { size: 0.05, font: 'monoMed', anchorX: 'center', color: COLORS.soft });
      kick.position.set(0, 0.66, 0.505); root.add(kick);
      u.prism = prism; u.cap = cap; u.angle = 0; u.target = 0; u.face = 0; u.next = 4 + Math.random() * 2;
      // the face that points at the walkway first: θ = π/3 faces local (+sin, +cos) → turn so face 0 points at +Z
      u.base = -Math.PI / 3;
      cap.text = faces[0].cap; cap.sync();
    }

    if (s.kind === 'notes') {
      const span = 3.6, topY = 2.25;
      for (const sx of [-1, 1]) { const post = box(0.05, topY + 0.1, 0.05, mat.ink, { edges: false }); post.position.set(sx * span / 2, (topY + 0.1) / 2, 0); root.add(post); }
      const pts = []; for (let i = 0; i <= 16; i++) { const f = i / 16; pts.push(new THREE.Vector3(-span / 2 + f * span, topY - Math.sin(f * Math.PI) * 0.12, 0)); }
      const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat.line); cable.raycast = () => {}; root.add(cable);
      const k = label('FIELD NOTES · PEGGED UP', { size: 0.06, font: 'monoMed', anchorX: 'left', anchorY: 'bottom' });
      k.position.set(-span / 2, topY + 0.14, 0); root.add(k);
      u.cards = ART.notes.map((it, i) => {
        const fx = -span / 2 + (i + 0.5) * span / ART.notes.length;
        const sag = Math.sin(((fx + span / 2) / span) * Math.PI) * 0.12;
        const pivot = new THREE.Group(); pivot.position.set(fx, topY - sag, 0.02); root.add(pivot);
        const f = framed(it, 0.78, 0.66, R, { matte: 0.04, depth: 0.008 });
        f.g.position.y = -f.h / 2 - 0.1; pivot.add(f.g);
        const clip = box(0.04, 0.09, 0.03, mat.orange, { edges: false, cast: false }); clip.position.y = -0.03; pivot.add(clip);
        hit.push(f.plane); u.items.push(it);
        return { pivot, it, hov: 0, ph: i * 1.7 };
      });
    }

    if (s.kind === 'easel') {
      const it = ART.easel;
      const f = framed(it, 0.95, 1.15, R, { matte: 0.04, depth: 0.025 });
      const legGeo = new THREE.BoxGeometry(0.035, 2.0, 0.035);
      for (const [lx, lz, rx, rz] of [[-0.42, 0.12, -0.18, 0.1], [0.42, 0.12, 0.18, -0.1], [0, -0.45, 0.25, 0]]) {
        const leg = new THREE.Mesh(legGeo, mat.ink); leg.position.set(lx, 0.98, lz); leg.rotation.set(rx, 0, rz); leg.castShadow = true; root.add(leg);
      }
      const tray = box(0.95, 0.03, 0.09, mat.paper); tray.position.set(0, 0.86, 0.14); root.add(tray);
      f.g.position.set(0, 0.88 + f.h / 2 + 0.05, 0.11); f.g.rotation.x = -0.12; root.add(f.g);
      const stool = box(0.36, 0.5, 0.36, mat.paper); stool.position.set(0.15, 0.25, 0.85); root.add(stool);
      const cap = label(it.cap, { size: 0.058, font: 'mono', anchorX: 'left', anchorY: 'top', maxWidth: 1.2, color: COLORS.ink });
      cap.position.set(-0.6, 0.78, 0.25); root.add(cap);
      u.frame = f.g; hit.push(f.plane); u.items.push(it);
    }

    units.push(u);
    colliders.push({ x: s.side * x, z: s.z, r: s.kind === 'notes' ? 1.9 : 0.95 });
  }

  // label every unit with its hover owner so the host can light it up
  units.forEach(u => u.root.traverse(o => { o.userData.galleryUnit = u; }));

  const STEP = 2 * Math.PI / 3;
  function update(dt, t, { camera, hoverId } = {}) {
    const cz = camera ? camera.position.z : 0, aerial = camera ? camera.position.y > 9 : false;
    for (const u of units) {
      u.root.visible = !aerial && Math.abs(cz - u.z) < 60;          // too small to read from the air
      if (!u.root.visible) continue;
      const on = u.items.some(it => it.id === hoverId);
      u.hov = damp(u.hov, on ? 1 : 0, 9, dt);
      if (u.kind === 'panel' || u.kind === 'easel') {
        u.frame.scale.setScalar(1 + u.hov * 0.05);
        if (u.under) u.under.scale.x = Math.max(0.001, u.hov);
      }
      if (u.kind === 'trilon') {
        if (!on && !ctx.reducedMotion) {
          u.next -= dt;
          if (u.next <= 0) { u.next = 5; u.face = (u.face + 1) % 3; u.target += STEP; u.cap.text = u.items[u.face].cap; u.cap.sync(); }
        }
        u.angle = damp(u.angle, u.target, 4, dt);
        u.prism.rotation.y = u.base - u.angle;
      }
      if (u.kind === 'notes') {
        for (const c of u.cards) {
          c.hov = damp(c.hov, c.it.id === hoverId ? 1 : 0, 9, dt);
          const sway = ctx.reducedMotion ? 0 : Math.sin(t * 1.4 + c.ph) * 0.06;
          c.pivot.rotation.z = sway * (1 - c.hov);
          c.pivot.rotation.x = -0.35 * c.hov + (ctx.reducedMotion ? 0 : Math.sin(t * 0.9 + c.ph) * 0.03);
          c.pivot.scale.setScalar(1 + c.hov * 0.22);
        }
      }
    }
  }
  const order = [...ART.panels, ...ART.trilons.flat(), ...ART.notes, ART.easel];
  return { group, update, hitTargets: hit, colliders, order };
}
