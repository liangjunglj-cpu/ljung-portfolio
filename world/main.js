// LIANG JUNG — the world. Scroll walks a camera through a white architectural model:
// entrance → four film stands → the field of photographs → the arcade pavilion → the archive cabinet → an aerial finale.
import './world.css';
import * as THREE from 'three';
import Lenis from 'lenis';
import * as kit from './kit.js';
import { ITEMS, LATEST, PHOTOS, ART, byId } from './items.js';
import { createGallery } from './gallery.js';
import { createPhoto, createPhotoField } from './photos.js';
import { createExplore } from './explore.js';
import { createEnv } from './env.js';
import { createLatest } from './stations/latest.js';
import { createArcade } from './stations/arcade.js';
import { createArchive } from './stations/archive.js';

const $ = s => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const isMobile = matchMedia('(max-width: 720px), (pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ———————————————— plain index list (works without WebGL too) ———————————————— */
$('#idx').innerHTML = ITEMS.map(it =>
  `<li id="li-${it.id}"><span class="n">${it.no}</span><a href="${it.href}">${esc(it.title)}</a><span class="c">${esc(it.cat)}</span></li>`).join('');

/* ———————————————— prize ticket ———————————————— */
const KEY = 'lj-arcade';
let got = new Set();
try { const a = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(a)) got = new Set(a.filter(id => byId[id])); } catch (e) {}
const ticket = $('#ticket');
function renderCount() {
  $('#tk-count').textContent = `${got.size} / ${ITEMS.length} collected`;
  $('#tk-dots').innerHTML = ITEMS.map(it => `<i class="${got.has(it.id) ? 'on' : ''}" title="${esc(it.title)}"></i>`).join('');
}
renderCount();
kit.bus.addEventListener('award', e => {
  const { item: it, from } = e.detail;
  got.add(it.id);
  try { localStorage.setItem(KEY, JSON.stringify([...got])); } catch (err) {}
  $('#tk-no').textContent = '№ ' + it.no;
  $('#tk-body').innerHTML = `<p class="fr">${esc(from)} · ${esc(it.cat)} · ${it.yr}</p><h4>${esc(it.title)}</h4>` +
    `<img src="${it.img}" alt=""><p>${esc(it.about)}</p><a href="${it.href}">Enter the room →</a>`;
  ticket.hidden = false; ticket.style.animation = 'none'; void ticket.offsetWidth; ticket.style.animation = '';
  renderCount();
  document.querySelectorAll('.idx li.hot').forEach(li => li.classList.remove('hot'));
  const li = document.getElementById('li-' + it.id); if (li) li.classList.add('hot');
});
$('#tk-x').addEventListener('click', () => { ticket.hidden = true; });

/* ———————————————— chapters: visibility, station HUD, nav ———————————————— */
const chapters = [...document.querySelectorAll('.ch')];
const navLinks = [...document.querySelectorAll('.nav-links a')];
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    e.target.classList.toggle('vis', e.isIntersecting);
    if (e.isIntersecting) {
      const el = e.target;
      $('#hs-no').textContent = el.dataset.station; $('#hs-name').textContent = el.dataset.name;
      navLinks.forEach(a => a.classList.toggle('on', a.dataset.n === el.dataset.station));
    }
  }), { rootMargin: '-45% 0px -45% 0px' });
  chapters.forEach(c => io.observe(c));
} else chapters.forEach(c => c.classList.add('vis'));
// mobile: let each sticky placard know its own height
function measurePlacards() { document.querySelectorAll('.plac').forEach(p => p.style.setProperty('--ph', p.offsetHeight + 'px')); }
// phones: placards start compact (title + link); MORE opens the text, so the world stays visible
if (matchMedia('(max-width: 720px)').matches) {
  document.querySelectorAll('.plac:not(.plac-intro):not(.plac-contact)').forEach(p => {
    if (!p.querySelector(':scope > p:not(.pk), .meta, .figs, .idx')) return;
    p.classList.add('min');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'more'; b.textContent = 'MORE +'; b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', () => {
      const open = !p.classList.toggle('min');
      b.textContent = open ? 'LESS −' : 'MORE +'; b.setAttribute('aria-expanded', String(open));
      measurePlacards();
    });
    const head = p.querySelector('h2, h3'); if (head) head.after(b);
  });
}
measurePlacards(); addEventListener('resize', measurePlacards);

