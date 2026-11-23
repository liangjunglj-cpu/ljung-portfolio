// Ground, light, fog, the orange path and a white massing-model city around it.
import * as THREE from 'three';
import { COLORS, mat } from './kit.js';
import { createFallingLeaves } from './fall.js';

export function createEnv(scene, { isMobile }) {
  scene.background = new THREE.Color(COLORS.fog);
  scene.fog = new THREE.Fog(COLORS.fog, 22, 85);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d9d4, 1.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.castShadow = true;
  const sm = isMobile ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  // ground + survey grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'ground';
  scene.add(ground);
  const grid = new THREE.GridHelper(240, 120, 0xdcdcd7, 0xe7e7e3);
  grid.position.set(0, 0.002, -90); grid.material.transparent = true; grid.material.opacity = 0.9;
  grid.raycast = () => {};
  scene.add(grid);

  // the orange path: one thin line through the whole world
  const pathPts = [];
  for (let z = 8; z >= -190; z -= 2) pathPts.push(new THREE.Vector3(Math.sin(z * 0.035) * 0.25, 0.006, z));
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathPts), mat.lineOrange);
  path.raycast = () => {};
  scene.add(path);
  // chainage ticks every 10 m
  const ticks = [];
  for (let z = 0; z >= -180; z -= 10) { ticks.push(new THREE.Vector3(-0.35, 0.006, z), new THREE.Vector3(0.35, 0.006, z)); }
  const tickLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), mat.lineOrange);
  tickLines.raycast = () => {};
  scene.add(tickLines);

  // massing model city: instanced white blocks + one merged edge-line geometry
  const blocks = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < (isMobile ? 70 : 130); i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (9 + rnd() * 34), z = 10 - rnd() * 210;
    if (Math.abs(x) < 11 && z < -95 && z > -126) continue;       // keep the arcade clear
    const w = 1.5 + rnd() * 5, d = 1.5 + rnd() * 5, h = 0.6 + Math.pow(rnd(), 2.2) * 14;
    blocks.push({ x, z, w, d, h, r: (rnd() - 0.5) * 0.3 });
  }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat.paper, blocks.length);
  im.castShadow = true; im.receiveShadow = true; im.raycast = () => {};
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const unitEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)).attributes.position.array;
  const edgePos = new Float32Array(unitEdges.length * blocks.length);
  const v = new THREE.Vector3();
  blocks.forEach((b, i) => {
    q.setFromEuler(e.set(0, b.r, 0)); p.set(b.x, b.h / 2, b.z); s.set(b.w, b.h, b.d);
    m4.compose(p, q, s); im.setMatrixAt(i, m4);
    for (let k = 0; k < unitEdges.length; k += 3) {
      v.set(unitEdges[k], unitEdges[k + 1], unitEdges[k + 2]).applyMatrix4(m4);
      edgePos.set([v.x, v.y, v.z], i * unitEdges.length + k);
    }
  });
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
  const city = new THREE.Group();
  const cityEdges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.55 }));
  cityEdges.raycast = () => {};
  city.add(im, cityEdges);
  scene.add(city);

  // model trees: faceted white canopies on ink stems, like the foam trees on a site model
  const trees = [];
  for (let z = 4; z > -185; z -= 3.2 + rnd() * 3) {
    for (const side of [-1, 1]) {
      if (rnd() < 0.35) continue;
      if (z < -100 && z > -124) continue;                       // arcade forecourt stays open
      if (z < -136 && z > -150 && Math.abs(side) === 1 && rnd() < 0.6) continue;
      trees.push({ x: side * (5.4 + rnd() * 3.4), z, r: 0.55 + rnd() * 0.55, h: 1.6 + rnd() * 1.4 });
    }
  }
  const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
  const canopies = new THREE.InstancedMesh(canopyGeo, mat.paper, trees.length);
  canopies.castShadow = true; canopies.receiveShadow = true; canopies.raycast = () => {};
  const cEdges = new THREE.EdgesGeometry(canopyGeo).attributes.position.array;
  const tPos = new Float32Array((cEdges.length + 6) * trees.length);
  trees.forEach((tr, i) => {
    q.setFromEuler(e.set(rnd() * 3, rnd() * 3, 0)); p.set(tr.x, tr.h, tr.z); s.set(tr.r, tr.r * 1.15, tr.r);
    m4.compose(p, q, s); canopies.setMatrixAt(i, m4);
    const o = i * (cEdges.length + 6);
    for (let k = 0; k < cEdges.length; k += 3) { v.set(cEdges[k], cEdges[k + 1], cEdges[k + 2]).applyMatrix4(m4); tPos.set([v.x, v.y, v.z], o + k); }
    tPos.set([tr.x, 0, tr.z, tr.x, tr.h - tr.r * 0.8, tr.z], o + cEdges.length);   // the stem
  });
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  const treeLines = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.7 }));
  treeLines.raycast = () => {};
  scene.add(canopies, treeLines);

  // keep the shadow frustum around what the camera looks at
  function follow(target) {
    sun.position.set(target.x + 9, target.y + 16, target.z + 7);
    sun.target.position.copy(target);
  }

  // the detailed city (facades, space frames, design eggs) and real trees replace the
  // placeholder massing and faceted canopies above as soon as their modules load
  const env = { sun, hemi, ground, follow, city: null, forest: null, props: null, treeSpots: trees, update(dt, t, s) {
    if (env.city) env.city.update(dt, t, s);
    if (env.forest) env.forest.update(dt, t, s);
    if (env.fall) env.fall.update(dt, t);
    if (env.props && env.props.update) env.props.update(dt, t, s);
  } };
  const mods = import.meta.glob(['./city.js', './trees.js', './props.js']);
  env.ready = Promise.all([
    mods['./props.js'] ? mods['./props.js']().then(m => {
      env.props = m.createProps(env.ctx || { THREE, isMobile }, { isMobile, figures: false });   // no people in the model
      scene.add(env.props.group);
    }).catch(err => console.warn('[props]', err)) : null,
    mods['./city.js'] ? mods['./city.js']().then(m => {
      env.city = m.createCity(env.ctx || { THREE, isMobile }, { isMobile });
      scene.add(env.city.group); scene.remove(city);
    }).catch(err => console.warn('[city]', err)) : null,
    mods['./trees.js'] ? mods['./trees.js']().then(m => {
      // wide rain trees only on the outer row; nearer the walkway, narrower crowns
      const near = ['slender', 'conifer', 'ornamental', 'dome'], far = ['rain', 'rain', 'dome', 'slender', 'conifer'];
      const placements = trees.map((tr, i) => {
        const outer = Math.abs(tr.x) >= 7;
        const species = outer ? far[i % far.length] : near[i % near.length];
        return { x: tr.x, z: tr.z, scale: (outer ? 0.85 : 0.75) + (tr.r - 0.55) * 0.5, seed: i + 11, species };
      });
      env.forest = m.createForest(env.ctx || { THREE, isMobile }, placements);
      scene.add(env.forest.group); scene.remove(canopies, treeLines);
      // leaves drift down from under every crown, in the same oranges
      env.fall = createFallingLeaves(env.ctx || { isMobile }, placements.map(p => ({ x: p.x, z: p.z, h: 6.2 * p.scale, r: (p.species === 'rain' ? 4 : 2.4) * p.scale })));
      scene.add(env.fall.mesh);
    }).catch(err => console.warn('[trees]', err)) : null
  ]);
  return env;
}
