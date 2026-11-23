// Falling leaves: one InstancedMesh, animated entirely in the vertex shader.
// Each leaf drops from under a crown, tumbles and drifts on the breeze, rests on the ground a while, then starts again.
import * as THREE from 'three';

const ORANGES = [0xff4d00, 0xff6a1f, 0xf08a3c, 0xe8742a, 0xd9531a, 0xc2410c, 0xf59e0b, 0xffa463, 0xffb380];

function leafGeometry() {
  // a small pointed blade, ~9 cm, folded slightly along the midrib
  const s = new THREE.Shape();
  s.moveTo(0, -0.045); s.quadraticCurveTo(0.03, -0.01, 0, 0.05); s.quadraticCurveTo(-0.03, -0.01, 0, -0.045);
  const g = new THREE.ShapeGeometry(s, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(p.getX(i)) * 0.35);   // the fold
  g.computeVertexNormals();
  return g;
}

/**
 * sources: [{ x, z, h, r }] — crown centres (h = crown height, r = spread)
 * returns { mesh, update(dt, t) }
 */
export function createFallingLeaves(ctx, sources, { count = 1400, wind = new THREE.Vector2(0.55, -0.2) } = {}) {
  if (!sources.length) return { mesh: new THREE.Group(), update() {} };
  const n = ctx.isMobile ? Math.round(count * 0.35) : count;
  const geo = leafGeometry();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const uniforms = { uTime: { value: 0 }, uWind: { value: wind }, uCalm: { value: ctx.reducedMotion ? 1 : 0 } };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform vec2 uWind; uniform float uCalm;
        attribute vec4 aFall;   // x, z, drop height, fall speed (m/s)
        attribute vec4 aSpin;   // phase, tumble rate, sway amp, rest share
        mat3 rotXYZ(vec3 a){ vec3 s = sin(a), c = cos(a);
          return mat3(c.y*c.z, c.y*s.z, -s.y,  s.x*s.y*c.z - c.x*s.z, s.x*s.y*s.z + c.x*c.z, s.x*c.y,  c.x*s.y*c.z + s.x*s.z, c.x*s.y*s.z - s.x*c.z, c.x*c.y); }
        float fallK(){ float fallT = aFall.z / aFall.w; float cyc = fallT * (1.0 + aSpin.w);
          return fract((uTime * (1.0 - uCalm) + aSpin.x * cyc) / cyc) * (1.0 + aSpin.w); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float kN = fallK(); vec3 angN = kN < 1.0 ? vec3(uTime * aSpin.y + aSpin.x * 6.0, uTime * aSpin.y * 0.7 + aSpin.x * 3.0, aSpin.x * 9.0) : vec3(1.5708, 0.0, aSpin.x * 9.0);
        objectNormal = rotXYZ(angN) * objectNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float k = fallK();
        float fall = min(k, 1.0);
        vec3 ang = k < 1.0 ? vec3(uTime * aSpin.y + aSpin.x * 6.0, uTime * aSpin.y * 0.7 + aSpin.x * 3.0, aSpin.x * 9.0) : vec3(1.5708, 0.0, aSpin.x * 9.0);
        transformed = rotXYZ(ang) * transformed;
        float drop = aFall.z * fall;
        vec3 at = vec3(aFall.x, aFall.z - drop + 0.012, aFall.y);
        float sway = sin(uTime * 1.3 + aSpin.x * 20.0) * aSpin.z * (1.0 - fall * 0.5);
        at.x += uWind.x * drop * 0.55 + sway;
        at.z += uWind.y * drop * 0.55 + cos(uTime * 1.1 + aSpin.x * 13.0) * aSpin.z * 0.6;
        transformed += at;`);
  };
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const fallA = new Float32Array(n * 4), spinA = new Float32Array(n * 4);
  const col = new THREE.Color();
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const s = sources[Math.floor(rnd() * sources.length)];
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * s.r;
    fallA.set([s.x + Math.cos(a) * r, s.z + Math.sin(a) * r, s.h * (0.55 + rnd() * 0.4), 0.55 + rnd() * 0.6], i * 4);
    spinA.set([rnd(), 1.2 + rnd() * 2.6, 0.12 + rnd() * 0.35, 0.6 + rnd() * 1.4], i * 4);
    mesh.setColorAt(i, col.setHex(ORANGES[Math.floor(rnd() * ORANGES.length)]).multiplyScalar(0.92 + rnd() * 0.12));
  }
  geo.setAttribute('aFall', new THREE.InstancedBufferAttribute(fallA, 4));
  geo.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spinA, 4));
  mesh.frustumCulled = false;            // positions live in the shader
  mesh.raycast = () => {};
  mesh.name = 'falling-leaves';
  return { mesh, update(dt, t) { uniforms.uTime.value = t; } };
}
