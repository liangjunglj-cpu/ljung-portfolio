# ljung-portfolio

Portfolio for Chen Liang Jung. The home page is a **scroll-driven three.js world** — a white architectural
study model with black ink edges and one orange line running through it. The other rooms are static pages in
the same white/black "living archive" skin (`archive.css` over the older `styles.css`).

## The world (`index.html` → `world/`)

Scroll walks the camera along one path; each HTML chapter in `index.html` pins a shot.

| Station | What's there | Code |
|---|---|---|
| 00 Entrance | the name standing on the ground as a sculpture, a framed campus portrait | `world/main.js` |
| 01 Latest | four stands playing the newest film of Almond (0.8 release reel), Ginkgo, Kern, Project Y2K | `world/stations/latest.js` |
| 02 Field | seven original photographs as framed prints; three gates reprint them on Kodak stocks (Portra 400, Gold 200, Ektar 100) | `world/photos.js` |
| 03 Arcade | a pavilion with four playable machines; click one to dock | `world/stations/arcade.js`, `world/machines/{capsule,claw,bricks,hockey}.js` |
| 04 Index | a cabinet of twelve drawers, one per project | `world/stations/archive.js` |
| 05 Contact | the sign-off on the ground, then an aerial of the whole model | `world/main.js` |
| 06 Explore | free walk: WASD/arrows + drag to look (phones: left-thumb joystick, right-thumb look), collisions, click machines/drawers/eggs | `world/explore.js` |

- Shared look + helpers: `world/kit.js` · data: `world/items.js` · light/path/ground: `world/env.js` · overlay: `world/world.css`
- Around the walk: `world/city.js` (73 buildings with facades, space frames, and nine easter-egg models of past design projects — hover for `EGG · …`, click to open) `world/trees.js` (five procedural species in autumn oranges, instanced leaves, wind), `world/fall.js` (GPU falling leaves) and `world/props.js` (street furniture, orange café/kiosk/sculptures, reflecting basin; scale figures switched off) and `world/gallery.js` (art + field notes in the city edge: framed @ljungart panels, two rotating trilons of studies, a pegged washing line of field sketches, an easel — hover for `ART · …`, click for the viewer with prev/next). All scale down on phones.
- Phones: placards start compact (MORE opens them), first tap previews and second tap opens, shots refit to portrait
- Machine + photo interfaces: `world/CONTRACT.md`
- Every win pays out a prize ticket (collected set kept in `localStorage`)
- Without WebGL the chapters render as a plain page; `archive.html` is the full 2D archive edition
- `?debug` exposes `window.__world` (`go('#s-arcade')`, `enterDock(i)`, …)

## Other rooms

| Page | Content |
|---|---|
| `tools.html` | "The Nuts" — wasp-mcp, Almond, Chestnut (live splat), Unreal-MCP, Ginkgo, Betelnut, Kern |
| `y2k.html` | Project Y2K — latest v072 clip, reel, districts, operatives |
| `museum.html` | Museum of Memories — galleries, drawing archive, process film |
| `studio1.html` · `art.html` · `dream-engine.html` · `sixth.html` | studio, @ljungart, essay, the hidden room |
| `archive.html` | the 2D archive home (latest films, canvas arcade in `play.js`, index, field photos) |

## Run, build, deploy

```powershell
npm install
npm run dev      # http://localhost:5173  ·  machine lab: /lab.html?m=claw|capsule|bricks|hockey|photos|trees|city
npm run build    # dist/ = bundled world + every static room copied as-is
```

Deploy is `.github/workflows/pages.yml` (build → GitHub Pages). It needs a one-time switch in the repo:
**Settings → Pages → Source: GitHub Actions** (the site used to be served straight from `main`).

## Assets

- `assets/latest/` — newest film per project (H.264, faststart) + posters + Kern stills; `almond_08.mp4` is a 42 s reel cut from the 0.8.0 release material
- `assets/photo/` — the original photographs of the author (1400 px)
- `assets/art3d/` — 900 px textures of the @ljungart feed and studies for the gallery (the viewer loads the originals)
- `assets/me/` — duotone portraits used by `archive.html`
- `assets/` — project images; `assets/video/` process recordings; `gaussian-splats-3d.js` splat viewer for tools.html
- `LiangJung-Portfolio.html` — STALE single-page edition, not deployed
