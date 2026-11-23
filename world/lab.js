// Dev harness: mount one module (?m=capsule|claw|bricks|hockey|photos) with orbit controls.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as kit from './kit.js';
import { ITEMS, PHOTOS } from './items.js';

const which = new URLSearchParams(location.search).get('m') || 'claw';
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(kit.COLORS.fog);
scene.fog = new THREE.Fog(kit.COLORS.fog, 12, 40);
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
camera.position.set(2.6, 2.2, 3.6);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0xdcdcd8, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(4, 8, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); sun.shadow.bias = -0.0005;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: kit.COLORS.ground, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(60, 60, 0xd6d6d2, 0xe6e6e2); grid.position.y = 0.001; scene.add(grid);

const log = document.getElementById('log');
const ctx = {
  THREE, kit, items: ITEMS, renderer, camera,
  isMobile: matchMedia('(pointer:coarse)').matches,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  award: (item, from) => { log.textContent += `\n${item.no} ${item.title} — ${from}`; }
};

let mod = null, active = false;
const ui = document.getElementById('ui'), hint = document.getElementById('hint'), mode = document.getElementById('mode');

async function load() {
  if (which === 'trees') {
    // a demo grove: every species, a few scales, in rows
    const m = await import('./trees.js');
    const placements = [];
    for (let i = 0; i < 18; i++) placements.push({ x: (i % 6) * 4 - 10, z: -Math.floor(i / 6) * 5, scale: 0.8 + (i % 3) * 0.2, seed: i + 1 });
    mod = m.createForest(ctx, placements);
    scene.add(mod.group);
    camera.position.set(0, 3, 12); controls.target.set(0, 2.5, -4);
    mode.textContent = 'trees · orbit to inspect';
    mod._s = () => ({ camera });
    return;
  }
  if (which === 'city') {
    const m = await import('./city.js');
    mod = m.createCity(ctx, {});
    scene.add(mod.group);
    scene.fog.near = 60; scene.fog.far = 260;
    camera.position.set(0, 18, 30); controls.target.set(0, 0, -60); camera.far = 600; camera.updateProjectionMatrix();
    mode.textContent = 'city · orbit; the walkway runs along x = 0 from z = +8 to z = −190';
    mod._s = () => ({ camera });
    const walk = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.01, 8), new THREE.Vector3(0, 0.01, -190)]), kit.mat.lineOrange);
    scene.add(walk);
    return;
  }
  if (which === 'photos') {
    const m = await import('./photos.js');
    mod = m.createPhotoField(ctx, PHOTOS);
    scene.add(mod.group);
    camera.position.set(0, 1.7, 4); controls.target.set(0, 1.5, -4);
    mode.textContent = 'photos · scroll wheel over the canvas = field progress';
    let p = 0, v = 0;
    canvas.addEventListener('wheel', e => { v = e.deltaY * 0.0006; p = kit.clamp(p + v, 0, 1); });
    mod._s = () => ({ progress: p, velocity: (v *= 0.9) });
    return;
  }
  const factory = { capsule: 'createCapsule', claw: 'createClaw', bricks: 'createBricks', hockey: 'createHockey' }[which];
  const m = await import(`./machines/${which}.js`);
  mod = m[factory](ctx);
  scene.add(mod.group);
  hint.textContent = mod.hint;
  mod.controls.forEach(b => {
    const el = document.createElement('button'); el.textContent = b.label; if (b.primary) el.className = 'primary';
    if (b.hold) {
      el.onpointerdown = () => mod.hold(b.act, true);
      el.onpointerup = el.onpointerleave = () => mod.hold(b.act, false);
    } else el.onclick = () => mod.press(b.act);
    ui.appendChild(el);
  });
  const dockBtn = document.createElement('button'); dockBtn.textContent = 'DOCK / UNDOCK';
  dockBtn.onclick = () => {
    active = !active; mod.setActive(active); controls.enabled = !active;
    if (active) { camera.position.copy(mod.group.localToWorld(mod.dock.position.clone())); controls.target.copy(mod.group.localToWorld(mod.dock.target.clone())); camera.lookAt(controls.target); }
    mode.textContent = `${which} · ${active ? 'ACTIVE (input to machine)' : 'orbit'}`;
  };
  ui.appendChild(dockBtn);
  mode.textContent = `${which} · orbit — press DOCK to play`;
}

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
function pe(type, e) {
  if (!mod || !active || !mod.pointer) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(mod.group, true)[0] || null;
  mod.pointer({ type, ray: ray.ray.clone(), hit });
}
canvas.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; pe('down', e); });
canvas.addEventListener('pointermove', e => pe('move', e));
canvas.addEventListener('pointerup', e => {
  pe('up', e);
  if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && performance.now() - downAt.t < 400) pe('tap', e);
  downAt = null;
});
addEventListener('keydown', e => { if (mod && active && mod.key && mod.key(e.key, true)) e.preventDefault(); });
addEventListener('keyup', e => { if (mod && active && mod.key && mod.key(e.key, false)) e.preventDefault(); });

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30), t = clock.elapsedTime;
  controls.update();
  if (mod) {
    if (mod._s) mod.update(dt, t, mod._s());
    else mod.update(dt, t, { active, near: 1 });
  }
  renderer.render(scene, camera);
});
load().catch(err => { mode.textContent = 'LOAD ERROR: ' + err.message; console.error(err); });
window.__lab = { scene, camera, get mod() { return mod; } };
