// Station 03 — the arcade pavilion. Hosts the four machines from world/machines/*.
import * as THREE from 'three';
import { mat, box, edged, label, line, COLORS, damp } from '../kit.js';

const SPECS = [
  { id: 'capsule', file: 'capsule', fn: 'createCapsule', title: 'Capsule',    no: 'M.01' },
  { id: 'claw',    file: 'claw',    fn: 'createClaw',    title: 'Claw',       no: 'M.02' },
  { id: 'bricks',  file: 'bricks',  fn: 'createBricks',  title: 'Bricks',     no: 'M.03' },
  { id: 'hockey',  file: 'hockey',  fn: 'createHockey',  title: 'Air hockey', no: 'M.04' }
];
const loaders = import.meta.glob('../machines/*.js');

export function createArcade(ctx, { z = -112 } = {}) {
  const group = new THREE.Group();
  group.position.set(0, 0, z);

  // pavilion: floor slab, thin steel columns, a roof frame drawn in lines, a hung sign
  const W = 15, D = 11, H = 4.2;
  const slab = box(W, 0.14, D, mat.paper); slab.position.set(0, 0.07, 0); group.add(slab);
  const colGeo = new THREE.CylinderGeometry(0.045, 0.045, H, 10);
  for (const cx of [-W / 2 + 0.3, -W / 6, W / 6, W / 2 - 0.3]) for (const cz of [-D / 2 + 0.3, D / 2 - 0.3]) {
    if (cz > 0 && Math.abs(cx) < W / 3) continue;      // long-span front: keep the view open
    const c = new THREE.Mesh(colGeo, mat.ink); c.position.set(cx, H / 2 + 0.14, cz); c.castShadow = true; group.add(c);
  }
  const roof = box(W + 0.4, 0.1, D + 0.4, mat.paper, { cast: true }); roof.position.set(0, H + 0.19, 0); group.add(roof);
  // roof joists as lines underneath
  const joists = [];
  for (let k = -W / 2; k <= W / 2 + 0.01; k += 1.0) joists.push(new THREE.Vector3(k, H + 0.13, -D / 2), new THREE.Vector3(k, H + 0.13, D / 2));
  const j = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(joists), mat.lineSoft); j.raycast = () => {}; group.add(j);
  const sign = label('ARCADE', { size: 0.6, font: 'disp', anchorX: 'center' });
  sign.position.set(0, H + 0.24 + 0.42, D / 2 + 0.2); group.add(sign);
  const sub = label('FOUR MACHINES · EACH ONE PAYS OUT A ROOM · CLICK ONE TO PLAY', { size: 0.085, font: 'mono', color: COLORS.soft });
  sub.position.set(0, H + 0.24 + 0.08, D / 2 + 0.21); group.add(sub);
  const stripe = line(new THREE.Vector3(-W / 2 - 0.2, H + 0.13, D / 2 + 0.21), new THREE.Vector3(W / 2 + 0.2, H + 0.13, D / 2 + 0.21), mat.lineOrange); group.add(stripe);

  // machine bays across the slab, facing the approaching walkway (+Z)
  const bayX = [-5.1, -1.7, 1.7, 5.1];
  const bays = SPECS.map((spec, i) => {
    const bay = new THREE.Group(); bay.position.set(bayX[i], 0.14, spec.id === 'hockey' ? -0.6 : 0); group.add(bay);
    // floor plaque
    const pl = label(`${spec.no} · ${spec.title.toUpperCase()}`, { size: 0.09, font: 'monoMed', anchorX: 'center' });
    pl.rotation.x = -Math.PI / 2; pl.position.set(0, 0.006, spec.id === 'hockey' ? 2.0 : 1.25); bay.add(pl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 0.965, 64), mat.orange); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004;
    ring.visible = false; bay.add(ring);
    return { spec, bay, ring, machine: null, placeholder: null, hover: 0 };
  });

  async function load() {
    await Promise.all(bays.map(async b => {
      const key = `../machines/${b.spec.file}.js`;
      try {
        if (!loaders[key]) throw new Error('not built yet');
        const mod = await loaders[key]();
        const m = mod[b.spec.fn](ctx);
        b.machine = m; b.bay.add(m.group);
        b.small = []; m.group.traverse(o => { if (o.fontSize !== undefined && o.fontSize < 0.06) b.small.push(o); });   // fine print, only worth drawing up close
        b.smallShown = true;
      } catch (err) {
        console.warn(`[arcade] ${b.spec.id}:`, err.message);
        const ph = box(1.0, 1.6, 0.8, mat.paper); ph.position.y = 0.8; b.bay.add(ph);
        const t = label(`${b.spec.title}\n(in the workshop)`, { size: 0.09, font: 'mono', textAlign: 'center' }); t.position.set(0, 1.8, 0); b.bay.add(t);
        b.placeholder = ph;
      }
      b.bay.traverse(o => { o.userData.bay = b; });
    }));
  }

  /** world-space dock pose for bay i */
  function dockPose(i) {
    const b = bays[i]; b.bay.updateMatrixWorld(true);
    if (b.machine) {
      const g = b.machine.group; g.updateMatrixWorld(true);
      return { pos: g.localToWorld(b.machine.dock.position.clone()), look: g.localToWorld(b.machine.dock.target.clone()) };
    }
    return { pos: b.bay.localToWorld(new THREE.Vector3(0, 1.6, 2.4)), look: b.bay.localToWorld(new THREE.Vector3(0, 1.0, 0)) };
  }

  const bayPos = new THREE.Vector3();
  function update(dt, t, { near, activeIdx, hoverIdx, camera }) {
    bays.forEach((b, i) => {
      b.hover = damp(b.hover, hoverIdx === i && activeIdx < 0 ? 1 : 0, 10, dt);
      b.ring.visible = b.hover > 0.02 || activeIdx === i;
      b.ring.scale.setScalar(1 + b.hover * 0.06);
      if (b.machine) b.machine.update(dt, t, { active: activeIdx === i, near: activeIdx === i ? 1 : near });
      if (b.small && camera) {
        b.bay.getWorldPosition(bayPos);
        const show = activeIdx === i || camera.position.distanceTo(bayPos) < 6.5;
        if (show !== b.smallShown) { b.small.forEach(o => { if (show) o.visible = o.userData._vis !== false; else { o.userData._vis = o.visible; o.visible = false; } }); b.smallShown = show; }
      }
    });
  }

  return {
    group, bays, load, dockPose, update,
    overview: () => ({ pos: group.localToWorld(new THREE.Vector3(0.3, 2.9, 11.0)), look: group.localToWorld(new THREE.Vector3(0.3, 0.95, -0.8)) }),
    hitTargets: () => bays.map(b => b.bay)
  };
}
