/* Museum of Memories — walkable build.
   Procedural scaffold museum: jetty → gateway → switchback descent →
   family wing → gap room → commons. Six sensory stations drive fog,
   light and the HUD. Desktop: pointer lock + WASD. Touch: drag to look,
   hold ● to walk. */
(function boot(tries) {
  const stage = document.getElementById('walk-stage');
  if (!stage) return;
  if (!window.THREE) {
    if (tries > 0) setTimeout(() => boot(tries - 1), 400);
    else { const o = document.getElementById('walk-overlay'); if (o) o.querySelector('p').textContent = 'RENDERER OFFLINE · THE BUILDING IS UNREACHABLE TODAY'; }
    return;
  }
  const T = window.THREE;

  const overlay = document.getElementById('walk-overlay');
  const startBtn = document.getElementById('walk-start');
  const hud = document.getElementById('walk-hud');
  const stEl = document.getElementById('walk-station');
  const dpEl = document.getElementById('walk-depth');
  const tpEl = document.getElementById('walk-temp');
  const noteEl = document.getElementById('walk-note');
  const exitBtn = document.getElementById('walk-exit');
  const goBtn = document.getElementById('walk-go');
  const isTouch = matchMedia('(hover:none)').matches;

  let renderer, scene, camera, sun, hemi;
  let built = false, live = false, raf = 0, lastT = 0;
  let yaw = 0, pitch = 0;
  const pos = { x: 0, y: 2.1, z: 28 };
  let groundY = 0.4;
  const keys = {};
  let touchGo = false;

  /* —— walkable floors (AABBs; highest within step window wins) —— */
  const floors = [];
  const addFloor = (x0, x1, z0, z1, y) => floors.push({ x0, x1, z0, z1, y });
  function floorAt(x, z, yRef) {
    let best = null;
    for (const f of floors) {
      if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 &&
          f.y <= yRef + 0.55 && f.y >= yRef - 1.7) {
        if (best === null || f.y > best) best = f.y;
      }
    }
    return best;
  }

  /* —— instancing helpers —— */
  const rodM = [], plankM = [], panelM = [], glassM = [], warmM = [], darkM = [];
  const _v = () => new T.Vector3(); const _q = () => new T.Quaternion();
  function pushBox(arr, cx, cy, cz, sx, sy, sz, ry = 0, rx = 0) {
    arr.push(new T.Matrix4().compose(
      new T.Vector3(cx, cy, cz),
      new T.Quaternion().setFromEuler(new T.Euler(rx, ry, 0)),
      new T.Vector3(sx, sy, sz)));
  }
  function bake(arr, mat) {
    if (!arr.length) return;
    const g = new T.BoxGeometry(1, 1, 1);
    const im = new T.InstancedMesh(g, mat, arr.length);
    arr.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
  }

  /* —— a stepped run along one axis, with rail —— */
  function run(x0, z0, x1, z1, y0, y1, w) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.abs(dx) + Math.abs(dz); // axis-aligned
    const alongX = Math.abs(dx) > Math.abs(dz);
    const n = Math.max(1, Math.round(len / 0.55));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const cx = x0 + dx * t, cz = z0 + dz * t;
      const y = y0 + (y1 - y0) * t;
      if (alongX) {
        pushBox(plankM, cx, y - 0.035, cz, 0.62, 0.07, w);
        addFloor(cx - 0.34, cx + 0.34, cz - w / 2, cz + w / 2, y);
      } else {
        pushBox(plankM, cx, y - 0.035, cz, w, 0.07, 0.62);
        addFloor(cx - w / 2, cx + w / 2, cz - 0.34, cz + 0.34, y);
      }
    }
    // sloped rail on both edges
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, my = (y0 + y1) / 2 + 1.05;
    const slope = Math.atan2(y1 - y0, len);
    const rl = Math.sqrt(len * len + (y1 - y0) * (y1 - y0));
    if (alongX) {
      const s = Math.sign(dx) || 1;
      pushBox(rodM, mx, my, mz - w / 2, rl, 0.06, 0.06, 0, 0); // will pitch via rz trick below
      rodM[rodM.length - 1] = new T.Matrix4().compose(
        new T.Vector3(mx, my, mz - w / 2),
        new T.Quaternion().setFromEuler(new T.Euler(0, 0, s * slope)),
        new T.Vector3(rl, 0.06, 0.06));
      rodM.push(new T.Matrix4().compose(
        new T.Vector3(mx, my, mz + w / 2),
        new T.Quaternion().setFromEuler(new T.Euler(0, 0, s * slope)),
        new T.Vector3(rl, 0.06, 0.06)));
    } else {
      const s = Math.sign(dz) || 1;
      pushBox(rodM, mx - w / 2, my, mz, 0.06, 0.06, rl, 0, -s * slope);
      pushBox(rodM, mx + w / 2, my, mz, 0.06, 0.06, rl, 0, -s * slope);
    }
  }
  function pad(cx, cz, y, s) { // flat square platform
    pushBox(plankM, cx, y - 0.035, cz, s, 0.07, s);
    addFloor(cx - s / 2, cx + s / 2, cz - s / 2, cz + s / 2, y);
  }

  /* —— point clusters (memories as luminaires) —— */
  const clusters = [];
  function cluster(cx, cy, cz, r, n, color, size) {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
      const rr = r * Math.cbrt(Math.random());
      p[i * 3] = cx + rr * Math.sin(b) * Math.cos(a);
      p[i * 3 + 1] = cy + rr * Math.cos(b) * 0.7;
      p[i * 3 + 2] = cz + rr * Math.sin(b) * Math.sin(a);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(p, 3));
    const m = new T.Points(g, new T.PointsMaterial({
      color, size: size || 0.14, transparent: true, opacity: 0.9,
      blending: T.AdditiveBlending, depthWrite: false
    }));
    scene.add(m); clusters.push(m);
  }

  /* —— build the museum —— */
  function build() {
    scene = new T.Scene();
    scene.fog = new T.Fog(0xc6d3da, 4, 150);
    camera = new T.PerspectiveCamera(72, 1, 0.08, 400);
    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    stage.prepend(renderer.domElement);

    hemi = new T.HemisphereLight(0xdfe8ee, 0x8fa3b0, 0.9);
    sun = new T.DirectionalLight(0xfff2df, 0.7);
    sun.position.set(30, 40, 20);
    scene.add(hemi, sun);

    const rodMat = new T.MeshLambertMaterial({ color: 0x3a4a58 });
    const plankMat = new T.MeshLambertMaterial({ color: 0x9aa4ac });
    const panelMat = new T.MeshBasicMaterial({ color: 0xcfe0ea, transparent: true, opacity: 0.09, side: T.DoubleSide, depthWrite: false });
    const glassMat = new T.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.14, side: T.DoubleSide, depthWrite: false });
    const warmMat = new T.MeshBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.85 });
    const darkMat = new T.MeshLambertMaterial({ color: 0x0a141c });
    const iceMat = new T.MeshLambertMaterial({ color: 0xbfe4f5, emissive: 0x16344a });
    const crateMat = new T.MeshLambertMaterial({ color: 0x8a5a33 });

    /* water — from below it reads as the waterline overhead */
    const water = new T.Mesh(new T.PlaneGeometry(600, 600),
      new T.MeshBasicMaterial({ color: 0x12384f, transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0;
    scene.add(water);

    /* JETTY (S1) — y 0.4, z 30 → 9, then steps up to the gateway door */
    run(0, 30, 0, 9, 0.4, 0.4, 2);
    run(0, 9, 0, 7, 0.4, 2.0, 2);

    /* GATEWAY platform (S2) — inside the crown, y 2 */
    pushBox(plankM, 0, 1.965, 2.8, 8, 0.07, 7.6);
    addFloor(-4, 4, -1, 6.6, 2);
    pushBox(plankM, -5.5, 1.965, 5.25, 3, 0.07, 1.5); // connector to NW corner
    addFloor(-7, -4, 4.5, 6, 2);
    // crown lattice
    [[-4, -1], [4, -1], [-4, 6.6], [4, 6.6]].forEach(([x, z]) => pushBox(rodM, x, 4.5, z, 0.09, 5, 0.09));
    pushBox(rodM, 0, 7, -1, 8.2, 0.09, 0.09); pushBox(rodM, 0, 7, 6.6, 8.2, 0.09, 0.09);
    pushBox(rodM, -4, 7, 2.8, 0.09, 0.09, 7.8); pushBox(rodM, 4, 7, 2.8, 0.09, 0.09, 7.8);

    /* SHAFT — x ±7, z −13..7, walls down to −25 */
    const wallTop = 7, wallBot = -25, wh = wallTop - wallBot, wy = (wallTop + wallBot) / 2;
    pushBox(panelM, -7, wy, -3, 0.12, wh, 20);
    pushBox(panelM, 7, wy, -3, 0.12, wh, 20);
    // south wall open below −21.4 (the ring-level door band)
    pushBox(panelM, 0, (2 + wallTop) / 2 + 0, -13, 14, wallTop - (-21.4), 0.12);
    panelM[panelM.length - 1] = new T.Matrix4().compose(
      new T.Vector3(0, (-21.4 + wallTop) / 2, -13), new T.Quaternion(),
      new T.Vector3(14, wallTop - (-21.4), 0.12));
    // north wall with jetty door (x −1.2..1.2, y 2..4.6)
    pushBox(panelM, -4.1, wy, 7, 5.8, wh, 0.12);
    pushBox(panelM, 4.1, wy, 7, 5.8, wh, 0.12);
    pushBox(panelM, 0, (wallBot + 2) / 2, 7, 2.4, 2 - wallBot, 0.12);
    pushBox(panelM, 0, (4.6 + wallTop) / 2, 7, 2.4, wallTop - 4.6, 0.12);
    // vertical rods + horizontal rings (4.4 m pitch)
    for (let x = -7; x <= 7; x += 3.5) { pushBox(rodM, x, wy, -13, 0.09, wh, 0.09); pushBox(rodM, x, wy, 7, 0.09, wh, 0.09); }
    for (let z = -13; z <= 7; z += 3.33) { pushBox(rodM, -7, wy, z, 0.09, wh, 0.09); pushBox(rodM, 7, wy, z, 0.09, wh, 0.09); }
    for (let y = 4.4; y >= -22; y -= 4.4) {
      pushBox(rodM, 0, y, -13, 14, 0.07, 0.07); pushBox(rodM, 0, y, 7, 14, 0.07, 0.07);
      pushBox(rodM, -7, y, -3, 0.07, 0.07, 20); pushBox(rodM, 7, y, -3, 0.07, 0.07, 20);
    }
    // ice-cap joint glow below the waterline
    { const pts = [];
      for (let y = -4.4; y >= -22; y -= 4.4) {
        for (let x = -7; x <= 7; x += 3.5) { pts.push(x, y, -13, x, y, 7); }
        for (let z = -13; z <= 7; z += 3.33) { pts.push(-7, y, z, 7, y, z); }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(pts), 3));
      scene.add(new T.Points(g, new T.PointsMaterial({ color: 0x7fd4ff, size: 0.2, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false })));
    }
    // shaft bottom slab
    pushBox(darkM, 0, -25.2, -3, 14, 0.3, 20);

    /* DESCENT (S3) — 8 switchback runs, 2 loops, y 2 → −24 */
    const NW = [-6.25, 5.25], SW = [-6.25, -12.25], SE = [6.25, -12.25], NE = [6.25, 5.25];
    const loop = [[NW, SW], [SW, SE], [SE, NE], [NE, NW], [NW, SW], [SW, SE], [SE, NE], [NE, NW]];
    const lens = loop.map(([a, b]) => Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]));
    const total = lens.reduce((s, l) => s + l, 0);
    let y = 2;
    loop.forEach(([a, b], i) => {
      const y1 = i === loop.length - 1 ? -24 : y - 26 * (lens[i] / total);
      pad(a[0], a[1], y, 1.5);
      run(a[0], a[1], b[0], b[1], y, y1, 1.5);
      y = y1;
    });
    pad(NW[0], NW[1], -24, 1.5);
    /* ring at −24 (flat perimeter) + south door bridge */
    run(NW[0], NW[1], SW[0], SW[1], -24, -24, 1.5);
    run(SW[0], SW[1], SE[0], SE[1], -24, -24, 1.5);
    run(SE[0], SE[1], NE[0], NE[1], -24, -24, 1.5);
    run(NE[0], NE[1], NW[0], NW[1], -24, -24, 1.5);
    addFloor(-1.2, 1.2, -13.6, -11.5, -24);
    pushBox(plankM, 0, -24.035, -12.55, 2.4, 0.07, 2.1);

    /* hanging glass rooms + memory clusters in the void */
    [[0, -6, -3, 3.4], [3, -12, -7, 2.8], [-3.2, -17, -4, 3]].forEach(([x, yy, z, s]) => pushBox(glassM, x, yy, z, s, s, s));
    cluster(0, -6, -3, 1.4, 90, 0x9fd8ff);
    cluster(3, -12, -7, 1.2, 80, 0x9fd8ff);
    cluster(-3.2, -17, -4, 1.2, 70, 0x9fd8ff);
    cluster(0, -26.5, -3, 4.5, 220, 0x5fa8d8, 0.12); // the sunk archive below the ring

    /* FAMILY WING (S4) — corridor z −13.6 → −31 at −24 */
    run(0, -13.6, 0, -31, -24, -24, 2.4);
    pushBox(panelM, -1.3, -22.6, -22.3, 0.1, 3.2, 17.4);
    pushBox(panelM, 1.3, -22.6, -22.3, 0.1, 3.2, 17.4);
    const roomZ = [-16.5, -20.5, -24.5, -28.5];
    roomZ.forEach((zc, i) => {
      const sideX = i % 2 ? -2.9 : 2.9;
      pushBox(glassM, sideX, -22.6, zc, 3.4, 3.2, 3.4);
      pad(sideX, zc, -24, 3.2);
      // door floor between corridor and room
      addFloor(Math.min(0, sideX) - 0.4, Math.max(0, sideX) + 0.4, zc - 1, zc + 1, -24);
      cluster(sideX, -22.4, zc, 1.1, 60, 0xbfe6ff);
    });
    const wing1 = new T.PointLight(0x5f9fd0, 0.7, 12); wing1.position.set(0, -22.2, -18); scene.add(wing1);
    const wing2 = new T.PointLight(0x5f9fd0, 0.7, 12); wing2.position.set(0, -22.2, -27); scene.add(wing2);

    /* stair to GAP ROOM — z −31 → −41, y −24 → −29 */
    run(0, -31, 0, -41, -24, -29, 2.4);
    pushBox(panelM, -1.3, -25.9, -36, 0.1, 5.8, 10);
    pushBox(panelM, 1.3, -25.9, -36, 0.1, 5.8, 10);

    /* GAP ROOM (S5) — z −41..−47 at −29; one exhibit, lit twice */
    addFloor(-3.5, 3.5, -47, -41, -29);
    pushBox(plankM, 0, -29.035, -44, 7, 0.07, 6);
    pushBox(panelM, -3.5, -27.4, -44, 0.1, 3.4, 6);
    pushBox(panelM, 3.5, -27.4, -44, 0.1, 3.4, 6);
    pushBox(panelM, 0, -27.4, -47, 7, 3.4, 0.1);
    pushBox(darkM, 0, -28.6, -44, 0.7, 0.8, 0.7);      // pedestal
    pushBox(glassM, 0, -27.9, -44, 0.4, 0.4, 0.4);     // the memory
    const warmL = new T.PointLight(0xffa040, 1.1, 8); warmL.position.set(-1.6, -27.4, -44); scene.add(warmL);
    const coolL = new T.PointLight(0x66aaff, 1.1, 8); coolL.position.set(1.6, -27.4, -44); scene.add(coolL);

    /* stair to COMMONS — z −47 → −57, y −29 → −34 */
    run(0, -47, 0, -57, -29, -34, 2.4);
    pushBox(panelM, -1.3, -30.9, -52, 0.1, 5.8, 10);
    pushBox(panelM, 1.3, -30.9, -52, 0.1, 5.8, 10);

    /* COMMONS (S6) — z −57..−69, warm */
    addFloor(-5, 5, -69, -57, -34);
    pushBox(plankM, 0, -34.035, -63, 10, 0.07, 12);
    pushBox(panelM, -5, -32.2, -63, 0.1, 3.8, 12);
    pushBox(panelM, 5, -32.2, -63, 0.1, 3.8, 12);
    pushBox(panelM, 0, -32.2, -69, 10, 3.8, 0.1);
    // heater rack — the machine's rejected heat given as light
    for (let i = 0; i < 6; i++) pushBox(warmM, -2.5 + i, -31.4, -68.7, 0.8, 0.5, 0.12);
    pushBox(rodM, 0, -31.9, -68.6, 6.4, 0.08, 0.08);
    // crates + cushions + long table
    [[-3.2, -59.5, 0.9], [-2.3, -59.8, 0.7], [3.4, -61, 1.1], [3.9, -67.5, 0.8], [-3.8, -67, 1]].forEach(([x, z, s]) => {
      const c = new T.Mesh(new T.BoxGeometry(s, s, s), crateMat);
      c.position.set(x, -34 + s / 2, z); c.rotation.y = x * 1.7; scene.add(c);
    });
    pushBox(plankM, 0, -33.5, -63.5, 3.6, 0.1, 1.2);   // table
    [[-1, -62.3], [1, -62.3], [-1, -64.7], [1, -64.7]].forEach(([x, z]) =>
      pushBox(warmM, x, -33.9, z, 0.6, 0.12, 0.6));     // cushions
    const com1 = new T.PointLight(0xff9a4d, 1.2, 16); com1.position.set(0, -31.6, -63); scene.add(com1);
    const com2 = new T.PointLight(0xff9a4d, 0.8, 12); com2.position.set(0, -32, -68); scene.add(com2);
    cluster(0, -31.8, -60.5, 1.6, 50, 0xffc98a, 0.12);

    /* ICE — masses shouldering into the frame */
    const iceG = new T.IcosahedronGeometry(1, 1);
    [[-5, -5, -2, 3, 2, 2.4], [5.5, -12, -10, 2.6, 3.2, 2], [-5.8, -18, -7, 2, 2, 2],
     [0, -1, -12, 3.5, 2, 2.5], [2.2, -22.8, -18, 1.5, 1.5, 1.5], [-2.6, -28, -46, 1.4, 1.4, 1.4]
    ].forEach(([x, yy, z, a, b, c]) => {
      const m = new T.Mesh(iceG, iceMat);
      m.position.set(x, yy, z); m.scale.set(a, b, c);
      m.rotation.set(x * 0.7, yy * 0.3, z * 0.5);
      scene.add(m);
    });

    /* gateway lamp — the one warm lamp over the bylaws plate */
    const lamp = new T.PointLight(0xffb37a, 0.9, 9); lamp.position.set(0, 4, 3); scene.add(lamp);
    pushBox(warmM, 0, 3.4, 5.9, 0.5, 0.7, 0.06);        // bylaws plate

    bake(rodM, rodMat); bake(plankM, plankMat); bake(panelM, panelMat);
    bake(glassM, glassMat); bake(warmM, warmMat); bake(darkM, darkMat);
    built = true;
  }

  /* —— stations —— */
  const S = {
    S1: { k: 'S1 · THE CROSSING', t: '−12°C', n: 'engine, hull slap, wind — no music, ever' },
    S2: { k: 'S2 · THE GATEWAY', t: '−9°C', n: 'bare fingertip on the release — one deliberate discomfort' },
    S3: { k: 'S3 · THE DESCENT', t: '−1°C', n: 'daylight dies in the first four meters' },
    S4: { k: 'S4 · THE FAMILY WING', t: '+2°C', n: 'a room’s brightness IS its crowding' },
    S5: { k: 'S5 · THE GAP ROOM', t: '+2°C', n: 'two shadows that do not agree — the one hands-off room' },
    S6: { k: 'S6 · THE COMMONS', t: '+18°C', n: 'THE BYLAWS ARE REPRINTED · THE OLD PRINTING JOINS THE ARCHIVE' }
  };
  function stationAt(p) {
    if (p.z < -55) return 'S6';
    if (p.z < -39.5) return 'S5';
    if (p.z < -13.4) return 'S4';
    if (p.z < 8.4) return (p.y > 1.2 && p.z > -1.2) ? 'S2' : 'S3';
    return 'S1';
  }

  /* —— ambience (lerped each frame) —— */
  const cur = { fog: new T.Color(0xc6d3da), far: 150, hemiI: 0.9, sky: new T.Color(0xdfe8ee), grd: new T.Color(0x8fa3b0), sunI: 0.7 };
  const tgt = { fog: new T.Color(), far: 150, hemiI: 0.9, sky: new T.Color(), grd: new T.Color(), sunI: 0.7 };
  const AMB = {
    S1: { fog: 0xc6d3da, far: 150, hemiI: 0.9, sky: 0xdfe8ee, grd: 0x8fa3b0, sunI: 0.7 },
    S2: { fog: 0xb8c8d2, far: 110, hemiI: 0.8, sky: 0xd4e0e8, grd: 0x879aa8, sunI: 0.6 },
    S4: { fog: 0x050f18, far: 24, hemiI: 0.22, sky: 0x1d3852, grd: 0x060d14, sunI: 0 },
    S5: { fog: 0x040b12, far: 20, hemiI: 0.16, sky: 0x18304a, grd: 0x05090e, sunI: 0 },
    S6: { fog: 0x1a0d05, far: 30, hemiI: 0.5, sky: 0xffb37a, grd: 0x35180a, sunI: 0 }
  };
  const cA = new T.Color(0x9db8c8), cB = new T.Color(0x061421);
  const sA = new T.Color(0xbcd0dc), sB = new T.Color(0x0d2334);
  function setTargets(st) {
    if (st === 'S3') {
      const t = Math.min(1, Math.max(0, -pos.y / 24));
      tgt.fog.copy(cA).lerp(cB, t); tgt.far = 90 - 74 * t;
      tgt.hemiI = 0.8 - 0.55 * t; tgt.sky.copy(sA).lerp(sB, t);
      tgt.grd.set(0x0a1520); tgt.sunI = 0.6 * (1 - t);
    } else {
      const a = AMB[st];
      tgt.fog.set(a.fog); tgt.far = a.far; tgt.hemiI = a.hemiI;
      tgt.sky.set(a.sky); tgt.grd.set(a.grd); tgt.sunI = a.sunI;
    }
  }

  /* —— input —— */
  addEventListener('keydown', e => {
    if (!live) return;
    if (e.code === 'Escape') { exit(); return; }
    keys[e.code] = true;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  let dragging = false;
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
  // touch look
  let lastTouch = null;
  stage.addEventListener('touchstart', e => {
    if (!live) return;
    if (e.target === goBtn || e.target === exitBtn) return;
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

  /* —— movement + frame —— */
  function tick(dt) {
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
    let mx = 0, mz = 0;
    if (keys.KeyW || keys.ArrowUp || touchGo) { mx += fwdX; mz += fwdZ; }
    if (keys.KeyS || keys.ArrowDown) { mx -= fwdX; mz -= fwdZ; }
    if (keys.KeyA || keys.ArrowLeft) { mx -= rgtX; mz -= rgtZ; }
    if (keys.KeyD || keys.ArrowRight) { mx += rgtX; mz += rgtZ; }
    const l = Math.hypot(mx, mz);
    if (l > 0) {
      const sp = 3.6 * dt / l;
      const nx = pos.x + mx * sp, nz = pos.z + mz * sp;
      const fx = floorAt(nx, pos.z, groundY);
      if (fx !== null) { pos.x = nx; groundY = fx; }
      const fz = floorAt(pos.x, nz, groundY);
      if (fz !== null) { pos.z = nz; groundY = fz; }
    }
    pos.y += (groundY + 1.7 - pos.y) * Math.min(1, dt * 9);

    const st = stationAt(pos);
    setTargets(st);
    const k = Math.min(1, dt * 2.2);
    cur.fog.lerp(tgt.fog, k); cur.far += (tgt.far - cur.far) * k;
    cur.hemiI += (tgt.hemiI - cur.hemiI) * k;
    cur.sky.lerp(tgt.sky, k); cur.grd.lerp(tgt.grd, k);
    cur.sunI += (tgt.sunI - cur.sunI) * k;
    scene.fog.color.copy(cur.fog); scene.fog.far = cur.far;
    scene.fog.near = Math.min(4, cur.far * 0.1);
    renderer.setClearColor(cur.fog);
    hemi.intensity = cur.hemiI; hemi.color.copy(cur.sky); hemi.groundColor.copy(cur.grd);
    sun.intensity = cur.sunI;

    camera.position.set(pos.x, pos.y, pos.z);
    camera.quaternion.setFromEuler(new T.Euler(pitch, yaw, 0, 'YXZ'));
    renderer.render(scene, camera);

    if (stEl) {
      const info = S[st];
      stEl.textContent = info.k;
      const disp = pos.y >= 1.7 ? (groundY >= 0 ? groundY : 0) : groundY;
      const story = disp >= 0 ? disp : disp * 1.235; // −34 walks read as −42 story meters
      dpEl.textContent = (story >= 0 ? '+' : '−') + Math.abs(story).toFixed(1) + ' M';
      tpEl.textContent = info.t;
      noteEl.textContent = info.n;
      hud.classList.toggle('warm', st === 'S6');
    }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    tick(dt);
  }

  /* —— enter / exit —— */
  function size() {
    const w = stage.offsetWidth || 2, h = stage.offsetHeight || 2;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  let savedScroll = 0, stageHome = null;
  function enter(noLock) {
    if (!built) build();
    live = true;
    savedScroll = scrollY;
    // reparent to <body>: ancestors with backdrop-filter/transform would
    // otherwise become the containing block and cage the fixed stage
    if (!stageHome) stageHome = { parent: stage.parentElement, next: stage.nextSibling };
    document.body.appendChild(stage);
    stage.classList.add('live');
    document.body.classList.add('walking');
    overlay.hidden = true; hud.hidden = false;
    // reset player + input state
    pos.x = 0; pos.z = 28; groundY = 0.4; pos.y = 2.1; yaw = 0; pitch = 0;
    for (const k in keys) keys[k] = false;
    touchGo = false; dragging = false;
    size();
    lastT = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
    if (!isTouch && !noLock && stage.requestPointerLock) {
      try {
        const r = stage.requestPointerLock();
        if (r && r.catch) r.catch(() => {}); // no lock → drag-look fallback
      } catch (e) { /* drag-look fallback */ }
    }
  }
  function exit() {
    live = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    stage.classList.remove('live');
    if (stageHome) stageHome.parent.insertBefore(stage, stageHome.next);
    document.body.classList.remove('walking');
    overlay.hidden = false; hud.hidden = true;
    if (document.pointerLockElement === stage) document.exitPointerLock();
    scrollTo(0, savedScroll);
    size();
  }
  document.addEventListener('pointerlockchange', () => {
    if (live && !isTouch && document.pointerLockElement !== stage) exit();
  });
  if (startBtn) startBtn.addEventListener('click', () => enter());
  if (exitBtn) exitBtn.addEventListener('click', exit);
  addEventListener('resize', () => { if (renderer) size(); });

  // verification hook (harmless in production)
  window.__walk = {
    enter, exit, pos, floorAt, stationAt,
    tick: dt => tick(dt || 0.016),
    get live() { return live; },
    set ground(g) { groundY = g; },
    teleport(x, z, yRef) {
      pos.x = x; pos.z = z;
      const f = floorAt(x, z, yRef);
      if (f !== null) { groundY = f; pos.y = f + 1.7; }
      return f;
    }
  };
})(30);
