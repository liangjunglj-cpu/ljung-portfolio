// Station 04 — the archive cabinet: twelve drawers, one per project. Hover pulls a drawer, click enters.
import * as THREE from 'three';
import { mat, box, label, COLORS, damp } from '../kit.js';

export function createArchive(items, { z = -142 } = {}) {
  const group = new THREE.Group(); group.position.set(0, 0, z);
  const cols = 4, rows = 3, dw = 1.5, dh = 0.62, gap = 0.04, depth = 0.9;
  const W = cols * dw + (cols + 1) * gap, H = rows * dh + (rows + 1) * gap, baseH = 0.5;

  // carcass
  const back = box(W, H, 0.05, mat.paper); back.position.set(0, baseH + H / 2, -depth / 2); group.add(back);
  for (const sx of [-W / 2, W / 2]) { const s = box(0.05, H, depth, mat.paper); s.position.set(sx, baseH + H / 2, 0); group.add(s); }
  const top = box(W + 0.05, 0.05, depth, mat.paper); top.position.set(0, baseH + H, 0); group.add(top);
  const plinth = box(W - 0.2, baseH, depth - 0.1, mat.ink, { edges: false }); plinth.position.set(0, baseH / 2, 0); group.add(plinth);
  const head = label('INDEX', { size: 0.42, font: 'disp', anchorX: 'left', anchorY: 'bottom' });
  head.position.set(-W / 2, baseH + H + 0.12, 0); group.add(head);
  const headSub = label('TWELVE DRAWERS · 2024 — 2026 · PULL ONE OPEN', { size: 0.075, font: 'mono', anchorX: 'right', anchorY: 'bottom', color: COLORS.soft });
  headSub.position.set(W / 2, baseH + H + 0.14, 0); group.add(headSub);

  const loader = new THREE.TextureLoader();
  const drawers = items.map((it, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = -W / 2 + gap + dw / 2 + c * (dw + gap), y = baseH + H - gap - dh / 2 - r * (dh + gap);
    const g = new THREE.Group(); g.position.set(x, y, 0); group.add(g);
    const dark = i % 5 === 0;
    const body = box(dw, dh, depth - 0.06, dark ? mat.ink : mat.paper, { edges: !dark });
    body.userData.item = it; g.add(body);
    const tc = dark ? COLORS.paper : COLORS.ink;
    const no = label(it.no, { size: 0.07, font: 'mono', anchorX: 'left', anchorY: 'top', color: dark ? 0xbbbbbb : COLORS.soft });
    no.position.set(-dw / 2 + 0.08, dh / 2 - 0.07, depth / 2 - 0.02); g.add(no);
    const code = label(it.code, { size: 0.07, font: 'monoMed', anchorX: 'right', anchorY: 'top', color: tc });
    code.position.set(dw / 2 - 0.08, dh / 2 - 0.07, depth / 2 - 0.02); g.add(code);
    const ti = label(it.title, { size: 0.13, font: 'disp', anchorX: 'left', anchorY: 'bottom', maxWidth: dw - 0.16, color: tc });
    ti.position.set(-dw / 2 + 0.08, -dh / 2 + 0.16, depth / 2 - 0.02); g.add(ti);
    const cat = label(it.cat.toUpperCase(), { size: 0.055, font: 'mono', anchorX: 'left', anchorY: 'bottom', color: dark ? 0xbbbbbb : COLORS.soft });
    cat.position.set(-dw / 2 + 0.08, -dh / 2 + 0.07, depth / 2 - 0.02); g.add(cat);
    const handle = box(0.32, 0.035, 0.05, dark ? mat.paper : mat.ink, { edges: false }); handle.position.set(dw / 2 - 0.3, -dh / 2 + 0.1, depth / 2); g.add(handle);
    // the card inside, shown when pulled
    const tex = loader.load(it.img); tex.colorSpace = THREE.SRGBColorSpace;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.2, (dw - 0.2) * 0.62), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, opacity: 0 }));
    card.rotation.x = -Math.PI / 2 + 0.35; card.position.set(0, dh / 2 + 0.02, 0.05); card.visible = false; g.add(card);
    g.traverse(o => { o.userData.item = it; });
    return { it, g, card, pull: 0 };
  });

  function update(dt, t, { hoverId }) {
    for (const d of drawers) {
      const want = d.it.id === hoverId ? 1 : 0;
      d.pull = damp(d.pull, want, 9, dt);
      d.g.position.z = d.pull * 0.55;
      d.card.visible = d.pull > 0.02;
      d.card.material.opacity = d.pull;
      d.card.position.y = 0.32 / 2 + 0.02 + d.pull * 0.42;
    }
  }
  return {
    group, drawers, update,
    shot: () => ({ pos: group.localToWorld(new THREE.Vector3(0.9, 2.1, 10.2)), look: group.localToWorld(new THREE.Vector3(0, 1.35, 0)) }),
    hitTargets: () => drawers.map(d => d.g)
  };
}
