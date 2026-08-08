/* LIANG JUNG portfolio — interactions */
(() => {
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const SPLAT_URL = 'assets/world_basalt.spz';

  /* —— custom cursor —— */
  if (fine) {
    const dot = document.querySelector('.cursor');
    const ring = document.querySelector('.cursor-ring');
    let rx = innerWidth / 2, ry = innerHeight / 2, tx = rx, ty = ry;
    addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      dot.style.left = tx + 'px'; dot.style.top = ty + 'px';
    });
    (function follow() {
      rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(follow);
    })();
    document.querySelectorAll('a, button, .poly-frame img').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('is-hovering'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('is-hovering'));
    });
  }

  /* —— scroll progress —— */
  const bar = document.querySelector('.progress span');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  }, { passive: true });

  /* —— reveal on scroll (+ image wipes) —— */
  document.querySelectorAll('.p-gallery figure, .p-hero.poly-frame, .hs-panel').forEach((f, i) => {
    f.classList.add('wipe', 'reveal');
    f.style.transitionDelay = (i % 3) * 0.1 + 's';
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  // fallback: never leave content hidden if IO doesn't fire (old browsers, throttled tabs)
  const revealVisible = () => document.querySelectorAll('.reveal:not(.in)').forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight * 1.05) el.classList.add('in');
  });
  setTimeout(revealVisible, 1500);
  addEventListener('scroll', revealVisible, { passive: true });

  /* —— hero parallax —— */
  const heroInner = document.querySelector('.hero-inner');
  const heroCanvas = document.getElementById('splats');
  addEventListener('scroll', () => {
    if (!heroInner) return;
    const y = scrollY;
    if (y < innerHeight * 1.2) {
      heroInner.style.transform = `translateY(${y * 0.22}px)`;
      heroInner.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.9));
      if (heroCanvas) heroCanvas.style.transform = `translateY(${y * 0.4}px)`;
    }
  }, { passive: true });

  /* —— tilt cards —— */
  if (fine) document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = '');
  });

  /* —— lightbox —— */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  document.querySelectorAll('.poly-frame img').forEach(img => {
    img.addEventListener('click', () => {
      lbImg.src = img.src; lbImg.alt = img.alt; lb.classList.add('open');
    });
  });
  const closeLb = () => lb.classList.remove('open');
  lb.addEventListener('click', closeLb);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });

  /* —— horizontal scroll archive —— */
  const hs = document.getElementById('archive');
  const track = document.getElementById('hscroll-track');
  const hsProg = document.getElementById('hs-progress');
  if (hs && track) {
    let extra = 0;
    const layout = () => {
      if (innerWidth <= 920) { hs.style.height = 'auto'; track.style.transform = ''; return; }
      extra = Math.max(0, track.scrollWidth - innerWidth * 0.92);
      hs.style.height = (innerHeight + extra) + 'px';
    };
    layout();
    addEventListener('resize', layout);
    addEventListener('load', layout);
    track.querySelectorAll('img').forEach(im => im.addEventListener('load', layout));
    addEventListener('scroll', () => {
      if (innerWidth <= 920 || !extra) return;
      const r = hs.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / (total || 1)));
      track.style.transform = `translateX(${-p * extra}px)`;
      if (hsProg) hsProg.textContent = '▸ ' + String(Math.round(p * 100)).padStart(2, '0') + '%';
    }, { passive: true });
  }

  /* —— chestnut: live gaussian splat, scroll-orbit, 2D fallback —— */
  const stage = document.getElementById('splat-stage');
  const cc = document.getElementById('chestnut-canvas');
  const statusEl = document.getElementById('splat-status');
  const angleEl = document.getElementById('splat-angle');
  let fallbackStarted = false;

  function startFallback(msg) {
    if (fallbackStarted || !cc) return;
    fallbackStarted = true;
    if (stage) stage.style.display = 'none';
    if (statusEl && msg) statusEl.textContent = msg;
    const ctx = cc.getContext('2d');
    let W, H, t = 0;
    const resize = () => { W = cc.width = cc.offsetWidth * devicePixelRatio; H = cc.height = cc.offsetHeight * devicePixelRatio; };
    resize(); addEventListener('resize', resize);
    const P = [];
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.pow(Math.random(), .5);
      P.push({ a, rr, y: (Math.random() - .5), s: .5 + Math.random() * 2.2, warm: Math.random() < .3, o: .25 + Math.random() * .65 });
    }
    (function draw() {
      t += 0.0022;
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        const ang = p.a + t;
        const x3 = Math.cos(ang) * p.rr, z3 = Math.sin(ang) * p.rr;
        const depth = (z3 + 1.4) / 2.4;
        const px = W / 2 + x3 * W * .42;
        const py = H * .55 + p.y * H * .5 * depth - p.rr * H * .12;
        const s = p.s * depth * devicePixelRatio * 2.2;
        ctx.globalAlpha = p.o * depth;
        ctx.fillStyle = p.warm ? '#FF4D00' : (depth > .6 ? '#e8e4dc' : '#7a90a8');
        ctx.beginPath(); ctx.ellipse(px, py, s * 1.6, s, ang, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    })();
  }

  function initSplat() {
    const T = window.THREE;
    const GS3D = window['Gaussian Splats 3D'];
    if (!stage || !T || !GS3D || !GS3D.DropInViewer) { startFallback('SPLAT RENDERER OFFLINE · PARTICLE FALLBACK'); return; }
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { startFallback('WEBGL UNAVAILABLE · PARTICLE FALLBACK'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x0d0d0f, 1);
    stage.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(58, 1, 0.1, 500);
    const size = () => {
      const w = stage.offsetWidth || 2, h = stage.offsetHeight || 2;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    size();
    addEventListener('resize', size); addEventListener('load', size);

    const viewer = new GS3D.DropInViewer({ gpuAcceleratedSort: false, sharedMemoryForWorkers: false });
    const watchdog = setTimeout(() => startFallback('SPLAT LOAD TIMED OUT · PARTICLE FALLBACK'), 25000);

    viewer.addSplatScenes([{
      path: SPLAT_URL,
      format: GS3D.SceneFormat ? GS3D.SceneFormat.Spz : undefined,
      splatAlphaRemovalThreshold: 5
    }], false).then(() => {
      clearTimeout(watchdog);
      if (fallbackStarted) return;
      viewer.rotation.x = Math.PI; // Marble/3DGS Y-down → three.js Y-up
      scene.add(viewer);
      const n = viewer.splatMesh?.getSplatCount?.() || 0;
      if (statusEl) statusEl.textContent = 'LIVE · ' + n.toLocaleString() + ' GAUSSIANS · WORLD LABS MARBLE → SPZ';

      let angle = 0, targetAngle = 0, radius = 4.6, height = 1.4;
      // debug/verification hook (harmless in production)
      window.__splat = { renderAt(a) {
        camera.position.set(Math.sin(a) * radius, height, Math.cos(a) * radius);
        camera.lookAt(0, 0.3, 0);
        viewer.update ? viewer.update() : null;
        renderer.render(scene, camera);
        return renderer.domElement;
      }, viewer, scene, camera, renderer };
      const section = document.getElementById('splat-section');
      addEventListener('scroll', () => {
        if (!section) return;
        const r = section.getBoundingClientRect();
        const total = Math.max(1, r.height - innerHeight);
        const p = Math.min(1, Math.max(0, -r.top / total));
        targetAngle = p * Math.PI * 2.2;   // ~400° over the section
      }, { passive: true });

      (function orbit() {
        requestAnimationFrame(orbit);
        angle += (targetAngle - angle) * 0.07 + 0.0008; // scroll-driven + idle drift
        camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
        camera.lookAt(0, 0.3, 0);
        renderer.render(scene, camera);
        if (angleEl) {
          const deg = Math.round(((angle * 180 / Math.PI) % 360 + 360) % 360);
          angleEl.textContent = 'θ ' + String(deg).padStart(3, '0') + '°';
        }
      })();
    }).catch(err => {
      clearTimeout(watchdog);
      console.warn('splat load failed', err);
      startFallback('SPLAT LOAD FAILED · PARTICLE FALLBACK');
    });
  }
  // three.js + lib may still be loading (defer/CDN) — poll up to 12s, then fall back
  (function waitLibs(tries) {
    if (window.THREE && window['Gaussian Splats 3D']) initSplat();
    else if (tries <= 0) startFallback('SPLAT RENDERER OFFLINE · PARTICLE FALLBACK');
    else setTimeout(() => waitLibs(tries - 1), 400);
  })(30);

  /* —— hero floating mesh (landing page): moon world collider as wireframe —— */
  const heroStage = document.getElementById('hero3d');
  const heroStatus = document.getElementById('hero3d-status');
  function initHeroMesh() {
    const T = window.THREE;
    if (!heroStage || !T) { if (heroStatus) heroStatus.textContent = 'MESH · OFFLINE'; return; }
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { if (heroStatus) heroStatus.textContent = 'MESH · NO WEBGL'; return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    heroStage.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(0, 0, 7);
    const size = () => {
      const w = heroStage.offsetWidth || 2, h = heroStage.offsetHeight || 2;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    size(); addEventListener('resize', size); addEventListener('load', size);

    // abstract form study — noise-displaced icosphere, kin to the "abstract forms" mesh studies
    const geo = new T.IcosahedronGeometry(1.7, 5);
    const pos = geo.attributes.position;
    const v = new T.Vector3();
    const base = [];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n =
        0.42 * Math.sin(v.x * 2.1 + 1.3) * Math.sin(v.y * 1.7 - 0.6) +
        0.28 * Math.sin(v.y * 3.3 + v.z * 2.2) +
        0.18 * Math.sin(v.z * 4.1 - v.x * 2.7);
      v.multiplyScalar(1 + n * 0.45);
      pos.setXYZ(i, v.x, v.y, v.z);
      base.push(v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const group = new T.Group();
    const wire = new T.MeshBasicMaterial({ color: 0xFF4D00, wireframe: true, transparent: true, opacity: 0.26 });
    const ghost = new T.MeshBasicMaterial({ color: 0x161410, wireframe: true, transparent: true, opacity: 0.06 });
    group.add(new T.Mesh(geo, wire));
    const shell = new T.Mesh(geo.clone(), ghost);
    shell.scale.setScalar(1.12);
    group.add(shell);
    group.position.x = 1.9; // float right of the hero text
    scene.add(group);
    if (heroStatus) heroStatus.textContent = 'MESH · ABSTRACT FORM STUDY · ' + pos.count + ' VERTICES';

    let t = 0;
    (function spin() {
      requestAnimationFrame(spin);
      t += 0.0016;
      // slow breathing of the form
      const p = group.children[0].geometry.attributes.position;
      const breathe = 1 + Math.sin(t * 2.1) * 0.015;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, base[i*3] * breathe, base[i*3+1] * breathe, base[i*3+2] * breathe);
      p.needsUpdate = true;
      const sy = Math.min(scrollY / innerHeight, 1.4);
      group.rotation.y = t + sy * 2.4;         // scroll accelerates the turn
      group.rotation.x = 0.25 + Math.sin(t * 0.7) * 0.06;
      group.position.y = Math.sin(t * 1.3) * 0.14 - sy * 1.2; // gentle float, sinks on scroll
      renderer.render(scene, camera);
    })();
  }
  (function waitHero(tries) {
    if (!heroStage) return;
    if (window.THREE) initHeroMesh();
    else if (tries <= 0) { if (heroStatus) heroStatus.textContent = 'MESH · OFFLINE'; }
    else setTimeout(() => waitHero(tries - 1), 400);
  })(30);

  /* —— typed world prompts — real prompts from the Chestnut manifest —— */
  const prompts = [
    'iceland basalt formation with ice',
    'surface of moon in space, planets in the distance',
    'urban landscape by the sea with houses by the beach',
    'futuristic building with plants',
    'urban landscape with open fields, lakes and bridges'
  ];
  const line = document.getElementById('cp-line');
  if (line) {
    let pi = 0, ci = 0, del = false;
    (function type() {
      const cur = prompts[pi];
      line.textContent = cur.slice(0, ci);
      if (!del && ci < cur.length) { ci++; setTimeout(type, 42); }
      else if (!del) { del = true; setTimeout(type, 2600); }
      else if (ci > 0) { ci--; setTimeout(type, 14); }
      else { del = false; pi = (pi + 1) % prompts.length; setTimeout(type, 500); }
    })();
  }

  /* —— scrollytelling steps: nearest to viewport center is active —— */
  const allSteps = [...document.querySelectorAll('[data-steps] .step')];
  if (allSteps.length) {
    const pickActive = () => {
      const mid = innerHeight * 0.5;
      let best = null, bestD = Infinity;
      for (const s of allSteps) {
        const r = s.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) { s.classList.remove('active'); continue; }
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD) { bestD = d; best = s; }
      }
      allSteps.forEach(s => s.classList.toggle('active', s === best));
    };
    addEventListener('scroll', pickActive, { passive: true });
    addEventListener('load', pickActive);
    pickActive();
  }

  /* —— simulation helpers —— */
  function simCanvas(id) {
    const cv = document.getElementById(id);
    if (!cv) return null;
    const ctx = cv.getContext('2d');
    const state = { cv, ctx, W: 0, H: 0 };
    const resize = () => { state.W = cv.width = cv.offsetWidth * devicePixelRatio; state.H = cv.height = cv.offsetHeight * devicePixelRatio; };
    resize(); addEventListener('resize', resize); addEventListener('load', resize);
    return state;
  }
  const MONO = 'IBM Plex Mono, monospace';

  /* —— SIM 1 · wasp-mcp: prompt → nodes wired → aggregation → capture —— */
  (function simWasp() {
    const s = simCanvas('sim-wasp'); if (!s) return;
    const phaseEl = document.getElementById('sim-wasp-phase');
    const PROMPT = 'build a stochastic aggregation of 60 L-shaped parts';
    const CYCLE = 13000;
    const nodes = [
      { x: .08, y: .32, w: .13, label: 'PART' },
      { x: .08, y: .58, w: .13, label: 'RULES' },
      { x: .30, y: .45, w: .16, label: 'AGGREGATION' },
      { x: .55, y: .45, w: .12, label: 'BAKE' }
    ];
    const wires = [[0, 2], [1, 2], [2, 3]];
    const blocks = [];
    let seed = 42;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 46; i++) {
      blocks.push({ gx: Math.floor(rnd() * 7) - 3, gy: Math.floor(rnd() * 5) - 2, gz: Math.floor(rnd() * 4) });
    }
    blocks.sort((a, b) => (a.gz - b.gz) || (a.gy - b.gy));
    function draw(now) {
      requestAnimationFrame(draw);
      const { ctx, W, H } = s; if (!W) return;
      const t = (now % CYCLE) / CYCLE;
      ctx.clearRect(0, 0, W, H);
      const u = W / 1000; // unit scale
      // phase text
      let phase;
      if (t < .22) phase = '01 SPEAK · PROMPT → INTENT';
      else if (t < .45) phase = '02 PLACE · COMPONENTS ON THE LIVE CANVAS';
      else if (t < .82) phase = '03 RUN · WASP AGGREGATION';
      else phase = '04 SEE · VIEWPORT CAPTURE → CLAUDE';
      if (phaseEl) phaseEl.textContent = '// SIMULATION · ' + phase;
      // prompt line
      const nChars = Math.floor(Math.min(1, t / .2) * PROMPT.length);
      ctx.font = (13 * u * 1.6) + 'px ' + MONO;
      ctx.fillStyle = '#e8e4dc';
      ctx.fillText('> ' + PROMPT.slice(0, nChars) + (t < .22 ? '▌' : ''), 30 * u, 56 * u);
      // nodes + wires (fade in during PLACE)
      nodes.forEach((n, i) => {
        const a = Math.min(1, Math.max(0, (t - .2 - i * .05) / .06));
        if (a <= 0) return;
        const x = n.x * W, y = n.y * H, w = n.w * W, h = 54 * u;
        ctx.globalAlpha = a;
        ctx.fillStyle = '#1c1c20'; ctx.strokeStyle = i === 2 ? '#FF4D00' : '#5a5a60';
        ctx.lineWidth = 1.5 * u;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 6 * u); ctx.fill(); ctx.stroke();
        ctx.fillStyle = i === 2 ? '#FF7A2F' : '#b8b4ac';
        ctx.font = (10 * u * 1.6) + 'px ' + MONO;
        ctx.fillText(n.label, x + 10 * u, y + 32 * u);
        ctx.globalAlpha = 1;
      });
      wires.forEach(([a, b], i) => {
        const al = Math.min(1, Math.max(0, (t - .3 - i * .04) / .05));
        if (al <= 0) return;
        const n1 = nodes[a], n2 = nodes[b];
        const x1 = (n1.x + n1.w) * W, y1 = n1.y * H + 27 * u;
        const x2 = n2.x * W, y2 = n2.y * H + 27 * u;
        ctx.globalAlpha = al; ctx.strokeStyle = '#FF4D00'; ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1 + 40 * u, y1, x2 - 40 * u, y2, x2, y2); ctx.stroke();
        ctx.globalAlpha = 1;
      });
      // aggregation (isometric cubes, right side)
      const nBlocks = Math.floor(Math.min(1, Math.max(0, (t - .45) / .35)) * blocks.length);
      const cx = W * .8, cy = H * .62, cs = 26 * u;
      for (let i = 0; i < nBlocks; i++) {
        const b = blocks[i];
        const ix = cx + (b.gx - b.gy) * cs * .9;
        const iy = cy + (b.gx + b.gy) * cs * .45 - b.gz * cs * .95;
        ctx.fillStyle = i === nBlocks - 1 ? '#FF4D00' : (b.gz % 2 ? '#e8e4dc' : '#b8b4ac');
        ctx.strokeStyle = '#0d0d0f'; ctx.lineWidth = 1.2 * u;
        // top
        ctx.beginPath(); ctx.moveTo(ix, iy - cs * .45); ctx.lineTo(ix + cs * .9, iy); ctx.lineTo(ix, iy + cs * .45); ctx.lineTo(ix - cs * .9, iy); ctx.closePath(); ctx.fill(); ctx.stroke();
        // sides
        ctx.fillStyle = i === nBlocks - 1 ? '#c23a00' : '#78746c';
        ctx.beginPath(); ctx.moveTo(ix - cs * .9, iy); ctx.lineTo(ix, iy + cs * .45); ctx.lineTo(ix, iy + cs * 1.05); ctx.lineTo(ix - cs * .9, iy + cs * .6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = i === nBlocks - 1 ? '#992e00' : '#55524c';
        ctx.beginPath(); ctx.moveTo(ix + cs * .9, iy); ctx.lineTo(ix, iy + cs * .45); ctx.lineTo(ix, iy + cs * 1.05); ctx.lineTo(ix + cs * .9, iy + cs * .6); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // capture flash
      if (t > .82) {
        const f = 1 - Math.min(1, (t - .82) / .06);
        if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f * .5})`; ctx.fillRect(0, 0, W, H); }
        ctx.strokeStyle = '#FF4D00'; ctx.lineWidth = 3 * u;
        ctx.strokeRect(8 * u, 8 * u, W - 16 * u, H - 16 * u);
        ctx.fillStyle = '#FF7A2F'; ctx.font = (11 * u * 1.6) + 'px ' + MONO;
        ctx.fillText('CAPTURE → CLAUDE · CRITIQUE · ITERATE', 30 * u, H - 34 * u);
      }
    }
    requestAnimationFrame(draw);
  })();

  /* —— SIM 2 · almond: generate → sag under physics → critique → corrected —— */
  (function simAlmond() {
    const s = simCanvas('sim-almond'); if (!s) return;
    const phaseEl = document.getElementById('sim-almond-phase');
    const CYCLE = 12000;
    const N = 11;
    function draw(now) {
      requestAnimationFrame(draw);
      const { ctx, W, H } = s; if (!W) return;
      const t = (now % CYCLE) / CYCLE;
      ctx.clearRect(0, 0, W, H);
      const u = W / 1000;
      let phase, sag = 0, corrected = 0;
      if (t < .25) { phase = '01 GENERATE · FLAT SPAN PROPOSED'; }
      else if (t < .5) { phase = '02 SIMULATE · KANGAROO / KARAMBA'; sag = Math.min(1, (t - .25) / .12); }
      else if (t < .68) { phase = '03 CRITIQUE · MID-SPAN OVERSTRESSED'; sag = 1; }
      else { phase = '04 REGENERATE · ARCH FOUND, CHECKS PASS'; sag = 1; corrected = Math.min(1, (t - .68) / .14); }
      if (phaseEl) phaseEl.textContent = '// SIMULATION · ' + phase;
      const x0 = W * .12, x1 = W * .88, yBase = H * .55;
      const reveal = t < .25 ? Math.min(1, t / .2) : 1;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1);
        const x = x0 + (x1 - x0) * f;
        const sagY = Math.sin(f * Math.PI) * H * .18 * sag;      // deflection
        const archY = -Math.sin(f * Math.PI) * H * .26 * corrected; // corrected catenary
        pts.push({ x, y: yBase + sagY * (1 - corrected) + archY });
      }
      // ground
      ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.moveTo(W * .06, yBase + H * .28); ctx.lineTo(W * .94, yBase + H * .28); ctx.stroke();
      // supports
      [pts[0], pts[N - 1]].forEach(p => {
        ctx.strokeStyle = '#b8b4ac';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, yBase + H * .28); ctx.stroke();
      });
      // members
      const nVis = Math.floor(reveal * (N - 1));
      for (let i = 0; i < nVis; i++) {
        const midSpan = Math.abs(i + 0.5 - (N - 1) / 2) < 2.5;
        const stressed = sag > .6 && corrected < .5 && midSpan;
        ctx.strokeStyle = stressed ? (Math.floor(now / 260) % 2 ? '#FF2200' : '#7a1000') : (corrected > .5 ? '#FF7A2F' : '#e8e4dc');
        ctx.lineWidth = (stressed ? 5 : 3.2) * u;
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke();
      }
      // nodes
      for (let i = 0; i <= nVis && i < N; i++) {
        ctx.fillStyle = '#f4f1eb';
        ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 5 * u, 0, 7); ctx.fill();
      }
      // load arrows during simulate
      if (sag > 0 && corrected < .8) {
        ctx.strokeStyle = '#7a90a8'; ctx.fillStyle = '#7a90a8'; ctx.lineWidth = 1.6 * u;
        for (let i = 2; i < N - 2; i += 2) {
          const p = pts[i], ay = p.y - H * .16;
          ctx.beginPath(); ctx.moveTo(p.x, ay); ctx.lineTo(p.x, p.y - 14 * u); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p.x, p.y - 8 * u); ctx.lineTo(p.x - 5 * u, p.y - 16 * u); ctx.lineTo(p.x + 5 * u, p.y - 16 * u); ctx.closePath(); ctx.fill();
        }
      }
      // readout
      ctx.font = (11 * u * 1.6) + 'px ' + MONO;
      ctx.fillStyle = '#b8b4ac';
      const defl = Math.round((sag * (1 - corrected)) * 312);
      const util = corrected > .5 ? Math.round(96 - corrected * 34) : Math.round(sag * 148);
      ctx.fillText('DEFLECTION ' + defl + ' MM', 30 * u, H - 58 * u);
      ctx.fillStyle = util > 100 ? '#FF2200' : '#7ac88a';
      ctx.fillText('UTILISATION ' + util + '% ' + (util > 100 ? '· FAIL' : '· OK'), 30 * u, H - 34 * u);
    }
    requestAnimationFrame(draw);
  })();

  /* —— SIM 3 · betelnut: geojson parcels → semantic buffer query → synthesis —— */
  (function simBetelnut() {
    const s = simCanvas('sim-betelnut'); if (!s) return;
    const phaseEl = document.getElementById('sim-betelnut-phase');
    const CYCLE = 12000;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const parcels = [];
    for (let i = 0; i < 16; i++) {
      const cx = .16 + rnd() * .66, cy = .2 + rnd() * .58, r = .035 + rnd() * .05;
      const verts = [];
      const n = 5 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        verts.push([cx + Math.cos(a) * r * (0.75 + rnd() * .5), cy + Math.sin(a) * r * (0.75 + rnd() * .5)]);
      }
      parcels.push({ cx, cy, verts });
    }
    const site = { x: .46, y: .5 };
    const road = [[.02, .82], [.22, .74], [.4, .78], [.62, .68], [.8, .72], [.98, .62]];
    function draw(now) {
      requestAnimationFrame(draw);
      const { ctx, W, H } = s; if (!W) return;
      const t = (now % CYCLE) / CYCLE;
      ctx.clearRect(0, 0, W, H);
      const u = W / 1000;
      let phase, bufR = 0;
      if (t < .22) phase = '01 LOAD · GEOJSON PARCELS + ROADS';
      else if (t < .5) { phase = '02 ASK · "WITHIN 200M OF THE SITE?"'; bufR = Math.min(1, (t - .22) / .2); }
      else if (t < .78) { phase = '03 SYNTHESIZE · BUFFER ∩ PARCELS'; bufR = 1; }
      else { phase = '04 DECIDE · TRAFFIC ON CUSTOM MODELS'; bufR = 1; }
      if (phaseEl) phaseEl.textContent = '// SIMULATION · ' + phase;
      // grid
      ctx.strokeStyle = 'rgba(232,228,220,.07)'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 56 * u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 56 * u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const R = bufR * W * .21;
      // parcels
      const nVis = Math.floor(Math.min(1, t / .18) * parcels.length);
      let inBuf = 0;
      for (let i = 0; i < nVis; i++) {
        const p = parcels[i];
        const d = Math.hypot((p.cx - site.x) * W, (p.cy - site.y) * H);
        const inside = bufR > .95 && d < R;
        if (inside) inBuf++;
        ctx.beginPath();
        p.verts.forEach(([vx, vy], k) => k ? ctx.lineTo(vx * W, vy * H) : ctx.moveTo(vx * W, vy * H));
        ctx.closePath();
        ctx.fillStyle = inside ? 'rgba(255,77,0,.4)' : 'rgba(122,144,168,.18)';
        ctx.strokeStyle = inside ? '#FF4D00' : '#7a90a8';
        ctx.lineWidth = (inside ? 2.2 : 1.2) * u;
        ctx.fill(); ctx.stroke();
      }
      // road
      ctx.strokeStyle = '#e8e4dc'; ctx.lineWidth = 2.4 * u; ctx.setLineDash([10 * u, 7 * u]);
      ctx.beginPath(); road.forEach(([x, y], k) => k ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)); ctx.stroke();
      ctx.setLineDash([]);
      // traffic dots in final phase
      if (t > .78) {
        for (let k = 0; k < 5; k++) {
          const f = ((now / 2200 + k / 5) % 1) * (road.length - 1);
          const i = Math.floor(f), fr = f - i;
          const x = (road[i][0] + (road[i + 1][0] - road[i][0]) * fr) * W;
          const y = (road[i][1] + (road[i + 1][1] - road[i][1]) * fr) * H;
          ctx.fillStyle = '#FF7A2F';
          ctx.beginPath(); ctx.arc(x, y, 5 * u, 0, 7); ctx.fill();
        }
      }
      // buffer ring + site
      if (bufR > 0) {
        ctx.strokeStyle = '#FF4D00'; ctx.lineWidth = 2 * u; ctx.setLineDash([6 * u, 6 * u]);
        ctx.beginPath(); ctx.arc(site.x * W, site.y * H, R, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = '#FF4D00';
      ctx.beginPath(); ctx.arc(site.x * W, site.y * H, 7 * u, 0, 7); ctx.fill();
      // readout
      ctx.font = (11 * u * 1.6) + 'px ' + MONO;
      ctx.fillStyle = '#b8b4ac';
      ctx.fillText('PARCELS ' + nVis + ' · IN BUFFER ' + inBuf + ' · R 200M', 30 * u, H - 34 * u);
    }
    requestAnimationFrame(draw);
  })();

  /* —— SIM 4 · ginkgo: live seeded layout solver — click to reseed —— */
  (function simGinkgo() {
    const s = simCanvas('sim-ginkgo'); if (!s) return;
    const phaseEl = document.getElementById('sim-ginkgo-phase');
    const stageEl = document.getElementById('ginkgo-stage');
    const INTENT = '{ "game_id": "showcase_atrium", "spaces": 6, "ending": "archive_unsealed" }';
    const ZONES = [
      { n: 'PORCH',     w: .13, h: .11, pin: true },
      { n: 'VESTIBULE', w: .10, h: .09 },
      { n: 'ATRIUM',    w: .19, h: .17, hero: true },
      { n: 'GALLERY',   w: .22, h: .10 },
      { n: 'ALCOVE',    w: .10, h: .09 },
      { n: 'ARCHIVE',   w: .12, h: .11, dark: true }
    ];
    const ADJ = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
    let seed = 7, t0 = performance.now(), Z = [], iter = 0;
    function reseed(ns) {
      seed = ((ns % 10000) + 10000) % 10000;
      let st = seed * 16807 + 1;
      const rnd = () => (st = (st * 16807) % 2147483647) / 2147483647;
      Z = ZONES.map(z => ({ ...z, x: .18 + rnd() * .62, y: .22 + rnd() * .55 }));
      Z[0].x = .12; Z[0].y = .30 + rnd() * .40; // porch pinned at the west edge
      t0 = performance.now(); iter = 0;
    }
    reseed(seed);
    if (stageEl) stageEl.addEventListener('click', () => reseed(seed + 1));
    function solveStep(k) {
      // attract adjacent pairs to touching distance, repel overlaps — the real solver's shape
      for (const [a, b] of ADJ) {
        const A = Z[a], B = Z[b];
        const dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 1e-4;
        const want = (A.w + B.w) / 2 + .015;
        const f = (d - want) * .5 * k;
        if (!A.pin) { A.x += dx / d * f; A.y += dy / d * f; }
        B.x -= dx / d * f * (A.pin ? 2 : 1); B.y -= dy / d * f * (A.pin ? 2 : 1);
      }
      for (let i = 0; i < Z.length; i++) for (let j = i + 1; j < Z.length; j++) {
        const A = Z[i], B = Z[j];
        const dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 1e-4;
        const min = (A.w + B.w) / 2 + .012;
        if (d < min) {
          const f = (min - d) * .5 * k;
          if (!A.pin) { A.x -= dx / d * f; A.y -= dy / d * f; }
          if (!B.pin) { B.x += dx / d * f; B.y += dy / d * f; }
        }
      }
      for (const z of Z) { z.x = Math.min(.92, Math.max(.08, z.x)); z.y = Math.min(.86, Math.max(.14, z.y)); }
    }
    function score() {
      let sat = 0;
      for (const [a, b] of ADJ) {
        const d = Math.hypot(Z[b].x - Z[a].x, Z[b].y - Z[a].y);
        const want = (Z[a].w + Z[b].w) / 2 + .015;
        sat += Math.max(0, 1 - Math.abs(d - want) * 4);
      }
      return sat / ADJ.length;
    }
    function draw(now) {
      requestAnimationFrame(draw);
      const { ctx, W, H } = s; if (!W) return;
      const el = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const u = W / 1000;
      let phase;
      if (el < 1.6) phase = '01 COMPILE · INTENT → GAMEMANIFEST';
      else if (el < 4.4) { phase = '02 SOLVE · ZONES SETTLING'; solveStep(.16); iter++; }
      else if (el < 6.0) phase = '03 REALIZE · DETERMINISTIC UE 5.8 PLAN';
      else phase = '04 VERIFY · TRAVERSAL + EVIDENCE';
      if (el > 14) { reseed(seed + 1); return; }
      if (phaseEl) phaseEl.textContent = '// LIVE SOLVER · ' + phase + ' · SEED ' + String(seed).padStart(4, '0') + ' · CLICK TO RESEED';
      // intent line typing
      const nChars = Math.floor(Math.min(1, el / 1.4) * INTENT.length);
      ctx.font = (11 * u * 1.6) + 'px ' + MONO;
      ctx.fillStyle = '#e8e4dc';
      ctx.fillText('> ' + INTENT.slice(0, nChars) + (el < 1.6 ? '▌' : ''), 26 * u, 46 * u);
      const showZones = el > 1.2;
      if (showZones) {
        // adjacency links
        ctx.strokeStyle = 'rgba(255,122,47,.6)'; ctx.lineWidth = 1.6 * u;
        ctx.setLineDash(el > 6 ? [] : [6 * u, 6 * u]);
        for (const [a, b] of ADJ) {
          ctx.beginPath(); ctx.moveTo(Z[a].x * W, Z[a].y * H); ctx.lineTo(Z[b].x * W, Z[b].y * H); ctx.stroke();
        }
        ctx.setLineDash([]);
        // zones
        Z.forEach((z, i) => {
          const x = (z.x - z.w / 2) * W, y = (z.y - z.h / 2) * H, w = z.w * W, h = z.h * H;
          ctx.fillStyle = z.dark ? '#26262c' : (z.hero ? 'rgba(255,77,0,.16)' : 'rgba(232,228,220,.08)');
          ctx.strokeStyle = z.dark ? '#7a90a8' : (z.hero ? '#FF4D00' : '#8a8a92');
          ctx.lineWidth = (z.hero ? 2.2 : 1.4) * u;
          ctx.beginPath(); ctx.roundRect(x, y, w, h, 4 * u); ctx.fill(); ctx.stroke();
          ctx.fillStyle = z.hero ? '#FF7A2F' : '#b8b4ac';
          ctx.font = (9 * u * 1.6) + 'px ' + MONO;
          ctx.fillText(z.n, x + 8 * u, y + 20 * u);
        });
      }
      // verify: walk a dot along the chain + readout
      if (el > 6.2) {
        const walk = ((el - 6.2) * .3) % 1 * ADJ.length;
        const li = Math.min(ADJ.length - 1, Math.floor(walk)), fr = walk - li;
        const [a, b] = ADJ[li];
        const px = (Z[a].x + (Z[b].x - Z[a].x) * fr) * W;
        const py = (Z[a].y + (Z[b].y - Z[a].y) * fr) * H;
        ctx.fillStyle = '#FF4D00';
        ctx.beginPath(); ctx.arc(px, py, 6 * u, 0, 7); ctx.fill();
        const sc = score();
        ctx.font = (11 * u * 1.6) + 'px ' + MONO;
        ctx.fillStyle = sc > .6 ? '#7ac88a' : '#FF7A2F';
        ctx.fillText('SPATIAL ' + sc.toFixed(4) + ' · 6/6 REACHABLE · ENDING archive_unsealed', 26 * u, H - 34 * u);
      } else if (el > 1.6) {
        ctx.font = (11 * u * 1.6) + 'px ' + MONO;
        ctx.fillStyle = '#b8b4ac';
        ctx.fillText('ITER ' + iter + ' · ADJACENCY ' + score().toFixed(4), 26 * u, H - 34 * u);
      }
    }
    requestAnimationFrame(draw);
  })();

  /* —— museum depth HUD: scroll = descent through the section —— */
  (function depthHud() {
    if (document.body.dataset.page !== 'museum') return;
    const hud = document.getElementById('depth-hud');
    if (!hud) return;
    const val = document.getElementById('depth-val');
    const zone = document.getElementById('depth-zone');
    const bar = document.getElementById('depth-bar');
    // scroll maps to the visitor sequence: +2 m gateway → −42 m commons
    // thresholds descend; the deepest matching label wins
    const STATIONS = [
      [0, 'THE DESCENT'], [-14, 'THE FAMILY WING'], [-26, 'THE GAP ROOM'], [-36, 'THE COMMONS']
    ];
    const update = () => {
      const h = document.documentElement;
      const p = Math.min(1, Math.max(0, h.scrollTop / (h.scrollHeight - h.clientHeight)));
      hud.classList.toggle('on', h.scrollTop > innerHeight * .25);
      const depth = 2 - p * 44; // +2 m to −42 m
      hud.classList.toggle('below', depth < 0);
      if (val) val.textContent = (depth >= 0 ? '+' : '−') + Math.abs(depth).toFixed(1) + ' M';
      if (bar) bar.style.width = (p * 100) + '%';
      if (zone) {
        let label = 'THE GATEWAY';
        for (const [d, n] of STATIONS) if (depth <= d) label = n;
        zone.textContent = label;
      }
    };
    addEventListener('scroll', update, { passive: true });
    update();
  })();

  /* —— hero splat field: orange gaussian-ish particles —— */
  const cv = document.getElementById('splats');
  if (cv) {
    const ctx = cv.getContext('2d');
    let W, H, pts = [], mx = -1e4, my = -1e4;
    const N = fine ? 130 : 60;
    const resize = () => {
      W = cv.width = cv.offsetWidth * devicePixelRatio;
      H = cv.height = cv.offsetHeight * devicePixelRatio;
    };
    resize(); addEventListener('resize', resize); addEventListener('load', resize);
    for (let i = 0; i < N; i++) pts.push({
      x: Math.random(), y: Math.random(),
      r: 1.5 + Math.random() * 5.5,
      vx: (Math.random() - .5) * .00035, vy: (Math.random() - .5) * .00035,
      o: .12 + Math.random() * .5,
      warm: Math.random() < .45
    });
    cv.parentElement.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height;
    });
    (function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -.05) p.x = 1.05; if (p.x > 1.05) p.x = -.05;
        if (p.y < -.05) p.y = 1.05; if (p.y > 1.05) p.y = -.05;
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        const push = Math.max(0, .12 - d) * .6;
        const px = (p.x + dx * push) * W, py = (p.y + dy * push) * H;
        const rad = p.r * devicePixelRatio * (1 + push * 18);
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad * 4);
        const c = p.warm ? '255,77,0' : '22,20,16';
        g.addColorStop(0, `rgba(${c},${p.o})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rad * 4, 0, 7); ctx.fill();
      }
      requestAnimationFrame(draw);
    })();
  }
})();
