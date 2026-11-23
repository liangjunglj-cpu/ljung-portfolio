// The twelve entries every machine, station and list draws from.
export const ITEMS = [
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
export const byId = Object.fromEntries(ITEMS.map(it => [it.id, it]));

// newest film per project (the "Latest" station)
export const LATEST = [
  { id: 'almond', no: 'W.01', kind: 'Tool',        title: 'Almond 0.8',  video: 'assets/latest/almond_08.mp4',             poster: 'assets/latest/almond_08.jpg',             aspect: 16 / 9,    len: '0:42', date: '2026.11.21',
    lede: 'The stable release: a native structural solver judged member by member, gridshells cross-checked against OpenSees, a daylight and comfort engine, and a library of 144 models.',
    meta: [['Release', '0.8.0 · 21 Nov 2026'], ['Stable', 'structure · EN 1993-1-1 · library'], ['Beta', 'climate · daylight · thermal']] },
  { id: 'ginkgo', no: 'W.02', kind: 'Tool / Film', title: 'Ginkgo',      video: 'assets/latest/ginkgo_freiburg_orbit.mp4', poster: 'assets/latest/ginkgo_freiburg_orbit.jpg', aspect: 720 / 900, len: '0:32', date: '2026.11.16',
    lede: 'A phone photo of Münsterplatz, Freiburg, rebuilt as a Blender scene by a team of agents measuring from a solved camera; the orbit runs over every agent’s timeline.',
    meta: [['Run', 'fischbrunnen · agents orbit v4'], ['Medium', 'Blender 5.1 · Unreal 5.8 · Claude Code']] },
  { id: 'kern',   no: 'W.03', kind: 'Software',    title: 'Kern',        video: 'assets/latest/kern_promo.mp4',            poster: 'assets/latest/kern_promo.jpg',            aspect: 16 / 9,    len: '1:40', date: '2026.11.10',
    lede: 'A calm 3D modeller — NURBS and solids, a prompt that asks one thing at a time. Play mode grows streets and courtyards; the same model then meets structure and evacuation checks.',
    meta: [['Version', '0.2.0 beta 2'], ['Medium', 'Electron · React · three.js · OpenCASCADE']] },
  { id: 'y2k',    no: 'W.04', kind: 'Game',        title: 'Project Y2K', video: 'assets/latest/y2k_rei_game.mp4',          poster: 'assets/latest/y2k_rei_game.jpg',          aspect: 1280 / 874, len: 'loop', date: '2026.11.11',
    lede: 'Content v072, “organic”: Rei re-rigged to read as a body, not a puppet — leaning into starts and stops through the neon night market.',
    meta: [['Build', 'plugin 0.58.0 · content v072'], ['Medium', 'Unreal Engine 5.8']] }
];

// original photographs of the author (the Field station + entrance + finale)
export const PHOTOS = [
  { id: 'campus',      src: 'assets/photo/campus.jpg',      w: 960,  h: 1280, cap: 'Campus, SUTD' },
  { id: 'qr_studio',   src: 'assets/photo/qr_studio.jpg',   w: 720,  h: 1280, cap: 'Studio · the QR that opens the work' },
  { id: 'museum_crit', src: 'assets/photo/museum_crit.jpg', w: 1147, h: 758,  cap: 'Museum of Memories · final review' },
  { id: 'epfl_pinup',  src: 'assets/photo/epfl_pinup.jpg',  w: 720,  h: 1280, cap: 'Pin-up review, EPFL' },
  { id: 'fabrication', src: 'assets/photo/fabrication.jpg', w: 1280, h: 960,  cap: 'Fabrication lab · Zünd cutter' },
  { id: 'showcase',    src: 'assets/photo/showcase.jpg',    w: 720,  h: 1280, cap: 'SUTD showcase · live demo' },
  { id: 'build_week',  src: 'assets/photo/build_week.jpg',  w: 960,  h: 1280, cap: 'Build week · bamboo and sail' }
];

// art + field notes, scattered through the city (the @ljungart feed and the studies)
const A = (id, w, h, cap, src = `assets/art3d/${id}.jpg`) => ({ id, src, w, h, cap });
export const ART = {
  panels: [
    A('art_wasp_nodes', 640, 398, 'Generate the nodes you need for computational design with simple text prompts'),
    A('art_almond_wip', 640, 364, 'More WIP with Almond MCP'),
    A('art_almond_vectors', 640, 452, 'Can’t find 2D vector files to feed Almond — so I make them'),
    A('art_almond_drawing', 640, 853, 'Developing Almond alongside my drawing workflow'),
    A('art_almond_chestnut', 506, 900, 'The nuts put together — Almond and Chestnut'),
    A('art_almond_ikea', 640, 640, 'Almond 1.1 — might need to ask IKEA to hire me for this'),
    A('art_midterm_film', 506, 900, 'Midterms film WIP — Claude × Higgsfield × Unreal 5.8 × ElevenLabs'),
    A('art_cs2_comp', 640, 335, 'New ways to explore computational architecture, from a data set'),
    A('art_betelnut', 640, 335, 'Betelnut update — a semantic layer for GeoJSON')
  ],
  trilons: [
    [A('framer_13', 900, 632, 'Rhino MCP studies — Lorenz curve, plates, wireframe, voronoi'),
     A('framer_02', 885, 570, 'Mesh study — an abstract wireframe form'),
     A('framer_15', 900, 508, 'Textured plates — a voxel field study')],
    [A('framer_04', 900, 541, 'Lorenz curve — Rhino MCP'),
     A('framer_17', 678, 900, 'Voronoi lamp — a printed object study'),
     A('art_fable_rules', 640, 480, 'First rule-based architecture — experimenting with Fable')]
  ],
  notes: [
    A('framer_14', 891, 608, 'Field sketch — an office block, ink + watercolour'),
    A('framer_19', 886, 616, 'Field sketch — shophouses, ink + watercolour'),
    A('art_cs2_collage', 640, 480, 'Core Studio 2 — diagramming and collages'),
    A('art_midterms', 640, 445, 'Core Studio 2 — midterms')
  ],
  easel: A('framer_16', 704, 883, 'Field sketch — ArtScience Museum, ink + wash')
};
