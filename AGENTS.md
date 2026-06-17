# Atlante Mobilità Roma — Agent Instructions

Interactive map of Rome commuting flows (H3 heatmap + catchment analyser). See [README.md](README.md) for full project description.

## Commands

```bash
npm run dev      # dev server at http://localhost:5173 (Node 18+ required)
npm run build    # production build → dist/
npm run preview  # serve the production build
```

No API keys required. The CARTO basemap styles are public.

## Architecture

- **Everything lives in `src/App.jsx`** — one large React class component. There are no sub-components, hooks, or separate modules.
- `src/main.jsx` — React root + MapLibre CSS import only.
- `public/data/build/` — precomputed static datasets fetched at runtime (never bundled).

### Key data files

| File | Contents |
|------|----------|
| `cells.json` | H3 res-9 cell index → centroid lng/lat + municipio id |
| `metrics.json` | per-cell out/inc/internal trip counts + CO₂ (t/day) |
| `od_packed.b64.txt` | full OD matrix (977k pairs) — base64 Uint16 `[origin, dest, flux]×N` |
| `municipi.json` | 15 municipi: polygon rings, bbox, roman numeral label |
| `zone.json` | 117 toponymic zones (Rione/Quartiere/Zona/Suburbio) + parent municipio |
| `frazioni.json` | 87 frazioni as lat/lng points (no polygon) |
| `panels.json` | city-level KPIs, modal share, CO₂/municipio, scenarios, diurnal curve |

## Conventions

- **Data fetches** must use `B + 'data/build/…'` where `B = import.meta.env.BASE_URL`. Do not hardcode `/data/…` paths — the app may be served from a subpath.
- **Inline styles** use the `css('…')` helper (converts a CSS declaration string to a React style object). Keep using it for consistency with the existing style approach.
- **UI language is Italian** — labels, tooltips, and messages should remain in Italian.
- **Colour palette** follows Designers Italia / UI Kit Italia: institutional navy `#003366`, teal `#089994`, amber `#cc7a00`, red `#cc334d`, green `#008055`. Fonts: Titillium Web (UI) + Lora (KPI numerals), loaded via Google Fonts in `index.html`.
- **CO₂ factor**: `this.EF = 117` g/km (tank-to-wheel, single weighted average). Do not change without updating the README caveat.
- **Colour ramps** are defined in `this.RAMPS` (`navy`/`teal`/`ambra`) and assigned per metric in `this.metricRamp`.

## Key methods in App.jsx

| Method | Purpose |
|--------|---------|
| `loadData()` | Fetches all datasets, decodes OD base64 into `Uint16Array`, stores on `this` |
| `buildSelection()` | Returns cell-membership mask for a radius, municipio, zone, or whole area |
| `computeCatchment()` | Scans OD array to accumulate in/out flows; updates deck.gl layers |
| `updateLayers()` | Rebuilds all deck.gl layers and pushes to `MapboxOverlay` |
| `hav()` | Haversine distance (km) between two lat/lng points |
| `pip()` / `pipR()` | Point-in-polygon / point-in-multipolygon ray-casting |

## Potential pitfalls

- The OD array (`od_packed.b64.txt`) is decoded once in `loadData()` and stored as `this.odArr` (Uint16Array). It is large (~5 MB decoded); avoid re-fetching or re-decoding it.
- `deck.gl` version is pinned to **8.9.x** (`@deck.gl/mapbox` is not available in v9+). Do not upgrade without testing the `MapboxOverlay` interleaved rendering.
- `h3-js` is a transitive dependency via `@deck.gl/geo-layers`; it is not listed in `package.json` directly. If you need to call h3 APIs directly, import from `h3-js`.
- `vite.config.js` sets `base: './'` so asset paths are relative — this is intentional for subpath deployment.
