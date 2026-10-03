/* LIANG JUNG portfolio — animation layer: y2k screen, district selector, noise → plan, count-up */
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 820px)').matches;
  const saver = navigator.connection && navigator.connection.saveData;
  const onScreen = (el, cb, margin) => {
    const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: margin || '0px', threshold: 0.15 });
    io.observe(el);
  };

  /* —— y2k hero: the city reel behind a HUD frame (still image on phones / reduced motion) —— */
  (function y2kScreen() {
    const stage = document.getElementById('y2k-stage');
    if (!stage) return;
    const video = stage.querySelector('video');
    const time = document.getElementById('ys-time');
    const state = document.getElementById('ys-state');
    if (!video || calm || small || saver) { stage.classList.add('is-still'); if (state) state.textContent = 'STILL'; return; }
    let loaded = false;
    onScreen(stage, vis => {
      if (vis) {
        if (!loaded) { video.src = video.dataset.src; loaded = true; }
        video.play().then(() => stage.classList.add('is-live')).catch(() => stage.classList.add('is-still'));
      } else video.pause();
    }, '200px');
    video.addEventListener('timeupdate', () => {
      if (!time) return;
      const t = video.currentTime, p = n => String(Math.floor(n)).padStart(2, '0');
      time.textContent = '00:' + p(t) + ':' + p((t % 1) * 24);
    });
  })();

  /* —— district selector: hover / tap a card, the screen cuts to that district —— */
  (function districts() {
    const root = document.getElementById('dsel');
    if (!root) return;
    const cards = [...document.querySelectorAll('[data-district]')];
    const layers = [...root.querySelectorAll('.dsel-img')];
    const num = root.querySelector('.dsel-num'), name = root.querySelector('.dsel-name'), sub = root.querySelector('.dsel-sub');
    if (!cards.length || layers.length < 2) return;
    let cur = -1, top = 0, auto = !calm, visible = false, timer = null;
    cards.forEach(c => { new Image().src = c.dataset.shot; }); // warm the six previews
    const pick = (n, user) => {
      n = (n + cards.length) % cards.length;
      if (user) auto = false;
      if (n === cur) return;
      cur = n;
      const c = cards[n];
      top = 1 - top;
      layers[top].src = c.dataset.shot;
      layers[top].alt = c.dataset.name + ', in engine';
      layers[top].classList.add('on'); layers[1 - top].classList.remove('on');
      root.style.setProperty('--dc', c.dataset.color);
      num.textContent = c.dataset.num; name.textContent = c.dataset.name; sub.textContent = c.dataset.sub;
      root.classList.remove('cut'); void root.offsetWidth; root.classList.add('cut');
      cards.forEach((k, i) => { k.classList.toggle('is-on', i === n); k.setAttribute('aria-pressed', i === n); });
    };
    cards.forEach((c, i) => {
      c.tabIndex = 0; c.setAttribute('role', 'button');
      c.style.setProperty('--dc', c.dataset.color);
      c.addEventListener('mouseenter', () => pick(i, true));
      c.addEventListener('focus', () => pick(i, true));
      c.addEventListener('click', () => { pick(i, true); if (small) root.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' }); });
      c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i, true); } });
    });
    pick(0);
    const tick = () => { if (auto && visible) pick(cur + 1); };
    onScreen(root, v => { visible = v; if (v && !timer) timer = setInterval(tick, 3800); });
  })();

  /* —— noise → plan: the 7 denoising steps, noisy input beside the model's running guess —— */
  (function noisePlan() {
    const root = document.getElementById('noise-player');
    if (!root) return;
    const a = root.querySelector('.np-noisy'), b = root.querySelector('.np-guess');
    const stepEl = root.querySelector('.np-step'), btn = root.querySelector('.np-toggle'), dots = root.querySelector('.np-dots');
    const STEPS = 7, CELL = 128;
    const sheet = new Image();
    let step = STEPS - 1, playing = !calm, visible = false, last = 0, hold = 0;
    for (let i = 0; i < STEPS; i++) dots.appendChild(document.createElement('i'));
    const draw = () => {
      [[a, 0], [b, 1]].forEach(([cv, row]) => {
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(sheet, step * CELL, row * CELL, CELL, CELL, 0, 0, cv.width, cv.height);
      });
      stepEl.textContent = 'STEP ' + (step + 1) + ' / ' + STEPS + (step === STEPS - 1 ? ' · PLAN' : step === 0 ? ' · PURE NOISE' : '');
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i <= step));
    };
    const loop = now => {
      requestAnimationFrame(loop);
      if (!playing || !visible || !sheet.complete) return;
      const wait = step === STEPS - 1 ? 2200 : 520;
      if (now - last < wait + hold) return;
      last = now; hold = 0;
      step = (step + 1) % STEPS; draw();
    };
    sheet.onload = () => { draw(); requestAnimationFrame(loop); };
    sheet.src = root.dataset.sheet;
    const label = () => { btn.textContent = playing ? '❚❚ PAUSE' : '▶ PLAY'; btn.setAttribute('aria-pressed', playing); };
    btn.addEventListener('click', () => { playing = !playing; if (playing && step === STEPS - 1) { step = -1; last = 0; } label(); });
    dots.addEventListener('click', e => {
      const i = [...dots.children].indexOf(e.target);
      if (i < 0) return;
      playing = false; step = i; draw(); label();
    });
    label();
    onScreen(root, v => { visible = v; });
  })();

  /* —— count-up: numbers tick to their value the first time they scroll into view —— */
  (function countUp() {
    const els = [...document.querySelectorAll('[data-count]')];
    if (!els.length) return;
    const fmt = (el, v) => {
      const dec = +(el.dataset.dec || 0);
      const txt = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
      return (el.dataset.prefix || '') + txt + (el.dataset.suffix || '');
    };
    if (calm) return; // the final values are already in the markup
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; io.unobserve(el);
      const end = +el.dataset.count, t0 = performance.now(), dur = 1100 + Math.min(600, end);
      el.style.minWidth = el.offsetWidth + 'px';
      (function step(now) {
        const p = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(el, end * ease);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }), { threshold: 0.6 });
    els.forEach(el => io.observe(el));
  })();
})();
