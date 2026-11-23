/* LIANG JUNG — home: latest-work videos, the arcade (capsule · claw · bricks · air hockey),
   the plain index, field lightbox. No dependencies. */
(() => {
  'use strict';

  /* ———————————————————————— the twelve entries ———————————————————————— */
  const ITEMS = [
    { id: 'almond',   code: 'ALM', title: 'Almond',             cat: 'Tool',         yr: '2025—26', href: 'tools.html#p-almond',   img: 'assets/latest/almond_08.jpg',              about: 'Rhino MCP, now 0.8 stable: real-size parts, a native structural solver, and daylight and climate studies.' },
    { id: 'ginkgo',   code: 'GNK', title: 'Ginkgo',             cat: 'Tool',         yr: '2025—26', href: 'tools.html#p-ginkgo',   img: 'assets/latest/ginkgo_freiburg_orbit.jpg', about: 'A game compiler and a team of agents that build worlds from intent, or from a single phone photo.' },
    { id: 'kern',     code: 'KRN', title: 'Kern',               cat: 'Software',     yr: '2026',    href: 'tools.html#p-kern',     img: 'assets/latest/kern_promo.jpg',            about: 'A calm NURBS and solid modeller with a command prompt that asks for one thing at a time.' },
    { id: 'y2k',      code: 'Y2K', title: 'Project Y2K',        cat: 'Game',         yr: '2026',    href: 'y2k.html',              img: 'assets/latest/y2k_rei_game.jpg',          about: 'Anime action RPG in Unreal 5.8: ten operatives, one neon megacity, a city grown by script.' },
    { id: 'wasp',     code: 'WSP', title: 'wasp-mcp',           cat: 'Tool',         yr: '2025',    href: 'tools.html#p-wasp',     img: 'assets/wasp_canvas.png',                  about: 'Text prompt to a live Grasshopper canvas of discrete aggregation.' },
    { id: 'chestnut', code: 'CHS', title: 'Chestnut',           cat: 'Tool',         yr: '2025—26', href: 'tools.html#p-chestnut', img: 'assets/chestnut_app.jpg',                 about: 'Prompt to Gaussian-splat world to collider: generated space you can walk through.' },
    { id: 'unreal',   code: 'UE',  title: 'Unreal-MCP',         cat: 'Tool',         yr: '2026',    href: 'tools.html#p-unreal',   img: 'assets/unreal/ue_lattice_dusk.jpg',       about: 'A language model at the wheel of Unreal Engine: geometry, light and camera by conversation.' },
    { id: 'betelnut', code: 'BTL', title: 'Betelnut',           cat: 'App',          yr: '2025',    href: 'tools.html#p-betelnut', img: 'assets/betelnut_app.jpg',                 about: 'Map-first geospatial synthesis in the browser, for architects rather than GIS specialists.' },
    { id: 'studio',   code: 'CS1', title: 'Core Studio 01',     cat: 'Architecture', yr: '2025',    href: 'studio1.html',          img: 'assets/thumbs/studio.jpg',                about: 'Four exercises ending at MoMA Singapore: the inverted pyramid.' },
    { id: 'museum',   code: 'MOM', title: 'Museum of Memories', cat: 'Architecture', yr: '2026',    href: 'museum.html',           img: 'assets/thumbs/museum.jpg',                about: 'Core Studio 02, Bering Strait: an archive that rebuilds itself from what people remember.' },
    { id: 'art',      code: 'ART', title: 'Art & Field Notes',  cat: 'Art',          yr: '2024—26', href: 'art.html',              img: 'assets/thumbs/art.jpg',                   about: '@ljungart: watercolours, studies, sketches and process film.' },
    { id: 'dream',    code: 'DRM', title: 'The Dream Engine',   cat: 'Writing',      yr: '2026',    href: 'dream-engine.html',     img: 'assets/thumbs/dream.jpg',                 about: 'An essay on AI, taste, and why creation requires risk.' }
  ];
  ITEMS.forEach((it, i) => { it.no = String(i + 1).padStart(2, '0'); it.i = i; });
  const byId = Object.fromEntries(ITEMS.map(it => [it.id, it]));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ———————————————————————— plain index ———————————————————————— */
  const tb = document.getElementById('idx-body');
  if (tb) tb.innerHTML = ITEMS.map(it =>
    `<tr id="row-${it.id}"><td class="no">${it.no}</td><td class="ti"><a href="${it.href}">${esc(it.title)}</a></td>` +
    `<td class="cat">${esc(it.cat)}</td><td class="ab">${esc(it.about)}</td><td class="yr">${it.yr}</td></tr>`).join('');

  /* ———————————————————————— latest-work videos ———————————————————————— */
  const frames = [...document.querySelectorAll('[data-video]')];
  const vids = frames.map(f => {
    const v = f.querySelector('video');
    const bar = f.querySelector('.vbar');
    const tog = f.querySelector('[data-act="toggle"]');
    const snd = f.querySelector('[data-act="sound"]');
    const st = { v, userPaused: reduceMotion, visible: false };
    const load = () => { if (!v.getAttribute('src')) { v.src = v.dataset.src; } };
    const label = () => { if (tog) tog.textContent = v.paused ? 'PLAY' : 'PAUSE'; };
    v.addEventListener('play', label); v.addEventListener('pause', label);
    v.addEventListener('timeupdate', () => { if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%'; });
    if (tog) tog.addEventListener('click', () => {
      load();
      if (v.paused) { st.userPaused = false; v.play().catch(() => {}); }
      else { st.userPaused = true; v.pause(); }
    });
    if (snd) snd.addEventListener('click', () => {
      load();
      const on = v.muted;
      vids.forEach(o => { if (o.v !== v && !o.v.muted) { o.v.muted = true; const b = o.snd; if (b) b.textContent = 'SOUND'; } });
      v.muted = !on;
      snd.textContent = on ? 'MUTE' : 'SOUND';
      if (on && v.paused) { st.userPaused = false; v.play().catch(() => {}); }
    });
    st.load = load; st.snd = snd;
    if (reduceMotion && tog) tog.textContent = 'PLAY';
    return st;
  });
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { vids.find(s => s.v === e.target.querySelector('video')).load(); near.unobserve(e.target); }
    }), { rootMargin: '400px 0px' });
    const seen = new IntersectionObserver(es => es.forEach(e => {
      const s = vids.find(x => x.v === e.target.querySelector('video'));
      s.visible = e.intersectionRatio >= 0.35;
      if (s.visible && !s.userPaused) { s.load(); s.v.play().catch(() => {}); }
      else if (!s.visible) s.v.pause();
    }), { threshold: [0, 0.35, 0.6] });
    frames.forEach(f => { near.observe(f); seen.observe(f); });
  } else vids.forEach(s => s.load());

  /* ———————————————————————— field lightbox ———————————————————————— */
  const hl = document.getElementById('hl');
  if (hl) {
    const img = hl.querySelector('img'), cap = hl.querySelector('p'), btn = hl.querySelector('button');
    let last = null;
    const close = () => { hl.classList.remove('open'); if (last) last.focus(); };
    document.querySelectorAll('.field img').forEach(im => {
      im.tabIndex = 0;
      const open = () => {
        last = im; img.src = im.currentSrc || im.src; img.alt = im.alt;
        const fc = im.closest('figure').querySelector('figcaption');
        cap.textContent = fc ? fc.textContent : '';
        hl.classList.add('open'); btn.focus();
      };
      im.addEventListener('click', open);
      im.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    btn.addEventListener('click', close);
    hl.addEventListener('click', e => { if (e.target === hl) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && hl.classList.contains('open')) close(); });
  }

  /* ———————————————————————— the ticket ———————————————————————— */
  const KEY = 'lj-arcade';
  let got = new Set();
  try { const a = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(a)) got = new Set(a.filter(id => byId[id])); } catch (e) {}
  const tEl = document.getElementById('ticket'), tBody = document.getElementById('t-body'),
        tNo = document.getElementById('t-no'), tCount = document.getElementById('t-count'), tDots = document.getElementById('t-dots');
  function renderCount() {
    if (!tCount) return;
    tCount.textContent = `${got.size} / ${ITEMS.length} collected`;
    tDots.innerHTML = ITEMS.map(it => `<i class="${got.has(it.id) ? 'on' : ''}" title="${esc(it.title)}"></i>`).join('');
  }
  renderCount();
  function award(it, from) {
    if (!tBody) return;
    got.add(it.id);
    try { localStorage.setItem(KEY, JSON.stringify([...got])); } catch (e) {}
    tNo.textContent = '№ ' + it.no;
    tBody.innerHTML =
      `<p class="fig">${esc(from)} · ${esc(it.cat)} · ${it.yr}</p>` +
      `<h4>${esc(it.title)}</h4>` +
      `<div class="t-img"><img src="${it.img}" alt=""></div>` +
      `<p>${esc(it.about)}</p>` +
      `<a class="go" href="${it.href}">Enter the room →</a>`;
    tEl.classList.remove('pop'); void tEl.offsetWidth; tEl.classList.add('pop');
    renderCount();
    document.querySelectorAll('.idx-table tr.hot').forEach(r => r.classList.remove('hot'));
    const row = document.getElementById('row-' + it.id); if (row) row.classList.add('hot');
  }
  /* prefer something not yet collected */
  function pickFresh(pool) {
    const fresh = pool.filter(it => !got.has(it.id));
    const src = fresh.length ? fresh : pool;
    return src[Math.floor(Math.random() * src.length)];
  }

  /* ———————————————————————— drawing kit ———————————————————————— */
  const INK = '#111111', PAPER = '#ffffff', OR = '#FF4D00', SOFT = '#8a8a8a', HAIR = 'rgba(17,17,17,.16)';
  const mono = (px, w = 400) => `${w} ${Math.round(px)}px "IBM Plex Mono", ui-monospace, monospace`;
  const disp = (px, w = 700) => `${w} ${Math.round(px)}px "Space Grotesk", system-ui, sans-serif`;
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function text(c, s, x, y, font, color = INK, align = 'center', base = 'middle') {
    c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = base; c.fillText(s, x, y);
  }
  function fitText(c, s, maxW, font) { c.font = font; if (c.measureText(s).width <= maxW) return s;
    while (s.length > 1 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }

  /* ———————————————————————— M.01 CAPSULE ———————————————————————— */
  function Capsule() {
    const m = { name: 'Capsule machine', hint: 'Drag the crank round, or press TURN. Each capsule holds one project.',
      buttons: [{ act: 'turn', label: 'TURN ↻', primary: true }] };
    let W, H, cx, cy, R, r, base, knob, stage, portrait;
    let balls = [], crank = 0, turnT = 0, dragA = null, acc = 0, out = null, flash = 0;
    m.layout = (w, h) => {
      const fresh = !W; W = w; H = h; portrait = H > W * 0.95;
      R = portrait ? Math.min(W * 0.36, H * 0.25) : Math.min(W * 0.21, H * 0.33);
      cx = portrait ? W * 0.5 : W * 0.33; cy = R + 26;
      r = R * 0.2;
      const by0 = cy + R * 0.86, by1 = Math.min(H - 18, by0 + R * 1.05);
      base = { x0: cx - R * 1.02, x1: cx + R * 1.02, y0: by0, y1: by1 };
      knob = { x: cx - R * 0.25, y: (by0 + by1) / 2 + 4, r: Math.min(R * 0.26, (by1 - by0) * 0.34) };
      stage = portrait ? { x: W * 0.5, y: H * 0.5, R: R * 0.62 } : { x: W * 0.76, y: H * 0.5, R: Math.min(W * 0.11, H * 0.2) };
      if (fresh) balls = ITEMS.map(it => ({ it, x: cx + rand(-R * 0.5, R * 0.5), y: cy + rand(-R * 0.1, R * 0.5), vx: 0, vy: 0, a: rand(0, 6.28), va: 0 }));
      balls.forEach(b => { const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), lim = R - r - 4; if (d > lim) { b.x = cx + dx / d * lim; b.y = cy + dy / d * lim; } });
      if (out) out.dirty = true;
    };
    function stir(k) {
      balls.forEach(b => { b.vx += rand(-1, 1) * k; b.vy -= rand(0.3, 1) * k; b.va += rand(-4, 4); });
    }
    function dispense() {
      if (out && out.phase < 2) return;
      if (out) { const b = out.ball; b.x = cx + rand(-R * 0.3, R * 0.3); b.y = cy - R * 0.6; b.vx = 0; b.vy = 0; balls.push(b); }
      const it = pickFresh(balls.map(b => b.it));
      const b = balls.find(x => x.it === it);
      balls = balls.filter(x => x !== b);
      const outlet = { x: base.x1 - R * 0.28, y: base.y1 - R * 0.22 };
      out = { ball: b, t: 0, phase: 0, from: outlet };
      flash = 1;
    }
    m.press = act => { if (act === 'turn' && turnT <= 0) turnT = 0.85; };
    m.key = (k, down) => { if (down && (k === ' ' || k === 'Enter')) { m.press('turn'); return true; } return false; };
    m.down = (x, y) => {
      if (Math.hypot(x - knob.x, y - knob.y) < knob.r * 2) { dragA = Math.atan2(y - knob.y, x - knob.x); return true; }
      if (out && out.phase >= 1 && Math.hypot(x - stage.x, y - stage.y) < stage.R * 1.3) { location.href = out.ball.it.href; return true; }
      return false;
    };
    m.move = (x, y) => {
      if (dragA === null) return;
      const a = Math.atan2(y - knob.y, x - knob.x);
      let d = a - dragA; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      dragA = a;
      if (d > 0) { crank += d; acc += d; stir(d * 60); if (acc > Math.PI * 1.7) { acc = 0; dispense(); } }
    };
    m.up = () => { dragA = null; };
    m.tap = (x, y) => { if (Math.hypot(x - cx, y - cy) < R) stir(160); };
    m.step = dt => {
      if (turnT > 0) {
        const before = turnT; turnT -= dt; crank += dt * Math.PI * 2 / 0.85; stir(14);
        if (before > 0 && turnT <= 0) dispense();
      }
      const g = 1500 * (R / 160), sub = 3, h = dt / sub, lim = R - r - 3;
      for (let s = 0; s < sub; s++) {
        for (const b of balls) {
          b.vy += g * h; b.x += b.vx * h; b.y += b.vy * h; b.a += b.va * h; b.va *= 0.985;
          const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
          if (d > lim) {
            const nx = dx / d, ny = dy / d; b.x = cx + nx * lim; b.y = cy + ny * lim;
            const vn = b.vx * nx + b.vy * ny;
            if (vn > 0) { b.vx -= 1.35 * vn * nx; b.vy -= 1.35 * vn * ny; b.vx *= 0.97; b.vy *= 0.97; b.va += (b.vx * -ny + b.vy * nx) * 0.02; }
          }
        }
        for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
          const A = balls[i], B = balls[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = r * 2;
          if (d > 0 && d < min) {
            const nx = dx / d, ny = dy / d, o = (min - d) / 2;
            A.x -= nx * o; A.y -= ny * o; B.x += nx * o; B.y += ny * o;
            const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
            if (rv < 0) { const k = -(1.3) * rv / 2; A.vx -= k * nx; A.vy -= k * ny; B.vx += k * nx; B.vy += k * ny; }
          }
        }
      }
      if (out) {
        out.t += dt;
        if (out.phase === 0 && out.t > 0.75) { out.phase = 1; out.t = 0; award(out.ball.it, 'From the capsule machine'); }
        else if (out.phase === 1 && out.t > 0.55) { out.phase = 2; out.t = 0; }
      }
      flash = Math.max(0, flash - dt * 1.5);
    };
    function cap(c, x, y, rad, ang, it, open, hot) {
      c.save(); c.translate(x, y); c.rotate(ang);
      c.beginPath(); c.arc(0, 0, rad, 0, Math.PI); c.closePath(); c.fillStyle = INK; c.fill();
      c.save(); c.translate(0, -open * rad * 0.95); c.rotate(-open * 0.55);
      c.beginPath(); c.arc(0, 0, rad, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = PAPER; c.fill();
      c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
      if (rad > 11 && open < 0.2) text(c, it.code, 0, -rad * 0.42, mono(rad * 0.42, 500));
      c.restore();
      c.beginPath(); c.arc(0, 0, rad, 0, Math.PI * 2); c.lineWidth = 1.4; c.strokeStyle = INK; if (open < 0.05) c.stroke();
      c.beginPath(); c.moveTo(-rad, 0); c.lineTo(rad, 0); c.strokeStyle = hot ? OR : INK; c.lineWidth = hot ? 2 : 1.4; c.stroke();
      c.restore();
    }
    m.draw = c => {
      c.clearRect(0, 0, W, H);
      // globe
      c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill();
      for (const b of balls) cap(c, b.x, b.y, r, b.a, b.it, 0, false);
      c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
      c.beginPath(); c.arc(cx, cy, R - 8, Math.PI * 1.15, Math.PI * 1.4); c.strokeStyle = HAIR; c.lineWidth = 3; c.stroke();
      // neck + base
      c.lineWidth = 1.6; c.strokeStyle = INK; c.fillStyle = PAPER;
      c.fillRect(cx - R * 0.5, cy + R * 0.82, R, base.y0 - cy - R * 0.82); c.strokeRect(cx - R * 0.5, cy + R * 0.82, R, base.y0 - cy - R * 0.82);
      c.fillRect(base.x0, base.y0, base.x1 - base.x0, base.y1 - base.y0); c.strokeRect(base.x0, base.y0, base.x1 - base.x0, base.y1 - base.y0);
      text(c, 'CAPSULE · 12 ROOMS', base.x0 + 10, base.y0 + 14, mono(10), SOFT, 'left');
      // outlet
      const ox = base.x1 - R * 0.46, oy = base.y1 - R * 0.42, ow = R * 0.36, oh = R * 0.32;
      c.fillStyle = INK; c.fillRect(ox, oy, ow, oh);
      c.beginPath(); c.moveTo(ox - 4, oy); c.lineTo(ox + ow + 4, oy); c.strokeStyle = OR; c.lineWidth = 2; c.stroke();
      // coin slot
      c.strokeStyle = INK; c.lineWidth = 1.4; c.strokeRect(base.x1 - R * 0.36, base.y0 + R * 0.16, R * 0.14, R * 0.2);
      c.beginPath(); c.moveTo(base.x1 - R * 0.29, base.y0 + R * 0.2); c.lineTo(base.x1 - R * 0.29, base.y0 + R * 0.32); c.stroke();
      // crank
      c.beginPath(); c.arc(knob.x, knob.y, knob.r, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
      const hx = knob.x + Math.cos(crank) * knob.r * 0.95, hy = knob.y + Math.sin(crank) * knob.r * 0.95;
      c.beginPath(); c.moveTo(knob.x - Math.cos(crank) * knob.r * 0.95, knob.y - Math.sin(crank) * knob.r * 0.95); c.lineTo(hx, hy); c.lineWidth = 5; c.stroke();
      c.beginPath(); c.arc(hx, hy, knob.r * 0.22, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
      c.beginPath(); c.arc(knob.x, knob.y, 3, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill();
      if (dragA === null && !out) { // hint arc
        c.beginPath(); c.arc(knob.x, knob.y, knob.r * 1.45, -0.9, 0.9); c.strokeStyle = OR; c.lineWidth = 1; c.stroke();
        c.beginPath(); const ex = knob.x + Math.cos(0.9) * knob.r * 1.45, ey = knob.y + Math.sin(0.9) * knob.r * 1.45;
        c.moveTo(ex - 6, ey - 2); c.lineTo(ex, ey); c.lineTo(ex + 1, ey - 7); c.stroke();
      }
      // stage
      if (!portrait) {
        c.strokeStyle = HAIR; c.lineWidth = 1; c.setLineDash([3, 4]);
        c.beginPath(); c.moveTo(stage.x - stage.R * 1.8, stage.y + stage.R * 1.08); c.lineTo(stage.x + stage.R * 1.8, stage.y + stage.R * 1.08); c.stroke(); c.setLineDash([]);
        if (!out) text(c, 'PRIZE TRAY', stage.x, stage.y + stage.R * 1.08 + 14, mono(10), SOFT);
      }
      if (out) {
        const b = out.ball, it = b.it;
        let x, y, rad, open = 0, ang;
        if (out.phase === 0) {
          const t = clamp(out.t / 0.75, 0, 1), e = 1 - Math.pow(1 - t, 3);
          x = out.from.x + (stage.x - out.from.x) * e;
          y = out.from.y + (stage.y - out.from.y) * e - Math.sin(t * Math.PI) * R * 0.5;
          rad = r + (stage.R - r) * e; ang = t * 6.28 * 1.5;
        } else {
          const t = out.phase === 1 ? clamp(out.t / 0.55, 0, 1) : 1;
          x = stage.x; y = stage.y; rad = stage.R; ang = 0; open = 1 - Math.pow(1 - t, 3);
        }
        if (portrait && out.phase >= 1) { c.fillStyle = 'rgba(255,255,255,.92)'; c.fillRect(0, 0, W, H); }
        cap(c, x, y, rad, ang, it, open, true);
        if (out.phase >= 1) {
          const a = open;
          c.globalAlpha = a;
          text(c, it.code, x, y - rad * 1.25, mono(Math.max(11, rad * 0.22), 500), OR);
          text(c, fitText(c, it.title, Math.min(W * 0.4, 360), disp(Math.max(18, rad * 0.34))), x, y + rad * 1.45, disp(Math.max(18, rad * 0.34)));
          text(c, 'TAP THE CAPSULE TO ENTER', x, y + rad * 1.45 + Math.max(18, rad * 0.34) * 0.95, mono(10), SOFT);
          c.globalAlpha = 1;
        }
      }
      if (flash > 0) { c.strokeStyle = OR; c.globalAlpha = flash; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R + 6, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
    };
    return m;
  }

  /* ———————————————————————— M.02 CLAW ———————————————————————— */
  function Claw() {
    const m = { name: 'Claw machine', hint: 'Hold ◀ ▶ (or drag on the glass) to steer. DROP to grab. Prizes drop into the chute.',
      buttons: [{ act: 'left', label: '◀', hold: true }, { act: 'drop', label: 'DROP', primary: true }, { act: 'right', label: '▶', hold: true }] };
    let W, H, f, s, prizes = [], claw, dir = 0, target = null, queue = [], msg = '', msgT = 0;
    const SLOTS = [];
    m.layout = (w, h) => {
      const fresh = !W; W = w; H = h;
      f = { x0: 14, x1: W - 14, top: 14, floor: H - 30, railY: 40 };
      f.cw = Math.max(70, W * 0.15);
      const px0 = f.x0 + f.cw + 18, px1 = f.x1 - 14;
      s = Math.min((px1 - px0) / 5.4, H * 0.15);
      SLOTS.length = 0;
      for (let i = 0; i < 5; i++) SLOTS.push({ x: px0 + s * 0.55 + i * ((px1 - px0 - s * 1.1) / 4), y: f.floor - s / 2 });
      // top row: three prizes resting over the gaps between bottom prizes 1-2, 2-3, 3-4
      for (let i = 0; i < 3; i++) SLOTS.push({ x: (SLOTS[i + 1].x + SLOTS[i + 2].x) / 2, y: f.floor - s * 1.42 });
      if (fresh) {
        const order = ITEMS.slice().sort(() => Math.random() - 0.5);
        prizes = SLOTS.map((sl, i) => ({ it: order[i], slot: i, x: sl.x, y: sl.y, tilt: rand(-0.12, 0.12), st: 'rest' }));
        queue = order.slice(SLOTS.length);
        claw = { x: f.x0 + f.cw + (f.x1 - f.x0 - f.cw) / 2, y: f.railY + 26, open: 1, st: 'idle', t: 0, grab: null, slipAt: -1 };
      } else {
        prizes.forEach(p => { if (p.st === 'rest') { p.x = SLOTS[p.slot].x; p.y = SLOTS[p.slot].y; } });
        claw.x = clamp(claw.x, f.x0 + f.cw / 2, f.x1 - 30); claw.y = Math.max(claw.y, f.railY + 26);
      }
    };
    const restY = () => f.railY + 26;
    m.hold = (act, on) => { if (act === 'left') dir = on ? -1 : (dir === -1 ? 0 : dir); if (act === 'right') dir = on ? 1 : (dir === 1 ? 0 : dir); target = null; };
    m.press = act => {
      if (act === 'drop' && claw.st === 'idle') { claw.st = 'down'; target = null; dir = 0; }
      if (act === 'left' && claw.st === 'idle') claw.x = clamp(claw.x - s * 0.5, f.x0 + f.cw / 2, f.x1 - 30);
      if (act === 'right' && claw.st === 'idle') claw.x = clamp(claw.x + s * 0.5, f.x0 + f.cw / 2, f.x1 - 30);
    };
    m.key = (k, down) => {
      if (k === 'ArrowLeft') { m.hold('left', down); return true; }
      if (k === 'ArrowRight') { m.hold('right', down); return true; }
      if ((k === ' ' || k === 'Enter' || k === 'ArrowDown') && down) { m.press('drop'); return true; }
      return false;
    };
    m.down = () => false;
    m.move = (x, y, isDown) => { if (isDown && claw.st === 'idle') target = x; };
    m.up = () => {};
    m.tap = () => m.press('drop');
    function under() {
      let best = null;
      for (const p of prizes) if (p.st === 'rest' && Math.abs(p.x - claw.x) < s * 0.6 && (!best || p.y < best.y)) best = p;
      return best;
    }
    m.step = dt => {
      const sp = W * 0.42;
      msgT = Math.max(0, msgT - dt);
      if (claw.st === 'idle') {
        if (target !== null) { const d = target - claw.x; claw.x += clamp(d, -sp * dt, sp * dt); if (Math.abs(d) < 1) target = null; }
        else claw.x += dir * sp * dt;
        claw.x = clamp(claw.x, f.x0 + f.cw / 2, f.x1 - 30);
      } else if (claw.st === 'down') {
        const p = under(); const stop = p ? p.y - s * 0.5 - 30 : f.floor - 34;
        claw.y += sp * 0.9 * dt;
        if (claw.y >= stop) { claw.y = stop; claw.st = 'close'; claw.t = 0; }
      } else if (claw.st === 'close') {
        claw.t += dt; claw.open = 1 - clamp(claw.t / 0.32, 0, 1);
        if (claw.t > 0.4) {
          const p = under();
          claw.grab = p && Math.abs(p.x - claw.x) < s * 0.46 ? p : null;
          if (claw.grab) { claw.grab.st = 'held'; claw.slipAt = Math.random() < 0.15 ? rand(0.3, 0.7) : -1; }
          else { msg = 'MISSED — LINE UP OVER A PRIZE'; msgT = 1.6; }
          claw.st = 'up'; claw.t = 0; claw.y0 = claw.y;
        }
      } else if (claw.st === 'up') {
        claw.y -= sp * 0.75 * dt;
        if (claw.grab) {
          claw.grab.x = claw.x; claw.grab.y = claw.y + 30 + s * 0.42;
          const prog = (claw.y0 - claw.y) / (claw.y0 - restY());
          if (claw.slipAt > 0 && prog > claw.slipAt) { const p = claw.grab; p.st = 'fall'; p.vy = 0; p.tx = SLOTS[p.slot].x; p.ty = SLOTS[p.slot].y; claw.grab = null; claw.open = 0.6; msg = 'IT SLIPPED — AGAIN!'; msgT = 1.6; }
        }
        if (claw.y <= restY()) { claw.y = restY(); claw.st = claw.grab ? 'home' : 'idle'; if (!claw.grab) claw.open = 1; }
      } else if (claw.st === 'home') {
        const hx = f.x0 + f.cw / 2, d = hx - claw.x;
        claw.x += clamp(d, -sp * dt, sp * dt);
        claw.grab.x = claw.x; claw.grab.y = claw.y + 30 + s * 0.42;
        if (Math.abs(d) < 1) { claw.st = 'release'; claw.t = 0; }
      } else if (claw.st === 'release') {
        claw.t += dt; claw.open = clamp(claw.t / 0.3, 0, 1);
        if (claw.t > 0.2 && claw.grab) { const p = claw.grab; p.st = 'chute'; p.vy = 0; claw.grab = null; }
        if (claw.t > 0.5) claw.st = 'idle';
      }
      for (const p of prizes) {
        if (p.st === 'fall') { p.vy += 2200 * dt; p.y += p.vy * dt; p.x += (p.tx - p.x) * Math.min(1, dt * 8); if (p.y >= p.ty) { p.y = p.ty; p.st = 'rest'; } }
        if (p.st === 'chute') {
          p.vy += 2200 * dt; p.y += p.vy * dt;
          if (p.y > H + s) {
            award(p.it, 'From the claw machine');
            queue.push(p.it);
            const nx = queue.shift();
            p.it = nx; p.st = 'drop'; p.x = SLOTS[p.slot].x; p.y = -s; p.vy = 0; p.tilt = rand(-0.12, 0.12);
          }
        }
        if (p.st === 'drop') { p.vy += 1800 * dt; p.y += p.vy * dt; if (p.y >= SLOTS[p.slot].y) { p.y = SLOTS[p.slot].y; p.st = 'rest'; } }
      }
    };
    function prize(c, p) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.st === 'rest' ? p.tilt : 0);
      const dark = p.it.i % 3 === 0;
      rrect(c, -s / 2, -s / 2, s, s, 4); c.fillStyle = dark ? INK : PAPER; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
      c.beginPath(); c.moveTo(-s / 2, -s / 2 + s * 0.24); c.lineTo(s / 2, -s / 2 + s * 0.24); c.strokeStyle = dark ? '#555' : HAIR; c.stroke();
      text(c, p.it.code, 0, -s / 2 + s * 0.13, mono(s * 0.13, 500), dark ? PAPER : INK);
      text(c, fitText(c, p.it.title, s * 0.86, disp(s * 0.15, 600)), 0, s * 0.12, disp(s * 0.15, 600), dark ? PAPER : INK);
      c.restore();
    }
    m.draw = c => {
      c.clearRect(0, 0, W, H);
      c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(f.x0, f.top, f.x1 - f.x0, H - f.top - 14);
      // glass glints
      c.strokeStyle = HAIR; c.lineWidth = 1;
      c.beginPath(); c.moveTo(f.x1 - 70, f.top + 30); c.lineTo(f.x1 - 30, f.top + 70); c.moveTo(f.x1 - 56, f.top + 30); c.lineTo(f.x1 - 30, f.top + 56); c.stroke();
      // rail
      c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(f.x0, f.railY); c.lineTo(f.x1, f.railY); c.stroke();
      text(c, 'CLAW · 8 PRIZES IN THE PIT · 12 IN ROTATION', f.x0 + 10, f.top + 13, mono(10), SOFT, 'left');
      // chute
      c.beginPath(); c.moveTo(f.x0 + f.cw, f.floor); c.lineTo(f.x0 + f.cw, f.floor - H * 0.24); c.stroke();
      c.setLineDash([4, 4]); c.beginPath(); c.moveTo(f.x0, f.floor); c.lineTo(f.x0 + f.cw, f.floor); c.stroke(); c.setLineDash([]);
      text(c, 'CHUTE ↓', f.x0 + f.cw / 2, f.floor - 12, mono(10), SOFT);
      c.beginPath(); c.moveTo(f.x0 + f.cw, f.floor); c.lineTo(f.x1, f.floor); c.stroke();
      for (const p of prizes) if (p.st !== 'held' && p.st !== 'chute') prize(c, p);
      // claw
      const x = claw.x, y = claw.y;
      c.fillStyle = INK; c.fillRect(x - 12, f.railY - 6, 24, 12);
      c.beginPath(); c.moveTo(x, f.railY + 6); c.lineTo(x, y); c.strokeStyle = OR; c.lineWidth = 1.5; c.stroke();
      if (claw.grab) prize(c, claw.grab);
      c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = 1.6; rrect(c, x - 16, y, 32, 12, 2); c.fill(); c.stroke();
      const o = claw.open, L = 22;
      for (const sgn of [-1, 1]) {
        const ax = x + sgn * 10, ay = y + 12, bx = ax + sgn * (4 + o * 12), by = ay + L, cx2 = bx - sgn * (6 + (1 - o) * 4), cy2 = by + 10;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(cx2, cy2); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
      }
      c.beginPath(); c.moveTo(x, y + 12); c.lineTo(x, y + 12 + L * 0.7); c.lineWidth = 2.4; c.stroke();
      // aim line
      if (claw.st === 'idle') { c.setLineDash([2, 6]); c.strokeStyle = HAIR; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + 46); c.lineTo(x, f.floor); c.stroke(); c.setLineDash([]); }
      for (const p of prizes) if (p.st === 'chute') prize(c, p);
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); text(c, msg, (f.x0 + f.cw + f.x1) / 2, f.railY + 60, mono(12, 500), OR); c.globalAlpha = 1; }
    };
    return m;
  }

  /* ———————————————————————— M.03 BRICKS ———————————————————————— */
  function Bricks() {
    const m = { name: 'Brick table', hint: 'Slide the brick and drop it on the plate. Every brick is a project — tap a placed one to reopen it.',
      buttons: [{ act: 'left', label: '◀' }, { act: 'drop', label: 'DROP', primary: true }, { act: 'right', label: '▶' }, { act: 'reset', label: 'RESET' }] };
    let W, H, x0, x1, cols, u, plateY, bh, rows, heights, placed = [], order = [], cur = null, fall = null, msg = '';
    const width = it => clamp(Math.round(it.title.length / 3.4) + 1, 2, 5);
    function next() {
      if (!order.length) order = ITEMS.slice().sort(() => Math.random() - 0.5);
      const it = order.shift(), w = Math.min(width(it), cols);
      cur = { it, w, c: Math.floor((cols - w) / 2) };
    }
    m.layout = (w, h) => {
      const fresh = !W; W = w; H = h;
      const nc = W < 560 ? 10 : 16;
      x0 = W * 0.05; x1 = W * 0.95;
      if (fresh || nc !== cols) { cols = nc; heights = new Array(cols).fill(0); placed = []; cur = null; fall = null; }
      u = (x1 - x0) / cols; plateY = H - 22 - u * 0.3;
      bh = Math.min(u * 0.95, (plateY - 96) / 6.2); rows = Math.floor((plateY - 96) / bh);
      if (!cur) next(); else cur.c = clamp(cur.c, 0, cols - cur.w);
    };
    const landRow = (c, w) => Math.max(...heights.slice(c, c + w));
    const bx = c => x0 + c * u, by = row => plateY - (row + 1) * bh;
    m.press = act => {
      if (act === 'reset') { heights.fill(0); placed = []; fall = null; msg = ''; next(); return; }
      if (fall || !cur) return;
      if (act === 'left') cur.c = Math.max(0, cur.c - 1);
      if (act === 'right') cur.c = Math.min(cols - cur.w, cur.c + 1);
      if (act === 'drop') {
        const row = landRow(cur.c, cur.w);
        if (row >= rows) { msg = 'TOWER FULL — PRESS RESET'; return; }
        fall = { ...cur, row, y: 44, vy: 0, t: 0, landed: false }; cur = null;
      }
    };
    m.key = (k, down) => {
      if (!down) return k === 'ArrowLeft' || k === 'ArrowRight';
      if (k === 'ArrowLeft') { m.press('left'); return true; }
      if (k === 'ArrowRight') { m.press('right'); return true; }
      if (k === ' ' || k === 'Enter' || k === 'ArrowDown') { m.press('drop'); return true; }
      return false;
    };
    function hit(x, y) { for (let i = placed.length - 1; i >= 0; i--) { const p = placed[i]; if (x >= bx(p.c) && x <= bx(p.c + p.w) && y >= by(p.row) - bh * 0.2 && y <= by(p.row) + bh) return p; } return null; }
    m.down = (x, y) => { const p = hit(x, y); if (p) { award(p.it, 'From the brick table'); return true; } return false; };
    m.move = (x, y, isDown) => { if (cur && !fall && (isDown || matchMedia('(hover:hover)').matches)) cur.c = clamp(Math.round((x - x0) / u - cur.w / 2), 0, cols - cur.w); };
    m.up = () => {};
    m.tap = () => m.press('drop');
    m.step = dt => {
      if (!fall) return;
      const ty = by(fall.row);
      if (!fall.landed) {
        fall.vy += 2600 * dt; fall.y += fall.vy * dt;
        if (fall.y >= ty) {
          fall.y = ty; fall.landed = true; fall.t = 0;
          for (let i = fall.c; i < fall.c + fall.w; i++) heights[i] = fall.row + 1;
          placed.push({ it: fall.it, c: fall.c, w: fall.w, row: fall.row });
          award(fall.it, 'From the brick table');
        }
      } else { fall.t += dt; if (fall.t > 0.18) { fall = null; next(); } }
    };
    function brick(c, it, cc, w, y, ghost, squash) {
      const x = bx(cc), ww = w * u, dark = it.i % 3 === 0, studH = Math.max(3, bh * 0.16);
      c.save();
      if (squash) { c.translate(x + ww / 2, y + bh); c.scale(1 + squash * 0.04, 1 - squash * 0.08); c.translate(-(x + ww / 2), -(y + bh)); }
      if (ghost) { c.setLineDash([4, 4]); c.strokeStyle = SOFT; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, ww - 1, bh - 1); c.setLineDash([]); c.restore(); return; }
      c.fillStyle = dark ? INK : PAPER; c.strokeStyle = INK; c.lineWidth = 1.4;
      for (let k = 0; k < w; k++) { const sx = x + k * u + u * 0.27; c.fillRect(sx, y - studH, u * 0.46, studH); c.strokeRect(sx, y - studH, u * 0.46, studH); }
      c.fillRect(x, y, ww, bh); c.strokeRect(x, y, ww, bh);
      const fs = Math.max(9, Math.min(bh * 0.34, 15));
      text(c, it.code, x + 7, y + bh / 2, mono(fs * 0.85, 500), dark ? '#cfcfcf' : SOFT, 'left');
      c.font = mono(fs * 0.85, 500); const cw = c.measureText(it.code + '  ').width;
      const t = fitText(c, it.title, ww - cw - 14, disp(fs, 600));
      if (ww - cw - 14 > 20) text(c, t, x + 7 + cw, y + bh / 2 + 1, disp(fs, 600), dark ? PAPER : INK, 'left');
      c.restore();
    }
    m.draw = c => {
      c.clearRect(0, 0, W, H);
      text(c, 'BRICKS · STACK THE INDEX', x0, 18, mono(10), SOFT, 'left');
      text(c, `${placed.length} PLACED`, x1, 18, mono(10), SOFT, 'right');
      // plate
      c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = 1.6;
      c.fillRect(x0 - 6, plateY, x1 - x0 + 12, u * 0.3); c.strokeRect(x0 - 6, plateY, x1 - x0 + 12, u * 0.3);
      for (let k = 0; k < cols; k++) if (heights[k] === 0) { const sx = bx(k) + u * 0.27; c.strokeRect(sx, plateY - Math.max(3, bh * 0.16), u * 0.46, Math.max(3, bh * 0.16)); }
      for (const p of placed) brick(c, p.it, p.c, p.w, by(p.row), false, 0);
      if (fall) brick(c, fall.it, fall.c, fall.w, fall.y, false, fall.landed ? Math.sin(Math.min(1, fall.t / 0.18) * Math.PI) : 0);
      if (cur) {
        const row = landRow(cur.c, cur.w), gy = by(row), hy = 44;
        if (row < rows) {
          brick(c, cur.it, cur.c, cur.w, gy, true);
          c.strokeStyle = OR; c.lineWidth = 1;
          c.beginPath(); c.moveTo(bx(cur.c), hy + bh); c.lineTo(bx(cur.c), gy); c.moveTo(bx(cur.c + cur.w), hy + bh); c.lineTo(bx(cur.c + cur.w), gy); c.stroke();
        }
        brick(c, cur.it, cur.c, cur.w, hy, false, 0);
      }
      if (msg) text(c, msg, W / 2, H / 2, mono(13, 500), OR);
    };
    return m;
  }

  /* ———————————————————————— M.04 AIR HOCKEY ———————————————————————— */
  function Hockey() {
    const m = { name: 'Air hockey table', hint: 'Move the mallet with your pointer (or arrow keys). Score in a slot to open that room.',
      buttons: [{ act: 'puck', label: 'NEW PUCK', primary: true }] };
    let W, H, t, wallY, mid, pr, mr, goals = [], puck, mal, aim, trail = [], scored = null, keys = {};
    function relabel() { const pool = ITEMS.slice().sort(() => Math.random() - 0.5); goals.forEach((g, i) => { g.it = pool[i]; }); }
    m.layout = (w, h) => {
      const fresh = !W; W = w; H = h;
      t = { x0: 12, y0: 12, x1: W - 12, y1: H - 12 };
      wallY = t.y0 + 40; mid = (wallY + t.y1) / 2;
      pr = Math.max(9, Math.min(W, H) * 0.028); mr = pr * 1.75;
      const n = W < 560 ? 3 : 5, tw = t.x1 - t.x0, gw = Math.min(tw / n * 0.62, pr * 7);
      if (goals.length !== n) { goals = []; for (let i = 0; i < n; i++) goals.push({}); relabel(); }
      goals.forEach((g, i) => { g.x = t.x0 + tw * (i + 0.5) / n; g.w = gw; });
      if (fresh || !puck) reset(); else { puck.x = clamp(puck.x, t.x0 + pr, t.x1 - pr); puck.y = clamp(puck.y, wallY + pr, t.y1 - pr); }
      if (fresh || !mal) { mal = { x: W / 2, y: t.y1 - mr * 2.2, vx: 0, vy: 0 }; aim = { x: mal.x, y: mal.y }; }
      mal.y = clamp(mal.y, mid + mr, t.y1 - mr); aim.y = clamp(aim.y, mid + mr, t.y1 - mr);
    };
    function reset() { puck = { x: W / 2 + rand(-20, 20), y: (wallY + mid) / 2 + 30, vx: rand(-80, 80), vy: H * 0.35 }; trail = []; }
    m.press = act => { if (act === 'puck') { reset(); scored = null; } };
    m.key = (k, down) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) { keys[k] = down; return true; } return false; };
    m.debug = () => ({ puck, mal, goals, wallY });
    m.down = (x, y) => { aim.x = x; aim.y = y; return false; };
    m.move = (x, y) => { aim.x = x; aim.y = y; };
    m.up = () => {};
    m.tap = () => {};
    m.step = dt => {
      const ks = W * 0.9;
      if (keys.ArrowLeft) aim.x -= ks * dt; if (keys.ArrowRight) aim.x += ks * dt;
      if (keys.ArrowUp) aim.y -= ks * dt; if (keys.ArrowDown) aim.y += ks * dt;
      aim.x = clamp(aim.x, t.x0 + mr, t.x1 - mr); aim.y = clamp(aim.y, mid + mr, t.y1 - mr);
      const nx = mal.x + (aim.x - mal.x) * Math.min(1, dt * 22), ny = mal.y + (aim.y - mal.y) * Math.min(1, dt * 22);
      mal.vx = (nx - mal.x) / Math.max(dt, 1e-3); mal.vy = (ny - mal.y) / Math.max(dt, 1e-3); mal.x = nx; mal.y = ny;
      if (scored) { scored.t += dt; if (scored.t > 1.1) { scored = null; relabel(); reset(); } return; }
      const sub = 4, h = dt / sub, e = 0.9, vmax = H * 3.2;
      for (let s = 0; s < sub; s++) {
        puck.x += puck.vx * h; puck.y += puck.vy * h;
        if (puck.x < t.x0 + pr) { puck.x = t.x0 + pr; puck.vx = Math.abs(puck.vx) * e; }
        if (puck.x > t.x1 - pr) { puck.x = t.x1 - pr; puck.vx = -Math.abs(puck.vx) * e; }
        if (puck.y > t.y1 - pr) { puck.y = t.y1 - pr; puck.vy = -Math.abs(puck.vy) * e; }
        const g = goals.find(g => Math.abs(puck.x - g.x) < g.w / 2 - pr * 0.2);
        if (puck.y < wallY + pr && !g) { puck.y = wallY + pr; puck.vy = Math.abs(puck.vy) * e; }
        for (const gg of goals) for (const px of [gg.x - gg.w / 2, gg.x + gg.w / 2]) {
          const dx = puck.x - px, dy = puck.y - wallY, d = Math.hypot(dx, dy);
          if (d < pr && d > 0) { const nx2 = dx / d, ny2 = dy / d; puck.x = px + nx2 * pr; puck.y = wallY + ny2 * pr; const vn = puck.vx * nx2 + puck.vy * ny2; if (vn < 0) { puck.vx -= 2 * vn * nx2; puck.vy -= 2 * vn * ny2; } }
        }
        if (g && puck.y < wallY - pr * 0.6) { scored = { g, t: 0 }; award(g.it, 'Scored on the air hockey table'); break; }
        const dx = puck.x - mal.x, dy = puck.y - mal.y, d = Math.hypot(dx, dy);
        if (d < pr + mr && d > 0) {
          const nx2 = dx / d, ny2 = dy / d; puck.x = mal.x + nx2 * (pr + mr); puck.y = mal.y + ny2 * (pr + mr);
          const rvx = puck.vx - mal.vx, rvy = puck.vy - mal.vy, vn = rvx * nx2 + rvy * ny2;
          if (vn < 0) { puck.vx -= (1 + e) * vn * nx2; puck.vy -= (1 + e) * vn * ny2; }
        }
        const sp = Math.hypot(puck.vx, puck.vy); if (sp > vmax) { puck.vx *= vmax / sp; puck.vy *= vmax / sp; }
      }
      const fr = Math.pow(0.72, dt); puck.vx *= fr; puck.vy *= fr;
      trail.push({ x: puck.x, y: puck.y }); if (trail.length > 10) trail.shift();
    };
    m.draw = c => {
      c.clearRect(0, 0, W, H);
      c.strokeStyle = INK; c.lineWidth = 1.6; rrect(c, t.x0, t.y0, t.x1 - t.x0, t.y1 - t.y0, 18); c.stroke();
      // markings
      c.strokeStyle = HAIR; c.lineWidth = 1;
      c.setLineDash([6, 6]); c.beginPath(); c.moveTo(t.x0, mid); c.lineTo(t.x1, mid); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(W / 2, mid, Math.min(W, H) * 0.09, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(W / 2, t.y1, Math.min(W, H) * 0.14, Math.PI, 0); c.stroke();
      // top wall with slots
      c.strokeStyle = INK; c.lineWidth = 3; c.beginPath();
      let lx = t.x0 + 6;
      for (const g of goals) { c.moveTo(lx, wallY); c.lineTo(g.x - g.w / 2, wallY); lx = g.x + g.w / 2; }
      c.moveTo(lx, wallY); c.lineTo(t.x1 - 6, wallY); c.stroke();
      for (const g of goals) {
        const hot = scored && scored.g === g;
        c.beginPath(); c.moveTo(g.x - g.w / 2, wallY); c.lineTo(g.x + g.w / 2, wallY); c.strokeStyle = OR; c.lineWidth = hot ? 4 : 1; c.stroke();
        for (const px of [g.x - g.w / 2, g.x + g.w / 2]) { c.beginPath(); c.arc(px, wallY, 3.5, 0, Math.PI * 2); c.fillStyle = INK; c.fill(); }
        const lab = fitText(c, g.it.title.toUpperCase(), g.w * 1.5, mono(10, 500));
        text(c, lab, g.x, t.y0 + 13, mono(10, 500), hot ? OR : INK);
        text(c, g.it.code, g.x, t.y0 + 26, mono(9), SOFT);
      }
      // puck trail + puck
      trail.forEach((p, i) => { c.beginPath(); c.arc(p.x, p.y, pr * (0.3 + i / trail.length * 0.5), 0, Math.PI * 2); c.fillStyle = `rgba(17,17,17,${0.03 + i * 0.012})`; c.fill(); });
      if (!scored || scored.t < 0.15) {
        c.beginPath(); c.arc(puck.x, puck.y, pr, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
        c.beginPath(); c.arc(puck.x, puck.y, pr * 0.55, 0, Math.PI * 2); c.strokeStyle = '#555'; c.lineWidth = 1; c.stroke();
      }
      // mallet
      c.beginPath(); c.arc(mal.x, mal.y, mr, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
      c.beginPath(); c.arc(mal.x, mal.y, mr * 0.45, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
      if (scored) { c.globalAlpha = Math.max(0, 1 - scored.t / 1.1); text(c, 'GOAL — ' + scored.g.it.title.toUpperCase(), W / 2, mid, disp(Math.min(34, W * 0.05)), INK); c.globalAlpha = 1; }
    };
    return m;
  }

  /* ———————————————————————— cabinet engine ———————————————————————— */
  const cv = document.getElementById('cab-canvas');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const hintEl = document.getElementById('cab-hint'), btnEl = document.getElementById('cab-btns'), panel = document.getElementById('cab');
  const MACHINES = { capsule: Capsule(), claw: Claw(), bricks: Bricks(), hockey: Hockey() };
  let cur = null, W = 0, H = 0, dpr = 1, running = false, visible = true, last = 0;
  cv.tabIndex = 0;

  function size() {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (cur) { cur.layout(W, H); cur.draw(ctx); }
  }
  function use(name) {
    cur = MACHINES[name];
    document.querySelectorAll('.cab-tabs [role="tab"]').forEach(b => {
      const on = b.dataset.m === name; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      if (on) panel.setAttribute('aria-labelledby', b.id);
    });
    cv.setAttribute('aria-label', cur.name + '. ' + cur.hint);
    hintEl.textContent = cur.hint;
    btnEl.innerHTML = '';
    cur.buttons.forEach(b => {
      const el = document.createElement('button'); el.type = 'button'; el.textContent = b.label; if (b.primary) el.className = 'primary';
      el.setAttribute('aria-label', { left: 'Left', right: 'Right' }[b.act] || b.label);
      if (b.hold) {
        const off = () => cur.hold(b.act, false);
        el.addEventListener('pointerdown', e => { e.preventDefault(); cur.hold(b.act, true); });
        el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
        el.addEventListener('click', e => { if (e.detail === 0) cur.press(b.act); });
      } else el.addEventListener('click', () => cur.press(b.act));
      btnEl.appendChild(el);
    });
    if (W) { cur.layout(W, H); cur.draw(ctx); }
  }
  const tabs = [...document.querySelectorAll('.cab-tabs [role="tab"]')];
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => use(b.dataset.m));
    b.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      e.preventDefault(); const nb = tabs[(i + d + tabs.length) % tabs.length]; nb.focus(); use(nb.dataset.m);
    });
  });

  /* pointer */
  let pDown = null;
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => {
    const p = pt(e); cv.setPointerCapture(e.pointerId);
    pDown = { x: p.x, y: p.y, t: performance.now(), moved: false, consumed: cur.down(p.x, p.y) };
  });
  cv.addEventListener('pointermove', e => {
    const p = pt(e);
    if (pDown && Math.hypot(p.x - pDown.x, p.y - pDown.y) > 8) pDown.moved = true;
    cur.move(p.x, p.y, !!pDown);
  });
  const endP = e => {
    if (!pDown) return; const p = pt(e);
    cur.up(p.x, p.y);
    if (!pDown.moved && !pDown.consumed && performance.now() - pDown.t < 450) cur.tap(p.x, p.y);
    pDown = null;
  };
  cv.addEventListener('pointerup', endP); cv.addEventListener('pointercancel', () => { if (pDown) cur.up(0, 0); pDown = null; });
  cv.addEventListener('keydown', e => { if (cur.key(e.key, true)) e.preventDefault(); });
  cv.addEventListener('keyup', e => { if (cur.key(e.key, false)) e.preventDefault(); });
  cv.addEventListener('blur', () => { ['left', 'right'].forEach(a => cur.hold && cur.hold(a, false)); });

  /* loop — only while the cabinet is on screen */
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(1 / 30, (ts - (last || ts)) / 1000); last = ts;
    cur.step(dt); cur.draw(ctx);
    requestAnimationFrame(frame);
  }
  function setRun(on) {
    if (on === running) return; running = on; last = 0;
    if (on) requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; setRun(visible && !document.hidden); }, { threshold: 0.05 }).observe(cv);
  document.addEventListener('visibilitychange', () => setRun(visible && !document.hidden));
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv); else addEventListener('resize', size);
  if (/[?&]debug\b/.test(location.search)) window.__arcade = MACHINES;
  use('capsule'); size();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => cur && W && cur.draw(ctx));
  setRun(visible && !document.hidden);
})();
