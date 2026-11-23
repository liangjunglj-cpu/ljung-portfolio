// Photographs of the author as framed prints on stands, printed on Kodak stocks:
// a subtle film look (tone curve, warm highlights, grain, a soft vignette) — the photo stays the photo.
import * as THREE from 'three';
import { mat, box, label, COLORS, clamp, damp, smooth } from './kit.js';

export const EFFECTS = ['portra', 'gold', 'ektar'];
const NAMES = { portra: 'KODAK PORTRA 400', gold: 'KODAK GOLD 200', ektar: 'KODAK EKTAR 100' };

const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(src, renderer) {
  if (!texCache.has(src)) {
    const t = loader.load(src);
    t.colorSpace = THREE.NoColorSpace;            // shade in sRGB values, output them as they are
    t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
    texCache.set(src, t);
  }
  return texCache.get(src);
}

const VERT = /* glsl */`
  #include <fog_pars_vertex>
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FRAG = /* glsl */`
  #include <fog_pars_fragment>
  uniform sampler2D map; uniform int uFrom; uniform int uTo; uniform float uMix;
  uniform float uTime; uniform float uVel; uniform vec2 uSize; uniform float uSeed;
  varying vec2 vUv;
  float luma(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  vec3 photoAt(vec2 uv){
    float o = uVel * 0.004;                                  // a touch of misregistration only while scrolling
    return vec3(texture2D(map, uv + vec2(o,0.)).r, texture2D(map, uv).g, texture2D(map, uv - vec2(o,0.)).b);
  }
  vec3 sat(vec3 c, float k){ float l = luma(c); return mix(vec3(l), c, k); }
  vec3 curve(vec3 c, float lift, float k){                  // a gentle film S-curve with lifted blacks
    c = mix(c, c * c * (3. - 2. * c), k); return lift + c * (1. - lift * 1.3);
  }
  vec3 fx(int e, vec2 uv){
    vec3 c = photoAt(uv); float l = luma(c);
    vec3 o;
    if (e == 1) {                                            // Gold 200: warm, golden mids, a touch more colour
      o = curve(c, .035, .28); o = sat(o, 1.08);
      o *= vec3(1.045, 1.0, .9); o += vec3(.03, .018, -.01) * (1. - abs(l - .55) * 1.8);
    } else if (e == 2) {                                     // Ektar 100: crisp, saturated, slightly cool shadows
      o = curve(c, .02, .38); o = sat(o, 1.16);
      o = mix(o, o * vec3(.95, 1.0, 1.05), 1. - smoothstep(.0, .45, l)); o *= vec3(1.02, 1.0, .985);
    } else {                                                 // Portra 400: soft, creamy, warm highlights, teal-ish shadows
      o = curve(c, .045, .18); o = sat(o, .94);
      o = mix(o, o * vec3(.96, 1.01, 1.03), 1. - smoothstep(.0, .5, l));
      o = mix(o, o * vec3(1.05, 1.02, .93), smoothstep(.45, 1., l));
    }
    float g = hash(floor(uv * uSize * 1100.) + floor(uTime * 24.)) - .5;   // fine grain, stronger in the mids
    o += g * (e == 2 ? .028 : .045) * (1. - abs(l - .5));
    vec2 v = uv - .5; o *= 1. - dot(v, v) * .42;            // soft vignette
    return o;
  }
  void main(){
    vec3 a = fx(uFrom, vUv), b = fx(uTo, vUv);
    float edge = uMix * 1.04 - .02;                          // the change wipes up the print
    vec3 col = vUv.y < edge ? b : a;
    float ln = (uMix > .001 && uMix < .999) ? 1. - smoothstep(0., .006, abs(vUv.y - edge)) : 0.;
    col = mix(col, vec3(1., .302, 0.), ln);
    gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      #else
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      #endif
      gl_FragColor.rgb = mix(gl_FragColor.rgb, pow(fogColor, vec3(1. / 2.2)), fogFactor);
    #endif
  }`;

/**
 * A framed print on a stand. Origin at the floor, front faces +Z.
 * opts: height (of the image, m), effect, index (→ FIG. 0n), caption (bool)
 */
export function createPhoto(ctx, photo, { height = 2.4, maxWidth = 3.2, effect = 'portra', index = null, caption = true, lift = 0.5 } = {}) {
  const aspect = photo.w / photo.h;
  let h = height, w = h * aspect;
  if (w > maxWidth) { w = maxWidth; h = w / aspect; }
  const mesh = new THREE.Group();
  const matte = 0.09, frameT = 0.03, y0 = lift;

  // stand: base plate, two ink legs, a white mount board, a thin ink frame
  const base = box(w * 0.7, 0.04, 0.5, mat.paper); base.position.set(0, 0.02, -0.12); mesh.add(base);
  for (const sx of [-1, 1]) { const leg = box(0.035, y0 + h * 0.75, 0.035, mat.ink, { edges: false }); leg.position.set(sx * w * 0.3, (y0 + h * 0.75) / 2, -0.09); mesh.add(leg); }
  const board = box(w + matte * 2, h + matte * 2, 0.035, mat.paper); board.position.set(0, y0 + h / 2, -0.03); mesh.add(board);
  const fr = [[w + matte * 2 + frameT * 2, frameT, 0, (h / 2 + matte + frameT / 2)], [w + matte * 2 + frameT * 2, frameT, 0, -(h / 2 + matte + frameT / 2)],
              [frameT, h + matte * 2, -(w / 2 + matte + frameT / 2), 0], [frameT, h + matte * 2, (w / 2 + matte + frameT / 2), 0]];
  for (const [fw, fh, fx, fy] of fr) { const b = box(fw, fh, 0.05, mat.ink, { edges: false }); b.position.set(fx, y0 + h / 2 + fy, -0.025); mesh.add(b); }

  const fx0 = Math.max(0, EFFECTS.indexOf(effect));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, fog: false, toneMapped: false,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      map: { value: null }, uFrom: { value: fx0 }, uTo: { value: fx0 }, uMix: { value: 1 },
      uTime: { value: 0 }, uVel: { value: 0 }, uSize: { value: new THREE.Vector2(w, h) }, uSeed: { value: Math.random() }
    }])
  });
  material.uniforms.map.value = tex(photo.src, ctx.renderer);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  plane.position.set(0, y0 + h / 2, 0.0); plane.userData.photo = photo;
  mesh.add(plane);

  let fxLabel = null;
  if (caption) {
    const yC = y0 - matte - 0.12;
    const fig = label(index != null ? `FIG. ${String(index).padStart(2, '0')}` : 'FIG.', { size: 0.07, font: 'monoMed', anchorX: 'left', anchorY: 'top', color: COLORS.ink });
    fig.position.set(-w / 2 - matte, yC, 0.02); mesh.add(fig);
    const cap = label(photo.cap, { size: 0.07, font: 'mono', anchorX: 'left', anchorY: 'top', color: COLORS.ink, maxWidth: w + matte * 2 - 0.5 });
    cap.position.set(-w / 2 - matte + 0.48, yC, 0.02); mesh.add(cap);
    fxLabel = label(NAMES[effect] || '', { size: 0.055, font: 'mono', anchorX: 'right', anchorY: 'bottom', color: COLORS.soft });
    fxLabel.position.set(w / 2 + matte, y0 + h + matte + 0.06, 0.02); mesh.add(fxLabel);
  }

  let cur = fx0, pending = -1, delay = 0;
  function setEffect(name, { instant = false, after = 0 } = {}) {
    const i = EFFECTS.indexOf(name); if (i < 0 || i === (pending >= 0 ? pending : cur)) return;
    if (instant || ctx.reducedMotion) { cur = i; pending = -1; material.uniforms.uFrom.value = i; material.uniforms.uTo.value = i; material.uniforms.uMix.value = 1; }
    else { pending = i; delay = after; }
    if (fxLabel) { fxLabel.text = NAMES[name]; fxLabel.sync(); }
  }
  function update(dt, t, s = {}) {
    const u = material.uniforms;
    u.uTime.value = t;
    u.uVel.value = damp(u.uVel.value, ctx.reducedMotion ? 0 : clamp(Math.abs(s.velocity || 0) * 14, 0, 1), 6, dt);
    if (pending >= 0) {
      delay -= dt;
      if (delay <= 0 && u.uMix.value >= 1) { u.uFrom.value = cur; u.uTo.value = pending; u.uMix.value = 0; cur = pending; pending = -1; }
    }
    if (u.uMix.value < 1) u.uMix.value = Math.min(1, u.uMix.value + dt / 0.8);
  }
  function dispose() { plane.geometry.dispose(); material.dispose(); }
  return { mesh, plane, material, width: w, height: h, get effect() { return EFFECTS[cur]; }, setEffect, update, dispose };
}

/**
 * Station 02 — a 30 m walk (along −Z from the group origin) past seven prints, through three gates.
 * Each gate you pass nudges every print one filter along; scrolling back reverses it.
 */
export function createPhotoField(ctx, photos) {
  const group = new THREE.Group();
  const LEN = 30;
  const prints = photos.map((p, i) => {
    const side = i % 2 ? 1 : -1, z = -2.6 - i * 4.15;
    const c = createPhoto(ctx, p, { height: 2.45, maxWidth: 3.1, effect: EFFECTS[i % EFFECTS.length], index: i + 5, lift: 0.42 });
    c.mesh.position.set(side * 2.7, 0, z);
    c.mesh.rotation.y = -side * 0.55;
    group.add(c.mesh);
    return { c, side, z, base: i % EFFECTS.length, shown: -1 };
  });

  const gates = [-8.8, -17.1, -25.4].map((z, k) => {
    const g = new THREE.Group(); g.position.z = z; group.add(g);
    const W = 3.4, H = 3.1;
    for (const sx of [-1, 1]) { const post = box(0.05, H, 0.05, mat.ink, { edges: false }); post.position.set(sx * W / 2, H / 2, 0); g.add(post); }
    const lintel = box(W + 0.05, 0.05, 0.05, mat.ink, { edges: false }); lintel.position.set(0, H, 0); g.add(lintel);
    const ol = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, 0.012), mat.orange); ol.position.set(0, H - 0.06, 0.03); g.add(ol);
    const t = label(`GATE 0${k + 1}`, { size: 0.08, font: 'monoMed', anchorX: 'left', anchorY: 'bottom' }); t.position.set(-W / 2, H + 0.06, 0); g.add(t);
    const sub = label('EVERY PRINT CHANGES FILM STOCK', { size: 0.055, font: 'mono', anchorX: 'right', anchorY: 'bottom', color: COLORS.soft }); sub.position.set(W / 2, H + 0.07, 0); g.add(sub);
    return { z, g };
  });

  const camL = new THREE.Vector3();
  function update(dt, t, s = {}) {
    if (s.camera) { camL.copy(s.camera.position); group.worldToLocal(camL); }
    else camL.set(0, 1.6, -(s.progress || 0) * LEN);
    const passed = gates.filter(g => camL.z < g.z).length;
    prints.forEach((p, i) => {
      const want = (p.base + passed) % EFFECTS.length;
      if (want !== p.shown) {
        p.c.setEffect(EFFECTS[want], { instant: p.shown < 0, after: Math.abs(i * 0.12) });
        p.shown = want;
      }
      // prints wait a little wide and ease toward the walkway as you come up to them
      const ahead = camL.z - p.z;                              // >0 while the print is still in front of you
      const k = smooth(-2, 9, ahead);
      p.c.mesh.position.x = p.side * (2.7 + k * 0.8);
      p.c.mesh.rotation.y = -p.side * (0.55 + k * 0.25);
      p.c.update(dt, t, s);
    });
  }
  return { group, length: LEN, prints, gates, update, hitTargets: prints.map(p => p.c.plane) };
}