/* ———————————————— WebGL or the plain page ———————————————— */
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no-gl');
  chapters.forEach(c => c.classList.add('vis'));
}
if (renderer) boot();

function boot() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isMobile ? (innerWidth < innerHeight ? 66 : 54) : 40, innerWidth / innerHeight, 0.05, 300);
  camera.position.set(0, 1.7, 8.5);
  const env = createEnv(scene, { isMobile });

  const ctx = { THREE, kit, items: ITEMS, award: kit.award, renderer, camera, isMobile, reducedMotion };
  env.ctx = ctx;
  env.ready.then(() => { culls = null; });

  /* —— loader —— */
  const ldBar = $('#ld-bar'), ldPct = $('#ld-pct');
  let loadedFrac = 0;
  THREE.DefaultLoadingManager.onProgress = (url, n, total) => { loadedFrac = n / total; ldBar.style.width = (loadedFrac * 100) + '%'; ldPct.textContent = Math.round(loadedFrac * 100) + '%'; };
  const t0 = performance.now();
  let loaderDone = false;
  function finishLoader() { if (loaderDone) return; loaderDone = true; $('#loader').classList.add('done'); }
  setTimeout(finishLoader, 6000);

  /* —— entrance: the name, standing on the ground like a sculpture —— */
  const entrance = new THREE.Group(); scene.add(entrance);
  const title = kit.label('LIANG\nJUNG', { size: 2.05, font: 'disp', anchorX: 'left', anchorY: 'bottom', lineHeight: 0.86, letterSpacing: -0.045 });
  title.position.set(-4.9, 0.0, -4.2); title.castShadow = true; entrance.add(title);
  title.sync(() => {
    const b = title.textRenderInfo && title.textRenderInfo.blockBounds;
    if (!b) return;
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), kit.mat.orange);
    dot.position.set(title.position.x + b[2] + 0.18, 0.11, title.position.z); dot.castShadow = true; entrance.add(dot);
  });
  const plate = kit.label('ARCHITECTURE × AI × ART  —  SUTD · B.ARCH ’28  —  SINGAPORE / LAUSANNE', { size: 0.11, font: 'mono', anchorX: 'left', color: kit.COLORS.ink });
  plate.rotation.x = -Math.PI / 2; plate.position.set(-4.9, 0.006, -3.3); entrance.add(plate);
  const plinthLine = kit.line(V(-5.1, 0.006, -3.6), V(4.6, 0.006, -3.6), kit.mat.lineOrange); entrance.add(plinthLine);
  const scale = kit.label('0      1      2      5 M', { size: 0.08, font: 'mono', anchorX: 'left', color: kit.COLORS.soft });
  scale.rotation.x = -Math.PI / 2; scale.position.set(1.4, 0.006, -2.4); entrance.add(scale);
  const north = kit.label('N ↑', { size: 0.14, font: 'monoMed', anchorX: 'left' }); north.rotation.x = -Math.PI / 2; north.position.set(-3.7, 0.006, -2.4); entrance.add(north);

  /* —— stations —— */
  const latest = createLatest(LATEST, { z0: -17, gap: 11, reducedMotion }); scene.add(latest.group);
  const FIELD_Z = -60;

  const arcade = createArcade(ctx, { z: -112 }); scene.add(arcade.group);
  const archive = createArchive(ITEMS, { z: -142 }); scene.add(archive.group);
  const gallery = createGallery(ctx, ART); scene.add(gallery.group);      // art + field notes in the city edge

  /* —— finale: the sign-off, written on the ground for the aerial view —— */
  const fin = kit.label('LET’S BUILD\nSOMETHING ODD.', { size: 2.3, font: 'disp', anchorX: 'center', anchorY: 'middle', lineHeight: 0.9, letterSpacing: -0.04, textAlign: 'center' });
  fin.rotation.set(-Math.PI / 2, 0, Math.PI); fin.position.set(0, 0.01, -170); scene.add(fin);   // reads from the far side, toward the aerial camera
  const finLine = kit.line(V(-9, 0.01, -175.5), V(9, 0.01, -175.5), kit.mat.lineOrange); scene.add(finLine);

  // photographs: the field of prints, one at the entrance, one at the sign-off
  const field = createPhotoField(ctx, PHOTOS);
  field.group.position.z = FIELD_Z; scene.add(field.group);
  const fieldLen = field.length;
  const entrancePrint = createPhoto(ctx, PHOTOS[0], { height: 2.6, effect: 'portra', index: 0, lift: 0.45 });
  entrancePrint.mesh.position.set(3.9, 0, -3.9); entrancePrint.mesh.rotation.y = -0.32; scene.add(entrancePrint.mesh);
  const finalePrint = createPhoto(ctx, PHOTOS[6], { height: 2.8, effect: 'gold', index: 12, lift: 0.5 });
  finalePrint.mesh.position.set(7.5, 0, -168); finalePrint.mesh.rotation.y = Math.PI - 0.5; scene.add(finalePrint.mesh);
  arcade.load().then(() => { layout(); });

  /* —— what to cull, by z extent (z0 near end, z1 far end) —— */
  let culls = null;
  function cullList() {
    if (culls) return culls;
    const list = [
      { obj: entrance, z0: 2, z1: -8, back: true },
      ...latest.screens.map(s => ({ obj: s.root, z0: s.root.position.z + 3, z1: s.root.position.z - 3 })),
      { obj: arcade.group, z0: -104, z1: -120 },
      { obj: archive.group, z0: -138, z1: -146 },
      { obj: fin, z0: -164, z1: -176 }
    ];
    list.push({ obj: field.group, z0: FIELD_Z + 2, z1: FIELD_Z - fieldLen - 2 });
    list.push({ obj: entrancePrint.mesh, z0: 2, z1: -8, back: true });
    list.push({ obj: finalePrint.mesh, z0: -164, z1: -172 });
    culls = list;
    return list;
  }

  /* ———————————————— camera path from the chapters ———————————————— */
  let shots = [], shotScroll = [], posCurve, lookCurve, latestFirst = 0, maxScroll = 1;
  const secTop = el => el.getBoundingClientRect().top + scrollY;
  function latestShot(i) {
    const s = latest.screens[i]; s.root.updateMatrixWorld(true);
    const placRight = i % 2 === 0;
    const camL = s.camLocal.clone().add(V(placRight ? -0.35 : 0.35, 0, 0.2));
    if (isMobile) { const aspect = innerWidth / innerHeight, hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect); camL.x = 0; camL.z = Math.max(camL.z, (s.sw + 0.6) / (2 * Math.tan(hf / 2))); }
    const pos = s.root.localToWorld(camL);
    const look = s.root.localToWorld(s.lookLocal.clone().add(V(isMobile ? 0 : (placRight ? 0.95 : -0.95), isMobile ? -1.55 : 0, 0)));
    return { pos, look };
  }
  function layout() {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const L = fieldLen, F0 = FIELD_Z;
    const A = arcade.overview(), X = archive.shot();
    if (innerWidth / innerHeight < 1) {          // portrait: back the camera off until the subject fits the width
      const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * innerWidth / innerHeight);
      const fit = (shot, width, drop) => { const dir = shot.pos.clone().sub(shot.look); const d = (width / 2) / Math.tan(hf / 2); dir.setLength(Math.max(dir.length(), d)); shot.pos.copy(shot.look).add(dir); shot.look.y -= drop; };
      fit(X, 7.2, 1.3); fit(A, 12.6, 1.6);
    }
    const mob = isMobile ? -0.8 : 0;
    const list = [
      ['#s-intro', 0.00, isMobile ? V(-0.6, 3.4, 21) : V(0.9, 2.0, 10.5), isMobile ? V(-0.7, 0.2, -6) : V(-0.4, 1.45, -6)],
      ['#s-intro', 0.62, V(2.6, 1.35, 1.6), V(-0.6, 1.5 + mob * 0.5, -8)],
      ['#s-latest', 0.55, V(0, 2.4, -6), V(0, 1.4, -24)],
      ...LATEST.map((w, i) => { const s = latestShot(i); return [`#w-${w.id}`, 0.4, s.pos, s.look]; }),
      ['#s-field', 0.02, V(0, 1.7, F0 + 7), V(0, 1.55 + mob * 0.4, F0 - 6)],
      ['#s-field', 0.50, V(0.5, 1.6, F0 - L * 0.48), V(-0.2, 1.5 + mob * 0.4, F0 - L * 0.48 - 9)],
      ['#s-field', 0.98, V(0, 1.75, F0 - L + 1), V(0, 1.4 + mob * 0.4, F0 - L - 12)],
      ['#s-arcade', 0.22, A.pos.clone().add(V(0, 0.6, 5)), A.look],
      ['#s-arcade', 0.48, A.pos, A.look.clone().add(V(0, mob * 0.6, 0))],
      ['#s-index', 0.20, V(2.6, 2.4, -127), V(0, 1.6, -142)],
      ['#s-index', 0.62, X.pos, X.look.clone().add(V(isMobile ? 0 : 1.6, mob, 0))],
      ['#s-contact', 0.25, V(3, 7.5, -188), V(0, 0, -168)],
      ['#s-contact', 0.85, V(isMobile ? 20 : 26, 30, -198), V(-3, 0, -112)]
    ];
    shots = list.map(([sel, at, pos, look]) => {
      const el = $(sel);
      const sp = el ? Math.min(maxScroll, Math.max(0, secTop(el) + at * el.offsetHeight - innerHeight * 0.15)) : 0;
      return { sel, sp, pos, look };
    });
    shots[0].sp = 0;
    for (let i = 1; i < shots.length; i++) shots[i].sp = Math.max(shots[i].sp, shots[i - 1].sp + 1);
    shotScroll = shots.map(s => s.sp);
    posCurve = new THREE.CatmullRomCurve3(shots.map(s => s.pos), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(shots.map(s => s.look), false, 'centripetal');
    latestFirst = shots.findIndex(s => s.sel === '#w-almond');
  }
  const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;  // lingers at each shot
  const pathPos = new THREE.Vector3(), pathLook = new THREE.Vector3();
  function sample(scroll) {
    const n = shots.length; let k = 0;
    while (k < n - 2 && scroll > shotScroll[k + 1]) k++;
    const local = THREE.MathUtils.clamp((scroll - shotScroll[k]) / (shotScroll[k + 1] - shotScroll[k]), 0, 1);
    const u = (k + ease(local)) / (n - 1);
    posCurve.getPoint(u, pathPos); lookCurve.getPoint(u, pathLook);
    return k + local;
  }

  /* ———————————————— smooth scroll ———————————————— */
  const lenis = reducedMotion ? null : new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
  const getScroll = () => lenis ? lenis.scroll : scrollY;
  const getVel = () => lenis ? lenis.velocity : 0;
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const el = $(a.getAttribute('href')); if (!el) return;
    e.preventDefault();
    const y = a.getAttribute('href') === '#s-intro' ? 0 : secTop(el) + el.offsetHeight * 0.4 - innerHeight * 0.15;
    if (lenis) lenis.scrollTo(y, { duration: 2.2 }); else scrollTo(0, y);
  }));

  /* ———————————————— pointer: hover, click, parallax ———————————————— */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), par = new THREE.Vector2();
  let pointerIn = false, needPick = false, hover = null, down = null;
  const tag = $('#hover-tag');
  function setNdc(e) { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }
  function pickables() { return [...latest.hitTargets, ...arcade.hitTargets(), ...archive.hitTargets(), ...gallery.hitTargets, ...((env.city && env.city.hitTargets) || [])]; }
  function describe(obj) {
    for (let o = obj; o; o = o.parent) {
      if (o.userData.kind === 'screen') { const w = LATEST[o.userData.idx]; return { kind: 'screen', idx: o.userData.idx, label: `${w.no} ${w.title} — open the room` }; }
      if (o.userData.bay) { const b = o.userData.bay; return { kind: 'bay', idx: arcade.bays.indexOf(b), label: `${b.spec.no} ${b.spec.title} — click to play` }; }
      if (o.userData.item) { const it = o.userData.item; return { kind: 'drawer', id: it.id, label: `${it.no} ${it.title} — open` }; }
      if (o.userData.egg) { const g = o.userData.egg; return { kind: 'egg', id: g.id, href: g.href, label: `EGG · ${g.title}` }; }
      if (o.userData.art) { const a = o.userData.art; return { kind: 'art', id: a.id, art: a, label: `ART · ${a.cap.length > 48 ? a.cap.slice(0, 46) + '…' : a.cap}` }; }
    }
    return null;
  }
  let lastType = 'mouse', touchHoverUntil = 0;
  const sameTarget = (a, b) => a && b && a.kind === b.kind && a.idx === b.idx && a.id === b.id;
  canvas.addEventListener('pointermove', e => {
    lastType = e.pointerType || 'mouse';
    if (explore.on && dock.idx < 0) explore.move(e);
    if (lastType !== 'mouse' && dock.idx < 0) return;           // touch moves are scrolls (or explore thumbs), not hovers
    setNdc(e); pointerIn = true; needPick = true;
    par.set(ndc.x, ndc.y);
    tag.style.left = e.clientX + 'px'; tag.style.top = e.clientY + 'px';
    if (dock.idx >= 0) machinePointer('move', e);
  });
  canvas.addEventListener('pointerleave', () => { pointerIn = false; hover = null; tag.classList.remove('on'); document.body.classList.remove('pointing'); });
  canvas.addEventListener('pointerdown', e => {
    setNdc(e); down = { x: e.clientX, y: e.clientY, t: performance.now(), joy: false };
    if (dock.idx >= 0) { canvas.setPointerCapture(e.pointerId); machinePointer('down', e); }
    else if (explore.on) { canvas.setPointerCapture(e.pointerId); explore.down(e); down.joy = e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45; }
  });
  canvas.addEventListener('pointerup', e => {
    setNdc(e);
    const isTap = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 450;
    const wasJoy = down && down.joy;
    down = null;
    if (dock.idx >= 0) { machinePointer('up', e); if (isTap) machinePointer('tap', e); return; }
    if (explore.on) explore.up(e);
    if (!isTap || wasJoy) return;
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(pickables(), true)[0];
    const d = h && describe(h.object);
    const touch = (e.pointerType || 'mouse') !== 'mouse';
    if (!d) { if (touch) { hover = null; tag.classList.remove('on'); } return; }
    // touch has no hover: the first tap previews (drawer pulls, label shows), the second opens
    if (touch && d.kind !== 'bay' && !(sameTarget(hover, d) && performance.now() < touchHoverUntil)) {
      hover = d; touchHoverUntil = performance.now() + 4000;
      tag.textContent = d.label + ' · tap again'; tag.style.left = Math.min(e.clientX, innerWidth - 220) + 'px'; tag.style.top = e.clientY + 'px';
      tag.classList.add('on');
      return;
    }
    if (d.kind === 'screen') location.href = byId[LATEST[d.idx].id].href;
    else if (d.kind === 'bay') enterDock(d.idx);
    else if (d.kind === 'drawer') location.href = byId[d.id].href;
    else if (d.kind === 'egg' && d.href) location.href = d.href;
    else if (d.kind === 'art') openViewer(d.art);
  });

  /* ———————————————— docking at a machine ———————————————— */
  const dock = { idx: -1, pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const playEl = $('#play'), plBtns = $('#pl-btns');
  function machinePointer(type, e) {
    const b = arcade.bays[dock.idx]; if (!b || !b.machine || !b.machine.pointer) return;
    setNdc(e); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(b.machine.group, true)[0] || null;
    b.machine.pointer({ type, ray: ray.ray.clone(), hit });
  }
  function enterDock(i) {
    const b = arcade.bays[i]; if (!b) return;
    if (dock.idx >= 0) exitDock(true);
    // bring the walk to the arcade first (keeps the scroll position meaningful); explorers stay where they are
    if (!explore.on) {
      const sec = $('#s-arcade'), y = secTop(sec) + sec.offsetHeight * 0.48 - innerHeight * 0.15;
      if (lenis) { lenis.scrollTo(y, { immediate: true }); lenis.stop(); } else scrollTo(0, y);
    }
    dock.idx = i; const p = arcade.dockPose(i); dock.pos.copy(p.pos); dock.look.copy(p.look);
    if (innerWidth / innerHeight < 1) { const k = Math.min(2.2, 1.15 / (innerWidth / innerHeight)); dock.pos.sub(dock.look).multiplyScalar(k).add(dock.look); dock.look.y -= 0.25 * (k - 1); }
    document.body.classList.add('docked');
    $('#pl-no').textContent = b.spec.no; $('#pl-title').textContent = b.spec.title;
    const m = b.machine;
    $('#pl-hint').textContent = m ? m.hint : 'This machine is still in the workshop.';
    plBtns.innerHTML = '';
    (m ? m.controls : []).forEach(c => {
      const el = document.createElement('button'); el.type = 'button'; el.textContent = c.label; if (c.primary) el.className = 'primary';
      el.setAttribute('aria-label', { left: 'Left', right: 'Right', fwd: 'Forward', back: 'Back', rotate: 'Rotate' }[c.act] || c.label);
      if (c.hold) {
        const off = () => { el.classList.remove('held'); m.hold(c.act, false); };
        el.addEventListener('pointerdown', ev => { ev.preventDefault(); el.setPointerCapture(ev.pointerId); el.classList.add('held'); m.hold(c.act, true); });
        el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
        el.addEventListener('click', ev => { if (ev.detail === 0) { m.press(c.act); } });
      } else el.addEventListener('click', () => m.press(c.act));
      plBtns.appendChild(el);
    });
    playEl.hidden = false;
    document.documentElement.style.setProperty('--playh', playEl.offsetHeight + 'px');
    if (m) m.setActive(true);
    tag.classList.remove('on'); document.body.classList.remove('pointing');
    $('#pl-exit').focus({ preventScroll: true });
  }
  function exitDock(silent) {
    const b = arcade.bays[dock.idx];
    if (b && b.machine) b.machine.setActive(false);
    dock.idx = -1; playEl.hidden = true; document.body.classList.remove('docked');
    document.documentElement.style.setProperty('--playh', '0px');
    if (lenis && !silent && !explore.on) lenis.start();
  }
  $('#pl-exit').addEventListener('click', () => exitDock());
  document.querySelectorAll('#pick button').forEach(btn => btn.addEventListener('click', () => enterDock(+btn.dataset.bay)));
  /* ———————————————— art viewer ———————————————— */
  const viewer = $('#viewer');
  let viewerItem = null;
  function openViewer(it) {
    viewerItem = it;
    const i = gallery.order.indexOf(it);
    $('#vw-img').src = it.src.replace('assets/art3d/', it.id.startsWith('framer') ? 'assets/framer/' : 'assets/art/').replace(/\.jpg$/, it.id.startsWith('framer') ? '.png' : '.jpg');
    $('#vw-img').alt = it.cap;
    $('#vw-cap').textContent = it.cap;
    $('#vw-no').textContent = `${String(i + 1).padStart(2, '0')} / ${gallery.order.length}`;
    $('#vw-kind').textContent = it.id.startsWith('framer') ? 'STUDY / FIELD NOTE' : 'FROM THE @LJUNGART FEED';
    viewer.hidden = false;
    if (lenis && !explore.on) lenis.stop();
    $('#vw-x').focus({ preventScroll: true });
  }
  function closeViewer() {
    viewer.hidden = true; viewerItem = null;
    if (lenis && !explore.on && dock.idx < 0) lenis.start();
  }
  function stepViewer(d) { const o = gallery.order, i = o.indexOf(viewerItem); openViewer(o[(i + d + o.length) % o.length]); }
  $('#vw-x').addEventListener('click', closeViewer);
  $('#vw-prev').addEventListener('click', () => stepViewer(-1));
  $('#vw-next').addEventListener('click', () => stepViewer(1));
  viewer.addEventListener('click', e => { if (e.target === viewer) closeViewer(); });
  addEventListener('keydown', e => {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer(); else if (e.key === 'ArrowRight') stepViewer(1); else if (e.key === 'ArrowLeft') stepViewer(-1); else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);

  /* ———————————————— free explore ———————————————— */
  const explore = createExplore({ canvas, getColliders });
  let colliderCache = null;
  env.ready.then(() => { colliderCache = null; });
  function getColliders() {
    if (colliderCache) return colliderCache;
    const circles = [], boxes = [], w = new THREE.Vector3();
    for (const t of env.treeSpots || []) circles.push({ x: t.x, z: t.z, r: 0.45 });
    for (const c of (env.props && env.props.colliders) || []) circles.push(c);
    for (const c of gallery.colliders) circles.push(c);
    for (const s of latest.screens) { s.root.getWorldPosition(w); circles.push({ x: w.x, z: w.z, r: Math.max(1.4, s.sw * 0.55) }); }
    for (const p of field.prints) { p.c.mesh.getWorldPosition(w); circles.push({ x: w.x, z: w.z, r: 0.9 }); }
    for (const g of field.gates) for (const sx of [-1.7, 1.7]) circles.push({ x: sx, z: FIELD_Z + g.z, r: 0.12 });
    for (const pr of [entrancePrint, finalePrint]) { pr.mesh.getWorldPosition(w); circles.push({ x: w.x, z: w.z, r: 1.0 }); }
    for (const b of arcade.bays) { b.bay.getWorldPosition(w); circles.push({ x: w.x, z: w.z, r: b.spec.id === 'hockey' ? 0.75 : 0.85 }); if (b.spec.id === 'hockey') { circles.push({ x: w.x, z: w.z - 0.8, r: 0.7 }, { x: w.x, z: w.z + 0.6, r: 0.7 }); } }
    boxes.push({ x: 0, z: -142, hw: 3.35, hd: 0.55 });                  // the archive cabinet
    boxes.push({ x: -1.3, z: -4.2, hw: 3.7, hd: 0.3 });                 // the name
    for (const f of (env.city && env.city.footprints) || []) boxes.push(f);
    colliderCache = { circles, boxes };
    return colliderCache;
  }
  function enterExplore() {
    if (dock.idx >= 0) exitDock(true);
    if (lenis) lenis.stop();
    explore.enter({ x: 0, z: -97, yaw: 0 });
    $('#xp').hidden = false;
    tag.classList.remove('on'); hover = null;
    $('#xp-exit').focus({ preventScroll: true });
  }
  function exitExplore() {
    explore.exit(); $('#xp').hidden = true;
    if (lenis) lenis.start();
  }
  $('#xp-go').addEventListener('click', enterExplore);
  $('#xp-exit').addEventListener('click', exitExplore);
  document.querySelectorAll('a[href="#explore"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); enterExplore(); }, true));
  addEventListener('keydown', e => {
    if (explore.on && dock.idx < 0) {
      if (e.key === 'Escape') { exitExplore(); return; }
      if (explore.key(e, true)) e.preventDefault();
    }
  });
  addEventListener('keyup', e => { if (explore.on && explore.key(e, false)) e.preventDefault(); });
  addEventListener('blur', () => { if (explore.on) explore.st.keys = {}; });

  addEventListener('keydown', e => {
    if (dock.idx < 0) return;
    if (e.key === 'Escape') { exitDock(); return; }
    const m = arcade.bays[dock.idx].machine;
    if (m && m.key && m.key(e.key, true)) e.preventDefault();
  });
  addEventListener('keyup', e => {
    if (dock.idx < 0) return;
    const m = arcade.bays[dock.idx].machine;
    if (m && m.key && m.key(e.key, false)) e.preventDefault();
  });

  /* ———————————————— resize ———————————————— */
  let lastW = 0, lastH = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    // phones resize by ~60–120 px whenever the address bar slides; only re-plan the walk on real changes
    if (w !== lastW || Math.abs(h - lastH) > 140) { lastW = w; lastH = h; layout(); }
  }
  addEventListener('resize', resize); resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measurePlacards(); layout(); });

  /* ———————————————— loop ———————————————— */
  const camPos = new THREE.Vector3().copy(camera.position), camLook = new THREE.Vector3(0, 1.7, -6);
  const right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  const timer = new THREE.Timer(); let frames = 0, running = true, pickTimer = 0;
  const rail = $('#hud-rail'), hsCh = $('#hs-ch');
  const arcadeCentre = new THREE.Vector3(0, 1, -112);

  function frame() {
    if (!running) return;
    timer.update(); const dt = Math.min(timer.getDelta(), 1 / 30), t = timer.getElapsed();
    if (lenis) lenis.raf(performance.now());
    const scroll = getScroll(), vel = getVel();
    const kf = sample(scroll);

    // desired camera
    let lam = reducedMotion ? 30 : 5.5;
    const xp = explore.on && dock.idx < 0 ? explore.update(dt) : null;
    if (dock.idx >= 0) { tmp.copy(dock.pos); pathLook.copy(dock.look); lam = 3.2; }
    else if (xp) { tmp.copy(xp.pos); pathLook.copy(xp.look); lam = 16; }
    else {
      tmp.copy(pathPos);
      if (pointerIn && !isMobile && !reducedMotion) {
        right.subVectors(pathLook, pathPos).cross(up).normalize();
        tmp.addScaledVector(right, par.x * 0.28).addScaledVector(up, par.y * 0.16);
      }
    }
    const k = 1 - Math.exp(-lam * dt);
    camPos.lerp(tmp, k); camLook.lerp(pathLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    env.follow(camLook);
    env.update(dt, t, { camera });
    { const hi = THREE.MathUtils.clamp((camera.position.y - 4) / 22, 0, 1); scene.fog.near = 22 + hi * 60; scene.fog.far = 85 + hi * 190; }

    // stations
    let focus = latestFirst >= 0 ? kf - latestFirst : -9;
    if (explore.on) {                     // walking: play whichever film stand you are standing at
      focus = -9; let best = 11;
      latest.screens.forEach((sc, i) => { const d = camera.position.distanceTo(sc.root.position); if (d < best) { best = d; focus = i; } });
    }
    latest.update(dt, t, { focus, userPaused: false });
    // the field reads progress as "where the camera is along its 30 m", velocity ~0.06 per wheel notch
    const fp = THREE.MathUtils.clamp(-(camera.position.z - FIELD_Z) / fieldLen, 0, 1);
    const s = { progress: fp, velocity: THREE.MathUtils.clamp(vel / 900, -0.2, 0.2), camera };
    field.update(dt, t, s);
    entrancePrint.update(dt, t, s);
    finalePrint.update(dt, t, s);
    const near = THREE.MathUtils.clamp(1 - camera.position.distanceTo(arcadeCentre) / 22, 0, 1);

    // distance culling: stations deep in the fog are not drawn (the aerial finale sees everything)
    const cz = camera.position.z, aerial = camera.position.y > 9;
    const arcDist = camera.position.distanceTo(arcadeCentre);
    for (const b of arcade.bays) if (b.machine) b.machine.group.visible = arcDist < 32 || dock.idx >= 0;
    for (const c of cullList()) {
      const d = cz > c.z0 ? cz - c.z0 : cz < c.z1 ? c.z1 - cz : 0;
      c.obj.visible = aerial || (c.back ? d < 75 && cz >= c.z1 - 8 : d < 75);
    }

    // hover pick (throttled)
    if (lastType !== 'mouse' && hover && dock.idx < 0 && performance.now() > touchHoverUntil) { hover = null; tag.classList.remove('on'); }
    pickTimer -= dt;
    if (dock.idx < 0 && pointerIn && (needPick || pickTimer <= 0) && !document.body.classList.contains('lenis-scrolling')) {
      needPick = false; pickTimer = 0.12;
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(pickables(), true)[0];
      hover = h ? describe(h.object) : null;
      tag.textContent = hover ? hover.label : '';
      tag.classList.toggle('on', !!hover);
      document.body.classList.toggle('pointing', !!hover);
    }
    arcade.update(dt, t, { near, camera, activeIdx: dock.idx, hoverIdx: hover && hover.kind === 'bay' ? hover.idx : -1 });
    archive.update(dt, t, { hoverId: hover && hover.kind === 'drawer' ? hover.id : null });
    gallery.update(dt, t, { camera, hoverId: hover && hover.kind === 'art' ? hover.id : (viewerItem ? viewerItem.id : null) });

    // HUD
    rail.style.height = (scroll / maxScroll * 100).toFixed(2) + '%';
    const ch = Math.max(0, Math.round(-camera.position.z + 8));
    hsCh.textContent = `CH ${Math.floor(ch / 1000)}+${String(ch % 1000).padStart(3, '0')}`;

    renderer.render(scene, camera);
    if (++frames === 3 && !loaderDone) setTimeout(finishLoader, Math.max(0, 900 - (performance.now() - t0)));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; timer.update(); requestAnimationFrame(frame); }
  });

  if (/[?&]debug\b/.test(location.search)) window.__world = { scene, camera, renderer, env, explore, gallery, arcade, latest, archive, enterDock, exitDock, lenis, shots: () => shots,
    go: (sel, at = 0.4) => { const el = $(sel); const y = secTop(el) + el.offsetHeight * at - innerHeight * 0.15; if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y); return y; } };
}
