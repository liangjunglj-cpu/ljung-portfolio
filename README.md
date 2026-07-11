# ljung-portfolio

Multi-page portfolio for Chen Liang Jung — orange/white "polycarbonate" theme.

## Pages

| Page | Content |
|---|---|
| `index.html` | Landing — floating wireframe moon mesh (GLB), statement quotes, works index, practice, contact |
| `museum.html` | Museum of Memories — galleries, horizontal-scroll drawing archive, midterm process film |
| `tools.html` | "The Nuts" — wasp-mcp (+ session videos), Almond, Chestnut (live scroll-orbit Gaussian splat), Betelnut |
| `art.html` | @ljungart feed (12 posts, verbatim captions), framer-era studies, links |

## Assets

- `assets/` — curated project images (Core Studio 2, POSTMIDTERM boards, wasp canvas)
- `assets/art/` — 12 Instagram posts pulled from @ljungart (640px grid thumbnails)
- `assets/framer/` — 16 images pulled from liangjung.framer.website
- `assets/video/` — 5 process recordings (3 screen recs from 03.07.2026 + 2 midterm film clips)
- `assets/world_moon.spz` — Chestnut-generated Marble world (~500k gaussians, live viewer on tools.html)
- `assets/moon_mesh.glb` — the same world's collider mesh (wireframe hero object on index.html)
- `gaussian-splats-3d.js` — splat renderer vendored from Chestnut (UMD, global THREE from CDN)
- `LiangJung-Portfolio.html` — STALE: previous single-page edition; regenerate on request

## Run locally

```powershell
uv run --no-project python -m http.server 4173 --directory .
```

## Notes

- Fonts: Space Grotesk + IBM Plex Mono (Google Fonts) — swap in TT Interphases Mono if licensed
- Videos are labeled by date/source — rename captions in HTML once reviewed
- IG images are grid-resolution (640px); replace with original exports for print quality
- Deploy as-is to GitHub Pages / Netlify / Vercel (no build step)
