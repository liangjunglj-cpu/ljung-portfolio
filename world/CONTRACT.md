# World modules — contract

The home page is a scroll-driven three.js world (`index.html` → `world/main.js`).
Modules plug into it through two small interfaces. Units are metres, +Y up.

Shared kit: `world/kit.js` (palette, materials, `edged()`, `box()`, `line()`, `label()` for troika SDF text,
`award()`, `damp()` …). Data: `world/items.js` (`ITEMS`, `LATEST`, `PHOTOS`).

**Look:** white matte paper models, black ink edge lines (`edged()`), orange (`0xff4d00`) only as thin lines or
small accents. Soft shadows on a pale ground (`0xf3f3f1`), white fog. No textures except labels, videos and photos.
Fonts: `label(..., { font: 'disp' })` (Space Grotesk 700) for titles, `'mono'` (IBM Plex Mono) for small caps.

## 1 · Arcade machine — `world/machines/<id>.js`

```js
export function createCapsule(ctx) { … return machine }   // createClaw, createBricks, createHockey
```

`ctx` = `{ THREE, kit, items, award(item, fromLabel), renderer, camera, isMobile, reducedMotion }`

`machine` =

| field | meaning |
|---|---|
| `id`, `title` | `'claw'`, `'Claw'` |
| `group` | `THREE.Group`. Local space: origin at the floor centre of the cabinet, +Y up, **front faces +Z**. Footprint within 1.5 m × 1.5 m, height ≤ 2.4 m. The host places/rotates it. |
| `dock` | `{ position: Vector3, target: Vector3 }` in **local** space: where the camera sits while playing (~1.4–2.2 m in front, looking at the play area). |
| `hint` | one sentence of how to play |
| `controls` | `[{ act, label, hold?, primary? }]` — rendered as HTML buttons by the host while playing (touch users have no keyboard). |
| `update(dt, t, s)` | every frame. `s = { active, near }` (`near` 0..1 = camera proximity). Keep idle cost tiny; an attract-mode loop when `near > 0` is welcome. |
| `setActive(on)` | host docked / undocked |
| `press(act)` / `hold(act, on)` | button input (`hold` for press-and-hold buttons) |
| `key(key, down)` | → `true` if handled (arrow keys, space, enter, r …) |
| `pointer(e)` | `e = { type: 'down'|'move'|'up'|'tap', ray: THREE.Ray (world space), hit: Intersection|null }` → `true` if consumed. Only called while active. Use `group.worldToLocal` / a local plane for ray maths. |
| `dispose()` | free geometry/materials you created |

Every win calls `ctx.award(item, 'From the claw machine')` exactly once — the host shows the prize ticket.
Prefer items the player has not won yet when the machine chooses (capsule) — `ctx.award` is the only side effect.

## 2 · Photographs — `world/photos.js`

The original photos of the author (`PHOTOS` in items.js) as framed prints on stands. Filters are light
emulate Kodak film stocks (`portra`, `gold`, `ektar`): tone curve, warm highlights, grain, vignette.

```js
export const EFFECTS = ['portra', 'gold', 'ektar']
export function createPhoto(ctx, photo, { height, maxWidth, effect, index, caption, lift }) → { mesh, plane, setEffect(name), update(dt, t, s) }
export function createPhotoField(ctx, photos) → { group, length, prints, gates, update(dt, t, s) }
```
`s = { velocity /* scroll speed, ~0.06 per wheel notch */, camera }`. Passing each of the three gates moves every print one filter along.

## Dev harness

`npm run dev` → `http://localhost:5173/lab.html?m=claw` (or `capsule`, `bricks`, `hockey`, `photos`)
mounts one module with orbit controls, the host buttons and a prize log.
