// Station 01 — four standing screens, each playing the newest film of a project.
import * as THREE from 'three';
import { mat, edged, box, label, COLORS, damp } from '../kit.js';

export function createLatest(list, { z0 = -16, gap = 11, reducedMotion = false } = {}) {
  const group = new THREE.Group();
  const screens = [];

  list.forEach((w, i) => {
    const side = i % 2 ? 1 : -1;
    const root = new THREE.Group();
    const x = side * 2.7, z = z0 - i * gap;
    root.position.set(x, 0, z);
    root.rotation.y = -side * 0.42;                    // turn toward the walkway
    group.add(root);

    // screen size: fit inside 3.2 × 2.4 m
    const maxW = 3.2, maxH = 2.3;
    let sw = maxW, sh = maxW / w.aspect;
    if (sh > maxH) { sh = maxH; sw = maxH * w.aspect; }
    const cy = 0.75 + sh / 2;

    // plinth + two posts + frame (architectural stand)
    const plinth = box(sw + 0.5, 0.12, 0.9, mat.paper); plinth.position.set(0, 0.06, 0); root.add(plinth);
    for (const px of [-sw / 2 - 0.12, sw / 2 + 0.12]) {
      const post = box(0.06, cy + sh / 2 + 0.1, 0.06, mat.ink, { edges: false }); post.position.set(px, (cy + sh / 2 + 0.1) / 2 + 0.12, -0.08); root.add(post);
    }
    const frame = box(sw + 0.14, sh + 0.14, 0.08, mat.ink, { edges: false }); frame.position.set(0, cy, -0.06); root.add(frame);

    // the film
    const video = document.createElement('video');
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'none', crossOrigin: 'anonymous' });
    video.setAttribute('playsinline', ''); video.poster = w.poster;
    const tex = new THREE.VideoTexture(video); tex.colorSpace = THREE.SRGBColorSpace;
    const posterTex = new THREE.TextureLoader().load(w.poster); posterTex.colorSpace = THREE.SRGBColorSpace;
    const screenMat = new THREE.MeshBasicMaterial({ map: posterTex, toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
    screen.position.set(0, cy, -0.015); screen.userData.kind = 'screen'; screen.userData.idx = i;
    root.add(screen);

    // progress line under the screen (orange) — the only orange on the stand
    const prog = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.012), mat.orange);
    prog.position.set(-sw / 2, cy - sh / 2 - 0.1, 0); prog.scale.x = 0.0001; root.add(prog);

    // placard
    const tag = label(`${w.no} · ${w.kind.toUpperCase()} · ${w.date} · FILM ${w.len}`, { size: 0.075, font: 'mono', anchorX: 'left', color: COLORS.soft });
    tag.position.set(-sw / 2, cy + sh / 2 + 0.36, 0); root.add(tag);
    const title = label(w.title, { size: 0.32, font: 'disp', anchorX: 'left', anchorY: 'bottom' });
    title.position.set(-sw / 2, cy + sh / 2 + 0.44, 0); root.add(title);
    const meta = label(w.meta.map(([k, v]) => `${k.toUpperCase().padEnd(8)} ${v}`).join('\n'), { size: 0.062, font: 'mono', anchorX: 'left', anchorY: 'top', lineHeight: 1.6, color: COLORS.ink });
    meta.position.set(-sw / 2, cy - sh / 2 - 0.2, 0.0); root.add(meta);

    // shot: camera in front of the screen, slightly toward the walkway
    const lookLocal = new THREE.Vector3(0, cy + 0.12, 0);
    const camLocal = new THREE.Vector3(side * -0.4, cy + 0.2, Math.max(4.6, sw * 1.95, (sh + 1.7) * 1.5));
    screens.push({ w, root, screen, screenMat, video, tex, posterTex, prog, sw, lookLocal, camLocal, loaded: false, playing: false, vis: 0 });
  });

  function shot(i) {
    const s = screens[i]; s.root.updateMatrixWorld(true);
    return { pos: s.root.localToWorld(s.camLocal.clone()), look: s.root.localToWorld(s.lookLocal.clone()) };
  }

  /** focus: index of the screen the camera is at (fractional ok), -1 = none */
  function update(dt, t, { focus, userPaused }) {
    screens.forEach((s, i) => {
      const near = 1 - Math.min(1, Math.abs(focus - i));       // 1 at the screen, 0 one screen away
      if (near > 0.05 && !s.loaded) { s.video.src = s.w.video; s.loaded = true; }
      const want = near > 0.55 && !userPaused && !reducedMotion;
      if (want && !s.playing) { s.video.play().then(() => { s.screenMat.map = s.tex; s.screenMat.needsUpdate = true; }).catch(() => {}); s.playing = true; }
      if (!want && s.playing) { s.video.pause(); s.playing = false; }
      if (s.video.duration) s.prog.scale.x = Math.max(0.0001, s.sw * s.video.currentTime / s.video.duration), s.prog.position.x = -s.sw / 2 + s.prog.scale.x / 2;
      s.vis = damp(s.vis, near, 6, dt);
    });
  }
  function setPlaying(i, on) {
    const s = screens[i]; if (!s) return;
    if (!s.loaded) { s.video.src = s.w.video; s.loaded = true; }
    if (on) s.video.play().then(() => { s.screenMat.map = s.tex; s.screenMat.needsUpdate = true; }).catch(() => {}); else s.video.pause();
    s.playing = on;
  }
  return { group, screens, shot, update, setPlaying, hitTargets: screens.map(s => s.screen) };
}
