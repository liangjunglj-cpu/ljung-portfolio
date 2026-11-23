// Shared look for the world: white paper model, black ink edges, orange only as a line.
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import groteskBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url';
import groteskMed from '@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff?url';
import monoReg from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff?url';
import monoMed from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff?url';

export const FONTS = { disp: groteskBold, dispMed: groteskMed, mono: monoReg, monoMed };

export const COLORS = {
  paper: 0xffffff,
  ground: 0xf3f3f1,
  shade: 0xe6e6e3,
  ink: 0x111111,
  soft: 0x8a8a8a,
  orange: 0xff4d00,
  fog: 0xf7f7f5
};

export const mat = {
  paper: new THREE.MeshStandardMaterial({ color: COLORS.paper, roughness: 0.92, metalness: 0 }),
  shade: new THREE.MeshStandardMaterial({ color: COLORS.shade, roughness: 0.95, metalness: 0 }),
  ink: new THREE.MeshStandardMaterial({ color: COLORS.ink, roughness: 0.55, metalness: 0.05 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xd9d9d6, roughness: 0.35, metalness: 0.6 }),
  orange: new THREE.MeshBasicMaterial({ color: COLORS.orange }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
  line: new THREE.LineBasicMaterial({ color: COLORS.ink }),
  lineSoft: new THREE.LineBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.22 }),
  lineOrange: new THREE.LineBasicMaterial({ color: COLORS.orange })
};

/** Add black edge lines to a mesh (architectural-model look). Returns the mesh. */
export function edged(mesh, { threshold = 20, material = mat.line } = {}) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), material);
  e.raycast = () => {};            // edges never steal clicks
  e.name = 'edges';
  mesh.add(e);
  return mesh;
}

/** Shadow-casting box with edges. */
export function box(w, h, d, material = mat.paper, { edges = true, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = cast; m.receiveShadow = receive;
  if (edges) edged(m);
  return m;
}

/** A straight line from a → b (Vector3s). */
export function line(a, b, material = mat.line) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const l = new THREE.Line(g, material); l.raycast = () => {};
  return l;
}

/**
 * Crisp SDF text in 3D (troika). font: 'disp' | 'dispMed' | 'mono' | 'monoMed'.
 * Units are world metres. Call .sync() is done for you; update .text then .sync() later.
 */
export function label(text, { size = 0.1, color = COLORS.ink, font = 'mono', anchorX = 'center', anchorY = 'middle',
  maxWidth = Infinity, letterSpacing = 0, lineHeight = 1.2, textAlign = 'left', opacity = 1 } = {}) {
  const t = new Text();
  t.text = text; t.font = FONTS[font] || FONTS.mono; t.fontSize = size; t.color = color;
  t.anchorX = anchorX; t.anchorY = anchorY; t.maxWidth = maxWidth; t.letterSpacing = letterSpacing;
  t.lineHeight = lineHeight; t.textAlign = textAlign;
  if (opacity < 1) { t.fillOpacity = opacity; }
  t.raycast = () => {};
  t.sync();
  return t;
}

/** Event bus: anything can award a prize; the overlay ticket listens. */
export const bus = new EventTarget();
export function award(item, from) { bus.dispatchEvent(new CustomEvent('award', { detail: { item, from } })); }

export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
