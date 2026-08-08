/* LIANG JUNG portfolio — passport (rooms visited + museum stations) */
(() => {
  const KEY = 'lj-passport';

  /* —— the six rooms (data-page ids) and six sensory stations —— */
  const ROOMS = [
    { id: 'home',    label: 'HOME' },
    { id: 'tools',   label: 'TOOLS' },
    { id: 'studio1', label: 'STUDIO' },
    { id: 'art',     label: 'ART' },
    { id: 'museum',  label: 'MUSEUM' },
    { id: 'writing', label: 'WRITING' }
  ];
  const STATIONS = [
    { id: 'S1', label: 'THE CROSSING' },
    { id: 'S2', label: 'THE GATEWAY' },
    { id: 'S3', label: 'THE DESCENT' },
    { id: 'S4', label: 'THE FAMILY WING' },
    { id: 'S5', label: 'THE GAP ROOM' },
    { id: 'S6', label: 'THE COMMONS' }
  ];
  const STATION_IDS = STATIONS.map(s => s.id);

  /* —— state —— */
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object' &&
          raw.rooms && typeof raw.rooms === 'object' &&
          raw.stations && typeof raw.stations === 'object') {
        return { rooms: raw.rooms, stations: raw.stations };
      }
    } catch (e) { /* corrupt JSON or storage blocked — start fresh */ }
    return { rooms: {}, stations: {} };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  const state = load();

  /* —— stamp the current room —— */
  const page = document.body.dataset.page;
  if (page && !state.rooms[page]) { state.rooms[page] = Date.now(); save(); }

  /* —— nav chip + dropdown panel —— */
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'passport-chip mono';
  chip.setAttribute('aria-expanded', 'false');
  chip.setAttribute('aria-label', 'Passport — rooms and stations visited');

  const panel = document.createElement('div');
  panel.className = 'passport-panel mono';
  panel.hidden = true;

  const counts = () => ({
    r: ROOMS.filter(x => state.rooms[x.id]).length,
    s: STATIONS.filter(x => state.stations[x.id]).length
  });

  function render() {
    const { r, s } = counts();
    const done = r === ROOMS.length && s === STATIONS.length;
    chip.textContent = done ? 'PASSPORT COMPLETE' : `PASSPORT ${r}/${ROOMS.length} · ${s}/${STATIONS.length}`;
    chip.classList.toggle('is-complete', done);

    const row = (visited, id, label) =>
      `<li class="pp-item${visited ? ' is-visited' : ''}">` +
      `<span class="pp-dot">${visited ? '●' : '○'}</span>` +
      `<span class="pp-id">${id}</span> ${label}</li>`;
    panel.innerHTML =
      `<p class="pp-head">ROOMS · ${r}/${ROOMS.length}</p>` +
      `<ul>${ROOMS.map(x => row(!!state.rooms[x.id], x.label, '')).join('')}</ul>` +
      `<p class="pp-head">STATIONS · ${s}/${STATIONS.length}</p>` +
      `<ul>${STATIONS.map(x => row(!!state.stations[x.id], x.id, x.label)).join('')}</ul>` +
      (done ? '<p class="pp-done">EVERY ROOM · EVERY STATION</p>' : '');
  }

  chip.addEventListener('click', e => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    chip.setAttribute('aria-expanded', String(!panel.hidden));
  });
  document.addEventListener('click', e => {
    if (!panel.hidden && !panel.contains(e.target)) {
      panel.hidden = true;
      chip.setAttribute('aria-expanded', 'false');
    }
  });

  const meta = nav.querySelector('.nav-meta');
  nav.insertBefore(chip, meta || null);
  nav.appendChild(panel);
  render();

  /* —— station stamps (walkable museum) —— */
  function stamp(id) {
    if (STATION_IDS.indexOf(id) === -1 || state.stations[id]) return;
    state.stations[id] = Date.now();
    save(); render();
  }
  addEventListener('mom:station', e => {
    if (e.detail && e.detail.id) stamp(e.detail.id);
  });

  // fallback: walk.js writes the current station into the #walk-station HUD —
  // mirror it so stations register even without a mom:station dispatch.
  const hudSt = document.getElementById('walk-station');
  if (hudSt && 'MutationObserver' in window) {
    new MutationObserver(() => {
      const m = /^S[1-6]/.exec(hudSt.textContent || '');
      if (m) stamp(m[0]);
    }).observe(hudSt, { childList: true, characterData: true, subtree: true });
  }
})();
