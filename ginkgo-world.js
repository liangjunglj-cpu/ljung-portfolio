/* ginkgo world — the compiled showcase_atrium fixture, playable.
   The layout is NOT hand-modelled: zones, route, rules and ending come
   from assets/ginkgo/showcase_atrium.json, exported straight from the
   Ginkgo solver (seed 0, spatial 0.8153). This file only realizes it. */
(function boot(tries) {
  const stage = document.getElementById('gk-stage');
  if (!stage) return;
  if (!window.THREE) {
    if (tries > 0) setTimeout(() => boot(tries - 1), 400);
    return;
  }
  const T = window.THREE;

  const overlay = document.getElementById('gk-overlay');
  const startBtn = document.getElementById('gk-start');
  const hud = document.getElementById('gk-hud');
  const zoneEl = document.getElementById('gk-zone');
  const objEl = document.getElementById('gk-obj');
  const obj2El = document.getElementById('gk-obj2');
  const noteEl = document.getElementById('gk-note');
  const exitBtn = document.getElementById('gk-exit');
  const goBtn = document.getElementById('gk-go');
  const jumpBtn = document.getElementById('gk-jump');
  const endEl = document.getElementById('gk-end');
  const endBody = document.getElementById('gk-end-body');
  const againBtn = document.getElementById('gk-again');
  const isTouch = matchMedia('(hover:none)').matches;

  let G = null;              // the compiled world data
  let renderer, scene, camera, hemi, sun, archiveLight, doorMesh;
  let built = false, live = false, raf = 0, lastT = 0;
  let yaw = -Math.PI / 2, pitch = 0;
  const pos = { x: 0, y: 1.6, z: 0 };
  let vy = 0, grounded = true;
  const keys = {};
  let touchGo = false, touchJump = false, dragging = false;
  let CX = 0, CZ = 0;
  const obstacles = [];      // {x0,x1,z0,z1,active}
  const state = { token: false, doorOpen: false, ended: false, visited: {} };
  let door = null;           // {x,z} door center for proximity
  let spawn = { x: 0, z: 0 };

  fetch('assets/ginkgo/showcase_atrium.json')
    .then(r => r.json())
    .then(j => { G = j; })
    .catch(() => { if (overlay) overlay.querySelector('p').textContent = 'COMPILED WORLD DATA UNREACHABLE'; });

  const wx = x => x - CX, wz = y => y - CZ;
  const ZTONE = {
    porch:     { f: 0xcabfa8, w: 0xd9d2c2, l: null },
    vestibule: { f: 0x8a8378, w: 0xa8a196, l: null },
    atrium:    { f: 0xd9cfbc, w: 0xe4dccd, l: 0xfff2df },
    gallery:   { f: 0xb8b0a0, w: 0xcfc8b8, l: 0xf4ead8 },
    alcove:    { f: 0x9a6b42, w: 0xb08050, l: 0xffb37a },
    archive:   { f: 0x24262b, w: 0x3a3d45, l: 0x6fa8ff }
  };

  function addObstacle(x0, x1, z0, z1) {
    const o = { x0, x1, z0, z1, active: true };
    obstacles.push(o);
    return o;
  }
  function blocked(x, z) {
    const r = 0.28;
    for (const o of obstacles) {
      if (o.active && x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return true;
    }
    return false;
  }
  function zoneAt(x, z) {
    for (const zn of G.zones) {
      if (x >= wx(zn.x) && x <= wx(zn.x + zn.w) && z >= wz(zn.y) && z <= wz(zn.y + zn.h)) return zn;
    }
    return null;
  }

  function label(text, x, y, z, scale, color) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.font = '600 64px IBM Plex Mono, monospace';
    g.textAlign = 'center';
    g.fillStyle = color || '#f4f1eb';
    g.fillText(text, 256, 84);
    const m = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, opacity: 0.85, depthWrite: false }));
    m.position.set(x, y, z);
    m.scale.set(scale * 4, scale, 1);
    scene.add(m);
    return m;
  }

  /* walls with door gaps: per zone edge, subtract door intervals */
  function edgeSegments(a0, a1, gaps) {
    const segs = [];
    let cur = a0;
    gaps.sort((p, q) => p[0] - q[0]);
    for (const [g0, g1] of gaps) {
      if (g0 > cur) segs.push([cur, Math.min(g0, a1)]);
      cur = Math.max(cur, g1);
    }
    if (cur < a1) segs.push([cur, a1]);
    return segs.filter(s => s[1] - s[0] > 0.12);
  }

  function build() {
    scene = new T.Scene();
    scene.fog = new T.Fog(0xe8e2d4, 4, 80);
    camera = new T.PerspectiveCamera(72, 1, 0.08, 300);
    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    stage.prepend(renderer.domElement);

    hemi = new T.HemisphereLight(0xf2ece0, 0x8f8878, 0.85);
    sun = new T.DirectionalLight(0xfff2df, 0.75);
    sun.position.set(20, 40, 14);
    scene.add(hemi, sun);

    const [bx0, by0, bx1, by1] = G.bounds;
    CX = (bx0 + bx1) / 2; CZ = (by0 + by1) / 2;

    // site slab
    const site = new T.Mesh(new T.BoxGeometry(bx1 - bx0 + 40, 0.3, by1 - by0 + 40),
      new T.MeshLambertMaterial({ color: 0xb6ad9a }));
    site.position.set(0, -0.2, 0);
    scene.add(site);
    // site fence (keeps play inside the compiled bounds + porch apron)
    const fx0 = wx(bx0) - 6, fx1 = wx(bx1) + 3, fz0 = wz(by0) - 5, fz1 = wz(by1) + 5;
    addObstacle(fx0 - 1, fx0, fz0, fz1); addObstacle(fx1, fx1 + 1, fz0, fz1);
    addObstacle(fx0, fx1, fz0 - 1, fz0); addObstacle(fx0, fx1, fz1, fz1 + 1);

    // doors between consecutive zones along the compiled procession
    const zmap = {};
    G.zones.forEach(z => { zmap[z.id] = z; });
    const doors = [];   // {between:[a,b], axis, at, c, w}
    for (let i = 0; i < G.procession.length - 1; i++) {
      const A = zmap[G.procession[i]], B = zmap[G.procession[i + 1]];
      // vertical boundary (A east ↔ B west) or horizontal
      const dxGap = Math.abs((A.x + A.w) - B.x);
      const dyGap = Math.abs((A.y + A.h) - B.y);
      const wDoor = B.id === 'archive' ? 1.3 : 1.7;
      if (dxGap < 1.2) {
        const oy0 = Math.max(A.y, B.y), oy1 = Math.min(A.y + A.h, B.y + B.h);
        doors.push({ between: [A.id, B.id], axis: 'x', at: (A.x + A.w + B.x) / 2, c: (oy0 + oy1) / 2, w: wDoor });
      } else if (dyGap < 1.2) {
        const ox0 = Math.max(A.x, B.x), ox1 = Math.min(A.x + A.w, B.x + B.w);
        doors.push({ between: [A.id, B.id], axis: 'z', at: (A.y + A.h + B.y) / 2, c: (ox0 + ox1) / 2, w: wDoor });
      }
    }

    // zones: floor, walls (with door gaps), ceiling, label, light
    const wallMatCache = {};
    for (const z of G.zones) {
      const tone = ZTONE[z.id] || ZTONE.gallery;
      const x0 = wx(z.x), x1 = wx(z.x + z.w), z0 = wz(z.y), z1 = wz(z.y + z.h);
      // floor
      const fl = new T.Mesh(new T.BoxGeometry(z.w, 0.12, z.h), new T.MeshLambertMaterial({ color: tone.f }));
      fl.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2);
      scene.add(fl);
      // walls: 4 edges; porch is open frame (no walls, just posts)
      const wm = wallMatCache[z.id] = new T.MeshBasicMaterial({
        color: tone.w, transparent: true, opacity: z.id === 'archive' ? 0.55 : 0.22, side: T.DoubleSide, depthWrite: false
      });
      const H = z.ht, HY = H / 2;
      const mkWallX = (atX, s0, s1) => { // wall along z at x=atX
        const m = new T.Mesh(new T.BoxGeometry(0.14, H, s1 - s0), wm);
        m.position.set(atX, HY, (s0 + s1) / 2);
        scene.add(m);
        addObstacle(atX - 0.07, atX + 0.07, s0, s1);
      };
      const mkWallZ = (atZ, s0, s1) => {
        const m = new T.Mesh(new T.BoxGeometry(s1 - s0, H, 0.14), wm);
        m.position.set((s0 + s1) / 2, HY, atZ);
        scene.add(m);
        addObstacle(s0, s1, atZ - 0.07, atZ + 0.07);
      };
      if (z.id !== 'porch') {
        // west edge (x0): gaps for doors on this boundary
        const gapsW = doors.filter(d => d.axis === 'x' && Math.abs(wx(d.at) - x0) < 0.8).map(d => [wz(d.c) - d.w / 2, wz(d.c) + d.w / 2]);
        edgeSegments(z0, z1, gapsW).forEach(([s0, s1]) => mkWallX(x0, s0, s1));
        const gapsE = doors.filter(d => d.axis === 'x' && Math.abs(wx(d.at) - x1) < 0.8).map(d => [wz(d.c) - d.w / 2, wz(d.c) + d.w / 2]);
        edgeSegments(z0, z1, gapsE).forEach(([s0, s1]) => mkWallX(x1, s0, s1));
        const gapsN = doors.filter(d => d.axis === 'z' && Math.abs(wz(d.at) - z0) < 0.8).map(d => [wx(d.c) - d.w / 2, wx(d.c) + d.w / 2]);
        edgeSegments(x0, x1, gapsN).forEach(([s0, s1]) => mkWallZ(z0, s0, s1));
        const gapsS = doors.filter(d => d.axis === 'z' && Math.abs(wz(d.at) - z1) < 0.8).map(d => [wx(d.c) - d.w / 2, wx(d.c) + d.w / 2]);
        edgeSegments(x0, x1, gapsS).forEach(([s0, s1]) => mkWallZ(z1, s0, s1));
        // ceiling (atrium gets glass, others solid-ish)
        const cm = new T.Mesh(new T.BoxGeometry(z.w, 0.1, z.h),
          new T.MeshBasicMaterial({ color: z.id === 'atrium' ? 0xbfd8e8 : tone.w, transparent: true, opacity: z.id === 'atrium' ? 0.16 : 0.4, depthWrite: false }));
        cm.position.set((x0 + x1) / 2, H, (z0 + z1) / 2);
        scene.add(cm);
      } else {
        // porch: four corner posts + flat canopy
        [[x0 + .3, z0 + .3], [x1 - .3, z0 + .3], [x0 + .3, z1 - .3], [x1 - .3, z1 - .3]].forEach(([px, pz]) => {
          const p = new T.Mesh(new T.BoxGeometry(0.18, z.ht, 0.18), new T.MeshLambertMaterial({ color: 0x5a5248 }));
          p.position.set(px, z.ht / 2, pz);
          scene.add(p);
        });
        const cp = new T.Mesh(new T.BoxGeometry(z.w, 0.12, z.h), new T.MeshLambertMaterial({ color: 0x8f8878 }));
        cp.position.set((x0 + x1) / 2, z.ht, (z0 + z1) / 2);
        scene.add(cp);
      }
      // zone label + light
      label(z.id.toUpperCase(), (x0 + x1) / 2, Math.min(z.ht - 0.3, 3.6), (z0 + z1) / 2, 0.9,
        z.id === 'archive' ? '#8fb8e8' : (z.id === 'alcove' ? '#ffb37a' : '#f4f1eb'));
      if (tone.l && z.id !== 'archive') {
        const L = new T.PointLight(tone.l, z.id === 'atrium' ? 1.0 : 0.8, Math.max(z.w, z.h) * 1.6);
        L.position.set((x0 + x1) / 2, z.ht * 0.7, (z0 + z1) / 2);
        scene.add(L);
      }
    }

    // atrium pendants + gallery wash accents (from the fixture's lighting story)
    const at = zmap.atrium;
    for (let i = 0; i < 3; i++) {
      const px = wx(at.x + at.w * (0.25 + 0.25 * i)), pz = wz(at.y + at.h / 2);
      const pd = new T.Mesh(new T.BoxGeometry(0.3, 0.5, 0.3), new T.MeshBasicMaterial({ color: 0xffd9a8 }));
      pd.position.set(px, at.ht - 1.6, pz);
      scene.add(pd);
    }

    // the archive light — off until the door opens
    const ar = zmap.archive;
    archiveLight = new T.PointLight(0x6fa8ff, 0, 9);
    archiveLight.position.set(wx(ar.x + ar.w / 2), ar.ht * 0.7, wz(ar.y + ar.h / 2));
    scene.add(archiveLight);
    // pedestal in the archive
    const ped = new T.Mesh(new T.BoxGeometry(0.7, 0.9, 0.7), new T.MeshLambertMaterial({ color: 0x15161a }));
    ped.position.set(wx(ar.x + ar.w / 2), 0.45, wz(ar.y + ar.h / 2));
    scene.add(ped);

    // the archive door — solid until opened
    const dd = doors.find(d => d.between[1] === 'archive');
    if (dd) {
      door = { x: dd.axis === 'x' ? wx(dd.at) : wx(dd.c), z: dd.axis === 'x' ? wz(dd.c) : wz(dd.at) };
      const dh = 2.4;
      doorMesh = new T.Mesh(
        dd.axis === 'x' ? new T.BoxGeometry(0.22, dh, dd.w) : new T.BoxGeometry(dd.w, dh, 0.22),
        new T.MeshLambertMaterial({ color: 0x1a1c22 }));
      doorMesh.position.set(door.x, dh / 2, door.z);
      scene.add(doorMesh);
      door.obstacle = dd.axis === 'x'
        ? addObstacle(door.x - 0.12, door.x + 0.12, door.z - dd.w / 2, door.z + dd.w / 2)
        : addObstacle(door.x - dd.w / 2, door.x + dd.w / 2, door.z - 0.12, door.z + 0.12);
    }

    // token plinth in the alcove
    const al = zmap.alcove;
    const tk = new T.Mesh(new T.BoxGeometry(0.4, 1.1, 0.4), new T.MeshLambertMaterial({ color: 0x6b4a28 }));
    tk.position.set(wx(al.x + al.w / 2), 0.55, wz(al.y + al.h / 2));
    scene.add(tk);
    const gem = new T.Mesh(new T.IcosahedronGeometry(0.16, 0), new T.MeshBasicMaterial({ color: 0xff7a2f }));
    gem.position.set(wx(al.x + al.w / 2), 1.35, wz(al.y + al.h / 2));
    scene.add(gem);
    scene.userData.gem = gem;

    // the compiler's own procession route, drawn on the floor
    const rp = G.route.map(([x, y]) => new T.Vector3(wx(x), 0.12, wz(y)));
    const routeLine = new T.Line(new T.BufferGeometry().setFromPoints(rp),
      new T.LineBasicMaterial({ color: 0xff4d00, transparent: true, opacity: 0.65 }));
    scene.add(routeLine);

    // spawn on the porch, facing down the procession
    const po = zmap.porch;
    spawn = { x: wx(po.x + po.w / 2), z: wz(po.y + po.h / 2) };
    built = true;
  }

  /* —— input (mirrors the museum walk) —— */
  addEventListener('keydown', e => {
    if (!live) return;
    if (e.code === 'Escape') { exit(); return; }
    keys[e.code] = true;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  stage.addEventListener('mousedown', e => {
    if (live && document.pointerLockElement !== stage && e.target.tagName !== 'BUTTON') dragging = true;
  });
  addEventListener('mouseup', () => { dragging = false; });
  addEventListener('mousemove', e => {
    if (!live) return;
    const locked = document.pointerLockElement === stage;
    if (!locked && !dragging) return;
    const k = locked ? 0.0022 : 0.0035;
    yaw -= e.movementX * k;
    pitch = Math.max(-1.35, Math.min(1.35, pitch - e.movementY * k));
  });
  let lastTouch = null;
  stage.addEventListener('touchstart', e => {
    if (!live || e.target.tagName === 'BUTTON') return;
    lastTouch = [e.touches[0].clientX, e.touches[0].clientY];
  }, { passive: true });
  stage.addEventListener('touchmove', e => {
    if (!live || !lastTouch) return;
    const t = e.touches[0];
    yaw -= (t.clientX - lastTouch[0]) * 0.0042;
    pitch = Math.max(-1.35, Math.min(1.35, pitch - (t.clientY - lastTouch[1]) * 0.0042));
    lastTouch = [t.clientX, t.clientY];
    e.preventDefault();
  }, { passive: false });
  stage.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });
  if (goBtn) {
    goBtn.addEventListener('touchstart', e => { touchGo = true; e.preventDefault(); }, { passive: false });
    goBtn.addEventListener('touchend', () => { touchGo = false; }, { passive: true });
  }
  if (jumpBtn) jumpBtn.addEventListener('touchstart', e => { touchJump = true; e.preventDefault(); }, { passive: false });

  /* —— per-zone ambience —— */
  const cur = { fog: new T.Color(0xe8e2d4), far: 80, hemiI: 0.85 };
  const AMB = {
    porch:     { fog: 0xe8e2d4, far: 90, hemiI: 0.9 },
    vestibule: { fog: 0xb8b0a2, far: 16, hemiI: 0.42 },
    atrium:    { fog: 0xf0e8d8, far: 70, hemiI: 1.0 },
    gallery:   { fog: 0xd8d0be, far: 40, hemiI: 0.7 },
    alcove:    { fog: 0x8a6844, far: 14, hemiI: 0.5 },
    archive:   { fog: 0x0c0e14, far: 12, hemiI: 0.2 }
  };

  const NOTES = {
    porch: 'the open porch — the compiler pinned this at (140, 60)',
    vestibule: 'a 2.4 m vestibule compresses the body before the release',
    atrium: 'the 8.5 m daylit atrium — compression, then release',
    gallery: 'slow circulation toward the private end of the plan',
    alcove: 'the oak reading alcove — privacy 0.85 · take the token',
    archive: 'the sealed basalt archive — the goal of play'
  };

  function fireRule(name, text) {
    if (noteEl) noteEl.textContent = 'RULE FIRED · ' + name + ' — ' + text;
  }

  function tick(dt, now) {
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
    let mx = 0, mz = 0;
    if (keys.KeyW || keys.ArrowUp || touchGo) { mx += fwdX; mz += fwdZ; }
    if (keys.KeyS || keys.ArrowDown) { mx -= fwdX; mz -= fwdZ; }
    if (keys.KeyA || keys.ArrowLeft) { mx -= rgtX; mz -= rgtZ; }
    if (keys.KeyD || keys.ArrowRight) { mx += rgtX; mz += rgtZ; }
    const l = Math.hypot(mx, mz);
    if (l > 0) {
      const sp = 3.4 * dt / l;
      const nx = pos.x + mx * sp, nz = pos.z + mz * sp;
      if (!blocked(nx, pos.z)) pos.x = nx;
      if (!blocked(pos.x, nz)) pos.z = nz;
    }
    if ((keys.Space || touchJump) && grounded) { vy = 4.6; grounded = false; }
    touchJump = false;
    if (!grounded) {
      vy -= 12 * dt;
      pos.y += vy * dt;
      if (pos.y <= 1.6) { pos.y = 1.6; vy = 0; grounded = true; }
    }

    // mechanics — straight from the compiled rules
    const zn = zoneAt(pos.x, pos.z);
    if (zn) state.visited[zn.id] = true;
    if (zn && zn.id === 'alcove' && !state.token) {
      state.token = true;
      fireRule('grant_archive_token', 'the alcove answers with a light cue');
      if (scene.userData.gem) scene.userData.gem.visible = false;
    }
    if (door && !state.doorOpen) {
      const d = Math.hypot(pos.x - door.x, pos.z - door.z);
      if (d < 1.5) {
        if (state.token) {
          state.doorOpen = true;
          door.obstacle.active = false;
          fireRule('open_archive', 'the reveal announces itself with light');
          if (archiveLight) archiveLight.intensity = 1.3;
        } else if (noteEl) {
          noteEl.textContent = 'THE DOOR IS SEALED — the reading alcove grants the archive token';
        }
      }
    }
    if (doorMesh && state.doorOpen && doorMesh.position.y > -2.5) doorMesh.position.y -= dt * 2.2;
    if (!state.ended && state.doorOpen && zn && zn.id === 'archive') {
      state.ended = true;
      if (endEl) {
        endEl.hidden = false;
        if (endBody) endBody.textContent =
          'zones visited ' + Object.keys(state.visited).length + '/' + G.zones.length +
          ' · spatial ' + G.score.toFixed(4) + ' · both compiled rules fired · ' +
          'this building was solved, not modelled.';
      }
    }
    if (scene.userData.gem && scene.userData.gem.visible) scene.userData.gem.rotation.y = now / 400;

    // ambience lerp
    const amb = AMB[zn ? zn.id : 'porch'];
    const k = Math.min(1, dt * 2.4);
    cur.fog.lerp(new T.Color(amb.fog), k);
    cur.far += (amb.far - cur.far) * k;
    cur.hemiI += (amb.hemiI - cur.hemiI) * k;
    scene.fog.color.copy(cur.fog);
    scene.fog.far = cur.far;
    scene.fog.near = Math.min(3, cur.far * 0.1);
    renderer.setClearColor(cur.fog);
    hemi.intensity = cur.hemiI;
    sun.intensity = zn && (zn.id === 'archive' || zn.id === 'alcove' || zn.id === 'vestibule') ? 0.1 : 0.7;

    camera.position.set(pos.x, pos.y, pos.z);
    camera.quaternion.setFromEuler(new T.Euler(pitch, yaw, 0, 'YXZ'));
    renderer.render(scene, camera);

    if (zoneEl) zoneEl.textContent = 'SHOWCASE_ATRIUM · ' + (zn ? zn.id.toUpperCase() : 'SITE');
    if (objEl) objEl.textContent = 'TOKEN ' + (state.token ? '●' : '○');
    if (obj2El) obj2El.textContent = state.doorOpen ? 'DOOR OPEN' : 'DOOR SEALED';
    if (noteEl && zn && !noteEl.textContent.startsWith('RULE') && !noteEl.textContent.startsWith('THE DOOR')) {
      noteEl.textContent = NOTES[zn.id] || '';
    }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    tick(dt, now);
  }

  function size() {
    const w = stage.offsetWidth || 2, h = stage.offsetHeight || 2;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function resetState() {
    state.token = false; state.doorOpen = false; state.ended = false; state.visited = {};
    if (door) door.obstacle.active = true;
    if (doorMesh) doorMesh.position.y = 1.2;
    if (archiveLight) archiveLight.intensity = 0;
    if (scene && scene.userData.gem) scene.userData.gem.visible = true;
    if (endEl) endEl.hidden = true;
    pos.x = spawn.x; pos.z = spawn.z; pos.y = 1.6;
    yaw = -Math.PI / 2; pitch = 0; vy = 0; grounded = true;
    if (noteEl) noteEl.textContent = '';
  }
  let savedScroll = 0, stageHome = null;
  function enter(noLock) {
    if (!G) return; // data still loading
    if (!built) build();
    live = true;
    savedScroll = scrollY;
    if (!stageHome) stageHome = { parent: stage.parentElement, next: stage.nextSibling };
    document.body.appendChild(stage);
    stage.classList.add('live');
    document.body.classList.add('walking');
    overlay.hidden = true; hud.hidden = false;
    resetState();
    for (const k in keys) keys[k] = false;
    touchGo = false; touchJump = false; dragging = false;
    size();
    lastT = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
    if (!isTouch && !noLock && stage.requestPointerLock) {
      try {
        const r = stage.requestPointerLock();
        if (r && r.catch) r.catch(() => {});
      } catch (e) {}
    }
  }
  function exit() {
    live = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    stage.classList.remove('live');
    if (stageHome) stageHome.parent.insertBefore(stage, stageHome.next);
    document.body.classList.remove('walking');
    overlay.hidden = false; hud.hidden = true;
    if (endEl) endEl.hidden = true;
    if (document.pointerLockElement === stage) document.exitPointerLock();
    scrollTo(0, savedScroll);
    if (renderer) size();
  }
  document.addEventListener('pointerlockchange', () => {
    if (live && !isTouch && document.pointerLockElement !== stage) exit();
  });
  if (startBtn) startBtn.addEventListener('click', () => enter());
  if (exitBtn) exitBtn.addEventListener('click', exit);
  if (againBtn) againBtn.addEventListener('click', () => resetState());
  addEventListener('resize', () => { if (renderer && live) size(); });

  // verification hook (harmless in production)
  window.__gk = {
    enter, exit, pos, state,
    tick: dt => tick(dt || 0.016, performance.now()),
    zoneAt: (x, z) => { const z2 = zoneAt(x, z); return z2 ? z2.id : null; },
    blocked,
    get data() { return G; },
    get live() { return live; },
    teleport(x, z) { pos.x = x; pos.z = z; }
  };
})(30);
