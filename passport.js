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
  /* —— secrets: found by playing, not by reading. hints stay cryptic —— */
  const SECRETS = [
    { id: 'something_odd',    label: 'SOMETHING ODD',    found: 'you said the magic word',            hint: 'say the magic word, anywhere' },
    { id: 'wet_ink',          label: 'WET INK',          found: 'you sketched the site itself',       hint: 'leave a mark in the field notes' },
    { id: 'on_the_ice',       label: 'ON THE ICE',       found: 'you left the jetty behind',          hint: 'step off the jetty' },
    { id: 'sunk_archive',     label: 'THE SUNK ARCHIVE', found: 'you fell, and it caught you',        hint: 'fall where the memories sank' },
    { id: 'archive_unsealed', label: 'ARCHIVE_UNSEALED', found: 'you beat the compiled world',        hint: 'unseal what the compiler sealed' }
  ];
  const SECRET_IDS = SECRETS.map(s => s.id);

  /* —— state —— */
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object' &&
          raw.rooms && typeof raw.rooms === 'object' &&
          raw.stations && typeof raw.stations === 'object') {
        return { rooms: raw.rooms, stations: raw.stations,
                 secrets: (raw.secrets && typeof raw.secrets === 'object') ? raw.secrets : {} };
      }
    } catch (e) { /* corrupt JSON or storage blocked — start fresh */ }
    return { rooms: {}, stations: {}, secrets: {} };
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
    s: STATIONS.filter(x => state.stations[x.id]).length,
    k: SECRETS.filter(x => state.secrets[x.id]).length
  });

  function render() {
    const { r, s, k } = counts();
    const done = r === ROOMS.length && s === STATIONS.length && k === SECRETS.length;
    chip.textContent = done ? 'PASSPORT COMPLETE' : `PASSPORT ${r}/${ROOMS.length} · ${s}/${STATIONS.length} · ${k}/${SECRETS.length}`;
    chip.classList.toggle('is-complete', done);

    const row = (visited, id, label) =>
      `<li class="pp-item${visited ? ' is-visited' : ''}">` +
      `<span class="pp-dot">${visited ? '●' : '○'}</span>` +
      `<span class="pp-id">${id}</span> ${label}</li>`;
    const secretRow = x => {
      const got = !!state.secrets[x.id];
      return `<li class="pp-item${got ? ' is-visited' : ''}">` +
        `<span class="pp-dot">${got ? '●' : '○'}</span>` +
        (got ? `<span class="pp-id">${x.label}</span> <span class="pp-hint">${x.found}</span>`
             : `<span class="pp-id">???</span> <span class="pp-hint">${x.hint}</span>`) +
        `</li>`;
    };
    panel.innerHTML =
      `<p class="pp-head">ROOMS · ${r}/${ROOMS.length}</p>` +
      `<ul>${ROOMS.map(x => row(!!state.rooms[x.id], x.label, '')).join('')}</ul>` +
      `<p class="pp-head">STATIONS · ${s}/${STATIONS.length}</p>` +
      `<ul>${STATIONS.map(x => row(!!state.stations[x.id], x.id, x.label)).join('')}</ul>` +
      `<p class="pp-head">SECRETS · ${k}/${SECRETS.length}</p>` +
      `<ul>${SECRETS.map(secretRow).join('')}</ul>` +
      (done
        ? '<p class="pp-done">EVERY ROOM · EVERY STATION · EVERY SECRET</p>' +
          '<a class="pp-six" href="sixth.html">ENTER THE SIXTH ROOM →</a>'
        : '');
  }

  /* read-only API for the sixth room's gate */
  window.__passport = {
    get state() { return state; },
    lists: { ROOMS, STATIONS, SECRETS },
    counts,
    isComplete() {
      const c = counts();
      return c.r === ROOMS.length && c.s === STATIONS.length && c.k === SECRETS.length;
    }
  };

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

  /* —— secret stamps —— */
  function stampSecret(id) {
    if (SECRET_IDS.indexOf(id) === -1 || state.secrets[id]) return;
    state.secrets[id] = Date.now();
    save(); render();
    chip.classList.add('pp-pop');
    setTimeout(() => chip.classList.remove('pp-pop'), 900);
  }
  addEventListener('mom:secret', e => {
    if (e.detail && e.detail.id) stampSecret(e.detail.id);
  });

  // the magic word — LET'S BUILD SOMETHING ODD. type it, anywhere.
  let buf = '';
  addEventListener('keydown', e => {
    if (e.key && e.key.length === 1) {
      buf = (buf + e.key.toLowerCase()).slice(-3);
      if (buf === 'odd') stampSecret('something_odd');
    }
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
