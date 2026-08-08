/* page arcades — one gamified, informative layer per room */
(() => {
  const page = document.body.dataset.page;
  const MONO = 'IBM Plex Mono, monospace';
  const el = (cls, html, tag) => {
    const d = document.createElement(tag || 'div');
    d.className = cls;
    if (html) d.innerHTML = html;
    return d;
  };
  const scrollP = () => {
    const h = document.documentElement;
    return Math.min(1, Math.max(0, h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)));
  };

  /* ———————————————————————————————— museum · descent tint
     the page itself sinks: multiply-blend blue deepens with scroll,
     mirroring the depth HUD's +2 M → −42 M journey */
  if (page === 'museum') {
    const tint = el('descent-tint');
    document.body.appendChild(tint);
    const upd = () => { tint.style.opacity = (scrollP() * 0.55).toFixed(3); };
    addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ———————————————————————————————— tools · the family tree
     live pipeline map: packets flow from Claude through every nut to
     its engine. hover = what it does, click a nut = jump to it */
  if (page === 'tools') {
    const host = el('arcade-tree',
      '<div class="at-box"><div class="at-head mono"><span>A.0 · THE FAMILY TREE — LIVE</span>' +
      '<span id="at-info">HOVER A NODE · CLICK A NUT TO JUMP TO IT</span></div>' +
      '<canvas id="at-canvas"></canvas></div>', 'section');
    const marquee = document.querySelector('.marquee');
    if (marquee) marquee.after(host);
    const cv = host.querySelector('canvas');
    const info = host.querySelector('#at-info');
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, mx = -1, my = -1, hot = null;
    const resize = () => { W = cv.width = cv.offsetWidth * devicePixelRatio; H = cv.height = cv.offsetHeight * devicePixelRatio; };
    resize(); addEventListener('resize', resize); addEventListener('load', resize);

    const N = [
      { l: 'CLAUDE',     x: .50, y: .48, hub: 1, i: 'every nut speaks MCP to the same model — one conversation, many canvases' },
      { l: 'WASP-MCP',   x: .15, y: .20, a: '#p-wasp',     i: 'places real components on the live grasshopper canvas' },
      { l: 'ALMOND',     x: .13, y: .76, a: '#p-almond',   i: 'proposes structure in rhino, then survives kangaroo + karamba' },
      { l: 'CHESTNUT',   x: .35, y: .12, a: '#p-chestnut', i: 'a sentence becomes a gaussian-splat world you can walk in vr' },
      { l: 'UNREAL-MCP', x: .65, y: .12, a: '#p-unreal',   i: 'scene, light and camera in ue5 — the cinematic end of the loop' },
      { l: 'GINKGO',     x: .85, y: .20, a: '#p-ginkgo',   i: 'compiles whole games — intent → solver → deterministic ue 5.8 plan' },
      { l: 'BETELNUT',   x: .87, y: .76, a: '#p-betelnut', i: 'map-first geospatial synthesis for planners, in the browser' },
      { l: 'RHINO / GH', x: .28, y: .50, eng: 1, i: 'kangaroo form-finding · karamba checks · wasp aggregation' },
      { l: 'UE 5.8',     x: .72, y: .50, eng: 1, i: 'the shared target: archviz light, cinematics, playable worlds' },
      { l: 'BROWSER',    x: .50, y: .87, eng: 1, i: 'webxr walks, geojson maps — and this site itself' }
    ];
    const E = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,7],[2,7],[3,9],[4,8],[5,8],[6,9]];

    const pos = n => [n.x * W, n.y * H];
    cv.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      mx = (e.clientX - r.left) * devicePixelRatio;
      my = (e.clientY - r.top) * devicePixelRatio;
    });
    cv.addEventListener('mouseleave', () => { mx = my = -1; });
    cv.addEventListener('click', () => {
      if (hot && hot.a) {
        const t = document.querySelector(hot.a);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    (function draw(now) {
      requestAnimationFrame(draw);
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const u = W / 1000;
      hot = null;
      let hd = 46 * u;
      for (const n of N) {
        const [x, y] = pos(n);
        const d = Math.hypot(mx - x, my - y);
        if (d < hd) { hd = d; hot = n; }
      }
      if (info) info.textContent = hot ? ('// ' + hot.l + ' — ' + hot.i) : 'HOVER A NODE · CLICK A NUT TO JUMP TO IT';
      cv.style.cursor = hot && hot.a ? 'pointer' : 'default';
      // edges + packets
      for (let k = 0; k < E.length; k++) {
        const [a, b] = E[k];
        const [x1, y1] = pos(N[a]), [x2, y2] = pos(N[b]);
        const lit = hot && (N[a] === hot || N[b] === hot);
        ctx.strokeStyle = lit ? 'rgba(255,122,47,.85)' : 'rgba(232,228,220,.16)';
        ctx.lineWidth = (lit ? 2 : 1.1) * u;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        const t = ((now / 2400) + k * 0.13) % 1;
        const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
        ctx.fillStyle = lit ? '#FF7A2F' : 'rgba(255,77,0,.55)';
        ctx.beginPath(); ctx.arc(px, py, (lit ? 4 : 2.6) * u, 0, 7); ctx.fill();
      }
      // nodes
      for (const n of N) {
        const [x, y] = pos(n);
        const isHot = n === hot;
        const r = (n.hub ? 26 : n.eng ? 18 : 21) * u * (isHot ? 1.18 : 1);
        ctx.fillStyle = '#141418';
        ctx.strokeStyle = n.hub ? '#FF4D00' : (n.eng ? '#7a90a8' : (isHot ? '#FF7A2F' : '#5a5a60'));
        ctx.lineWidth = (n.hub || isHot ? 2.2 : 1.4) * u;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
        if (n.hub) {
          const pulse = 1 + Math.sin(now / 500) * 0.08;
          ctx.strokeStyle = 'rgba(255,77,0,.3)';
          ctx.beginPath(); ctx.arc(x, y, r * 1.5 * pulse, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = isHot ? '#FF7A2F' : '#c8c4bc';
        ctx.font = (9.5 * u * 1.55) + 'px ' + MONO;
        ctx.textAlign = 'center';
        ctx.fillText(n.l, x, y + r + 16 * u);
      }
      ctx.textAlign = 'left';
    })(0);
  }

  /* ———————————————————————————————— studio · THE ARC
     mini-map of the page: each exercise is a station on a curve, the
     dot is you. click a station to travel there */
  if (page === 'studio1') {
    const secs = [...document.querySelectorAll('main .project')];
    if (secs.length >= 2) {
      const bar = el('arc-map poly mono',
        '<canvas></canvas><span class="am-label" id="am-label"></span>');
      document.body.appendChild(bar);
      const cv = bar.querySelector('canvas');
      const label = bar.querySelector('#am-label');
      const ctx = cv.getContext('2d');
      let W = 0, H = 0;
      const resize = () => { W = cv.width = cv.offsetWidth * devicePixelRatio; H = cv.height = cv.offsetHeight * devicePixelRatio; };
      resize(); addEventListener('resize', resize); addEventListener('load', resize);
      const names = secs.map(s => {
        const h = s.querySelector('h3');
        return h ? h.textContent.trim() : 'SECTION';
      });
      const stX = i => W * (0.06 + 0.88 * (i / (secs.length - 1)));
      const arcY = f => H * 0.62 - Math.sin(f * Math.PI) * H * 0.24;
      const secP = () => { // continuous position along stations from scroll
        const mid = scrollY + innerHeight * 0.4;
        let f = 0;
        for (let i = 0; i < secs.length; i++) {
          const top = secs[i].offsetTop, next = secs[i + 1] ? secs[i + 1].offsetTop : document.body.scrollHeight;
          if (mid >= top && mid < next) { f = i + Math.min(1, (mid - top) / (next - top)); break; }
          if (mid >= next) f = i + 1;
        }
        return Math.min(secs.length - 1, f);
      };
      cv.addEventListener('click', e => {
        const r = cv.getBoundingClientRect();
        const x = (e.clientX - r.left) * devicePixelRatio;
        let best = 0, bd = 1e9;
        for (let i = 0; i < secs.length; i++) if (Math.abs(stX(i) - x) < bd) { bd = Math.abs(stX(i) - x); best = i; }
        secs[best].scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      (function draw() {
        requestAnimationFrame(draw);
        if (!W) return;
        ctx.clearRect(0, 0, W, H);
        const u = W / 680;
        const f = secP();
        // the arc
        ctx.strokeStyle = 'rgba(22,20,16,.25)'; ctx.lineWidth = 1.6 * u;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const t = i / 40; const x = W * (0.06 + 0.88 * t); const y = arcY(t); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        // stations
        for (let i = 0; i < secs.length; i++) {
          const t = i / (secs.length - 1);
          const on = f >= i - 0.02;
          ctx.fillStyle = on ? '#FF4D00' : 'rgba(22,20,16,.3)';
          ctx.beginPath(); ctx.arc(stX(i), arcY(t), (on ? 5 : 3.6) * u, 0, 7); ctx.fill();
        }
        // the walker
        const t = f / (secs.length - 1);
        ctx.fillStyle = '#161410';
        ctx.strokeStyle = '#FF4D00'; ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.arc(W * (0.06 + 0.88 * t), arcY(t) - 9 * u, 5.5 * u, 0, 7); ctx.fill(); ctx.stroke();
        const idx = Math.round(f);
        if (label) label.textContent = 'EX.' + (idx + 1) + ' / ' + secs.length + ' · ' + names[idx];
      })();
    }
  }

  /* ———————————————————————————————— art · label HUD + fading ink
     hover any piece and its museum label types itself; hold + drag
     anywhere to sketch — the ink dries and fades like wet media */
  if (page === 'art') {
    // museum label
    const hud = el('art-label poly mono');
    document.body.appendChild(hud);
    let typeTimer = 0;
    const typeInto = text => {
      clearInterval(typeTimer);
      hud.classList.add('on');
      let i = 0;
      typeTimer = setInterval(() => {
        hud.textContent = text.slice(0, ++i) + (i < text.length ? '▌' : '');
        if (i >= text.length) clearInterval(typeTimer);
      }, 14);
    };
    document.querySelectorAll('figure img').forEach(img => {
      img.addEventListener('mouseenter', () => {
        const cap = img.closest('figure') && img.closest('figure').querySelector('figcaption');
        typeInto((cap ? cap.textContent.trim() : img.alt || 'UNTITLED'));
      });
      img.addEventListener('mouseleave', () => { clearInterval(typeTimer); hud.classList.remove('on'); });
    });
    // ink layer
    const ink = el('art-ink', '', 'canvas');
    document.body.appendChild(ink);
    const ctx = ink.getContext('2d');
    let W = 0, H = 0;
    const resize = () => { W = ink.width = innerWidth * devicePixelRatio; H = ink.height = innerHeight * devicePixelRatio; };
    resize(); addEventListener('resize', resize);
    const strokes = [];
    let drawing = false, rafOn = false;
    addEventListener('pointerdown', e => { if (e.button === 0) { drawing = true; strokes.push({ pts: [], t0: performance.now() }); } });
    addEventListener('pointerup', () => { drawing = false; });
    addEventListener('pointermove', e => {
      if (!drawing || !(e.buttons & 1)) return;
      const s = strokes[strokes.length - 1];
      if (s) { s.pts.push([e.clientX * devicePixelRatio, e.clientY * devicePixelRatio, performance.now()]); loop(); }
    });
    const FADE = 3200;
    function loop() {
      if (rafOn) return;
      rafOn = true;
      (function frame(now) {
        ctx.clearRect(0, 0, W, H);
        let alive = false;
        for (const s of strokes) {
          for (let i = 1; i < s.pts.length; i++) {
            const age = now - s.pts[i][2];
            if (age > FADE) continue;
            alive = true;
            const a = 1 - age / FADE;
            ctx.strokeStyle = 'rgba(255,77,0,' + (a * 0.85).toFixed(3) + ')';
            ctx.lineWidth = (1.5 + a * 2.5) * devicePixelRatio;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.pts[i - 1][0], s.pts[i - 1][1]);
            ctx.lineTo(s.pts[i][0], s.pts[i][1]);
            ctx.stroke();
          }
        }
        while (strokes.length && strokes[0].pts.length && now - strokes[0].pts[strokes[0].pts.length - 1][2] > FADE) strokes.shift();
        if (alive || drawing) requestAnimationFrame(frame);
        else { rafOn = false; ctx.clearRect(0, 0, W, H); }
      })(performance.now());
    }
    // one-time hint
    const hint = el('art-hint poly mono');
    hint.textContent = 'HOLD + DRAG TO SKETCH · THE INK DRIES';
    document.body.appendChild(hint);
    setTimeout(() => hint.classList.add('on'), 1200);
    setTimeout(() => hint.classList.remove('on'), 8000);
  }

  /* ———————————————————————————————— dream engine · reading meter
     % read + minutes left at 230 wpm; the paragraph you're on stays
     lit while the rest of the essay recedes */
  if (page === 'writing') {
    const essay = document.querySelector('.essay');
    if (essay) {
      const words = essay.innerText.split(/\s+/).length;
      const meter = el('read-meter poly mono');
      document.body.appendChild(meter);
      const paras = [...essay.querySelectorAll('p')];
      essay.classList.add('spotlit');
      const upd = () => {
        const p = scrollP();
        const mins = Math.max(0, Math.ceil((1 - p) * words / 230));
        meter.innerHTML = 'READING · <b>' + Math.round(p * 100) + '%</b> · ~' + mins + ' MIN LEFT';
        const mid = innerHeight * 0.45;
        let best = null, bd = 1e9;
        for (const el2 of paras) {
          const r = el2.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) { el2.classList.remove('focus'); continue; }
          const d = Math.abs((r.top + r.bottom) / 2 - mid);
          if (d < bd) { bd = d; best = el2; }
        }
        paras.forEach(q => q.classList.toggle('focus', q === best));
      };
      addEventListener('scroll', upd, { passive: true });
      addEventListener('load', upd);
      upd();
    }
  }
})();
