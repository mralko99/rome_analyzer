# Atlante Mobilità Roma — React (Vite)

Interactive map of Rome commuting flows: an **H3 heatmap** (uscenti / entranti / CO₂) over a MapLibre basemap, plus a **catchment analyser** ("Bacino") that, for any point+radius **or** administrative area, scans the full origin–destination matrix and shows where trips come from and go to (volumes or estimated CO₂).

This is a self-contained React port of the HTML design prototype. Same logic, same data — packaged as a runnable Vite app using npm packages instead of CDN globals.

## Run it

```bash
cd react-app
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # production build into dist/
npm run preview  # serve the build
```

Requires Node 18+.

## Stack

- **React 18** + **Vite 5**
- **MapLibre GL JS** — basemap (free CARTO styles, no API key)
- **deck.gl 8.9** (`@deck.gl/core`, `/layers`, `/geo-layers`, `/mapbox`) — `H3HexagonLayer`, `ArcLayer`, `GeoJsonLayer`, `PolygonLayer`, `ScatterplotLayer`, rendered interleaved into the MapLibre canvas via `MapboxOverlay`
- **h3-js** — pulled in transitively by `@deck.gl/geo-layers` for H3 cell geometry
- Fonts: Titillium Web + Lora (Google Fonts, loaded in `index.html`)

## Project structure

```
react-app/
├─ index.html              # fonts + global CSS + #root
├─ vite.config.js          # base:'./' so it works from any subpath
├─ src/
│  ├─ main.jsx             # React root + maplibre-gl CSS import
│  └─ App.jsx              # the whole app (one class component)
└─ public/data/build/      # precomputed datasets (served at /data/build/…)
   ├─ cells.json           # H3 grid: h3 index, centroid lng/lat, municipio per tile_ID
   ├─ metrics.json         # per-cell outgoing / incoming / internal trips + CO₂ (t/g)
   ├─ od_packed.b64.txt     # full OD matrix (977k pairs) — Uint16 [origin,dest,flux]×N, base64
   ├─ municipi.json        # 15 municipi: rings, bbox, roman numeral (from roma_municipi.geojson)
   ├─ zone.json            # 117 toponymic zones (Rione/Quartiere/Zona/Suburbio) + parent municipio
   ├─ frazioni.json        # 87 frazioni (points) of the metropolitan area
   └─ panels.json          # city KPIs, modal share, CO₂/municipio, scenarios, smart-working curve
```

## How it works

- On load, `App` fetches the JSON datasets and decodes `od_packed.b64.txt` into a `Uint16Array` (interleaved `origin, destination, flux`). The OD matrix lives in memory so catchment queries are fully interactive.
- **City mode** colours every H3 cell by the selected metric (log scale). Each metric (Uscenti / Entranti / CO₂) keeps its **own** colour; "Auto" falls back to the built-in ramp.
- **Catchment mode** (`computeCatchment`):
  1. `buildSelection()` builds a cell-membership mask — a radius around a point/frazione, or all cells inside a municipio/zone/comune/whole area.
  2. One pass over the OD array accumulates **incoming** (trips whose destination is inside, origin outside) and **outgoing** (origin inside, destination outside) per external cell, plus an internal total. CO₂ per pair = `flux × haversine(cell, hub) × 117 g/km`.
  3. deck.gl renders connected cells as a heatmap, arcs to the hub, the area/circle outline, and the H3 grid on top.
- "Entrambi" blends the incoming colour and outgoing colour per cell by the in/out ratio (bivariate). The CO₂ toggle switches volumes → emissions everywhere (kg per cell, t in totals).

## Editing

Everything is in `src/App.jsx`. Logic methods (`computeCatchment`, `updateLayers`, colour ramps, etc.) are plain JS and framework-agnostic; the UI is in `render()` / `renderSettings()` / `renderCatchment()` / `renderStats()`. Inline styles use a small `css('…')` helper that turns a CSS string into a React style object.

## Data provenance & caveats

- Built from a Rome OD matrix (7.3M trips/day across 23,897 H3 res-9 cells), municipi/zone boundaries, and a CO₂ emission-factor table. Per-cell CO₂ totals reconcile with the source baseline (~2,892 t/day).
- **CO₂ is a tank-to-wheel estimate** using a single weighted factor (117 g/km) and straight-line distance to the basin centre — indicative, not an inventory.
- The **time-of-day** filter applies a *modelled* diurnal commuting curve; the source OD is a 24-h aggregate.
- **Frazioni** in the source file are points with no comune attribution, so they're offered as radius catchments (not polygons). There were **no comune polygons** outside Rome, so the hierarchy is: Roma Capitale → Comune di Roma → Municipio → Zona/Rione, plus Frazioni as points. Add comune boundaries to extend it.

## Design system

The prototype targets the **Designers Italia / UI Kit Italia** look (institutional navy `#003366`, Titillium Web, Lora for KPI numerals, 4px radii, restrained shadows). Colours are inlined as hex here; if you integrate into a codebase that already has the Italia tokens, map them to `--it-*` variables.
