/**
 * compareUtils.js
 *
 * Pure-function helpers for computing the "Area B" catchment used in the
 * Confronto tab.  The design mirrors App.jsx's buildSelection() /
 * computeCatchment() but is decoupled from React state so it can be tested
 * and reused independently.
 *
 * Typical call chain from App.jsx:
 *
 *   const sel = buildCompareSelection(this.state, this.data, {
 *     hav:          (lat1,lng1,lat2,lng2) => ...,
 *     pipR:         (x,y,rings) => ...,
 *     muniName:     this.muniName,
 *     muniCentroid: this.muniCentroid,
 *     muniRings:    this.muniRings,
 *     zoneById:     this.zoneById,
 *     gridCenter:   this.gridCenter,
 *   });
 *   if (sel) {
 *     this.catB = computeCompareCatchment(sel, this.data.cells, this.od, this.odN, this.EF, hav);
 *   }
 */

// ─── buildCompareSelection ────────────────────────────────────────────────────
/**
 * Builds a cell-membership mask for "Area B" (the comparison area).
 *
 * @param {object} state  - App state slice: { compareLevel, compareMuni, compareZone }
 * @param {object} data   - Loaded dataset: { cells, zone }
 * @param {object} helpers
 *   @param {Function} helpers.hav          - haversine(lat1,lng1,lat2,lng2) → km
 *   @param {Function} helpers.pipR         - pipR(x,y,rings) → boolean
 *   @param {object}   helpers.muniName     - { [muniId]: string }
 *   @param {object}   helpers.muniCentroid - { [muniId]: [lng,lat] }
 *   @param {object}   helpers.muniRings    - { [muniId]: ring[][] }
 *   @param {object}   helpers.zoneById     - { [zoneId]: { bbox, rings, cx, cy, name, tipo, muni } }
 *   @param {number[]} helpers.gridCenter   - [lng, lat] centre of the full grid
 *
 * @returns {{ mem: Uint8Array, count: number, hub: number[], label: string,
 *             kind: string, sub: string, polyRings: any[]|null } | null}
 */
export function buildCompareSelection(state, data, helpers) {
  const { compareLevel, compareMuni, compareZone,
          compareFrazId, compareComuneEsternoId, compareRadiusKm,
          compareHasPoint, comparePtLat, comparePtLng } = state;
  const cells = data.cells;
  const { muniName, muniCentroid, muniRings, zoneById, gridCenter, pipR, pip,
          hav, comuniGeo, comuniBboxes, romaCentroid, comuniLabelData } = helpers;

  const mem = new Uint8Array(cells.maxId + 1);
  let count = 0;
  let hub, label, kind, sub, polyRings = null, circle = null;

  const inBox = (x, y, b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

  if (compareLevel === 'capitale') {
    // ── All cells in the metropolitan grid ──────────────────────────────────
    for (let id = 1; id <= cells.maxId; id++) {
      if (cells.h3[id]) { mem[id] = 1; count++; }
    }
    hub   = gridCenter;
    label = 'Roma Capitale';
    kind  = 'Intera area metropolitana';
    sub   = count + ' celle H3';

  } else if (compareLevel === 'municipio') {
    // ── A single municipio ──────────────────────────────────────────────────
    if (!compareMuni) return null;
    for (let id = 1; id <= cells.maxId; id++) {
      if (cells.muni[id] === compareMuni) { mem[id] = 1; count++; }
    }
    hub       = muniCentroid[compareMuni] || gridCenter;
    label     = muniName[compareMuni] || 'Municipio ' + compareMuni;
    kind      = 'Municipio';
    sub       = count + ' celle del municipio';
    polyRings = muniRings[compareMuni] || null;

  } else if (compareLevel === 'zona') {
    // ── A single zone / rione / quartiere ───────────────────────────────────
    if (compareZone < 0) return null;
    const z = zoneById[compareZone];
    if (!z || !z.bbox || !z.rings) return null;
    for (let id = 1; id <= cells.maxId; id++) {
      if (!cells.h3[id]) continue;
      const x = cells.lng[id], y = cells.lat[id];
      if (!inBox(x, y, z.bbox)) continue;
      if (pipR(x, y, z.rings)) { mem[id] = 1; count++; }
    }
    hub       = [z.cx, z.cy];
    label     = z.name;
    kind      = z.tipo + (z.muni ? ' · ' + (muniName[z.muni] || '') : '');
    sub       = count + ' celle';
    polyRings = z.rings;

  } else if (compareLevel === 'frazione') {
    // ── Fraction point + radius ─────────────────────────────────────────────
    if ((compareFrazId == null || compareFrazId < 0) || !data.frazioni) return null;
    const fr = data.frazioni[compareFrazId];
    if (!fr) return null;
    const radius = compareRadiusKm || 0.6;
    for (let id = 1; id <= cells.maxId; id++) {
      if (!cells.h3[id]) continue;
      if (hav(fr.lat, fr.lng, cells.lat[id], cells.lng[id]) <= radius) { mem[id] = 1; count++; }
    }
    hub       = [fr.lng, fr.lat];
    label     = fr.name;
    kind      = 'Punto \u00b7 raggio ' + radius.toFixed(1) + ' km';
    sub       = count + ' celle';
    circle    = { lng: fr.lng, lat: fr.lat, km: radius };

  } else if (compareLevel === 'punto') {
    // ── Free point chosen on the map + radius ───────────────────────────────
    if (!compareHasPoint) return null;
    const radius = compareRadiusKm || 0.6;
    for (let id = 1; id <= cells.maxId; id++) {
      if (!cells.h3[id]) continue;
      if (hav(comparePtLat, comparePtLng, cells.lat[id], cells.lng[id]) <= radius) { mem[id] = 1; count++; }
    }
    hub   = [comparePtLng, comparePtLat];
    label = 'Punto selezionato';
    kind  = 'Punto \u00b7 raggio ' + radius.toFixed(1) + ' km';
    sub   = comparePtLat.toFixed(4) + ', ' + comparePtLng.toFixed(4) + ' \u00b7 ' + count + ' celle';
    circle = { lng: comparePtLng, lat: comparePtLat, km: radius };

  } else if (compareLevel === 'comune_esterno') {
    // ── External comune (province of Rome) ──────────────────────────────────
    if (compareComuneEsternoId === 'ROMA') {
      for (let id = 1; id <= cells.maxId; id++) if (cells.muni[id]) { mem[id] = 1; count++; }
      hub   = romaCentroid || gridCenter;
      label = 'Comune di Roma';
      kind  = 'Tutti i 15 municipi';
      sub   = count + ' celle';
    } else {
      if (compareComuneEsternoId == null || compareComuneEsternoId < 0 || !comuniGeo) return null;
      const feat = comuniGeo.features[compareComuneEsternoId];
      if (!feat) return null;
      const geom = feat.geometry;
      const inBox = (x, y, b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
      const bbox  = comuniBboxes ? comuniBboxes[compareComuneEsternoId] : null;
      for (let id = 1; id <= cells.maxId; id++) {
        if (!cells.h3[id]) continue;
        const x = cells.lng[id], y = cells.lat[id];
        if (bbox && !inBox(x, y, bbox)) continue;
        const inside = geom.type === 'Polygon'
          ? pip(x, y, geom.coordinates[0])
          : geom.coordinates.some(poly => pip(x, y, poly[0]));
        if (inside) { mem[id] = 1; count++; }
      }
      const centroid = (comuniLabelData && comuniLabelData[compareComuneEsternoId]?.position) || gridCenter;
      hub       = centroid;
      label     = feat.properties.name || 'Comune';
      kind      = 'Comune (Prov. Roma)';
      sub       = count + ' celle periurbane';
      polyRings = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map(p => p[0]);
    }

  } else {
    return null; // no level selected yet
  }

  if (count === 0) return null;
  return { mem, count, hub, label, kind, sub, polyRings, circle };
}

// ─── computeCompareCatchment ─────────────────────────────────────────────────
/**
 * Scans the full OD matrix and accumulates in / out / intra flows for the
 * Area B selection produced by buildCompareSelection().
 *
 * @param {object} sel          - Result of buildCompareSelection()
 * @param {object} cells        - data.cells (lat[], lng[], muni[], h3[], maxId)
 * @param {Uint16Array} odArr   - Flat OD array: [origin, dest, flux] × N
 * @param {number} odN          - Number of OD triples (odArr.length / 3)
 * @param {number} EF           - CO₂ emission factor g/km (117)
 * @param {Function} hav        - haversine(lat1,lng1,lat2,lng2) → km
 *
 * @returns {{
 *   inMap:    { [cellId]: number },   // incoming flows per origin cell
 *   outMap:   { [cellId]: number },   // outgoing flows per dest cell
 *   co2In:    { [cellId]: number },   // CO₂ contribution per origin cell (g/day)
 *   co2Out:   { [cellId]: number },   // CO₂ contribution per dest cell (g/day)
 *   totIn:    number,
 *   totOut:   number,
 *   totCo2In: number,
 *   totCo2Out:number,
 *   intra:    number,
 *   count:    number,
 *   mem:      Uint8Array,
 *   hub:      number[],
 *   label:    string,
 *   kind:     string,
 *   sub:      string,
 *   polyRings:any[]|null,
 * }}
 */
export function computeCompareCatchment(sel, cells, odArr, odN, EF, hav) {
  const { mem, hub } = sel;
  const inMap = {}, outMap = {}, co2In = {}, co2Out = {};
  let totIn = 0, totOut = 0, totCo2In = 0, totCo2Out = 0, intra = 0;

  for (let i = 0; i < odN; i++) {
    const o   = odArr[3 * i];
    const d   = odArr[3 * i + 1];
    const f   = odArr[3 * i + 2];
    const oin = mem[o];
    const din = mem[d];

    if (din && !oin) {
      // flow arriving into Area B from outside
      inMap[o] = (inMap[o] || 0) + f;
      totIn    += f;
      const g   = f * hav(cells.lat[o], cells.lng[o], hub[1], hub[0]) * EF;
      co2In[o]  = (co2In[o] || 0) + g;
      totCo2In += g;
    } else if (oin && !din) {
      // flow leaving Area B towards outside
      outMap[d] = (outMap[d] || 0) + f;
      totOut    += f;
      const g    = f * hav(cells.lat[d], cells.lng[d], hub[1], hub[0]) * EF;
      co2Out[d]  = (co2Out[d] || 0) + g;
      totCo2Out += g;
    } else if (oin && din) {
      intra += f;
    }
  }

  return {
    inMap, outMap, co2In, co2Out,
    totIn, totOut, totCo2In, totCo2Out, intra,
    count:     sel.count,
    mem:       sel.mem,
    hub:       sel.hub,
    label:     sel.label,
    kind:      sel.kind,
    sub:       sel.sub,
    polyRings: sel.polyRings,
    circle:    sel.circle,
  };
}

// ─── computeCompareChartsData ────────────────────────────────────────────────
/**
 * Pre-computes all chart series for the comparison view:
 *   - Smoothed inflow distribution by distance from hub
 *   - Binned CDF of inflow by distance
 *   - Smart-working CO₂ reduction curve
 *   - Flow totals for the grouped bar chart
 *
 * @param {object}   cat   - Main area catchment (from App.computeCatchment)
 * @param {object|null} catB - Comparison area catchment (from computeCompareCatchment), or null
 * @param {object}   cells  - data.cells (lat[], lng[])
 * @param {Function} hav    - haversine(lat1,lng1,lat2,lng2) → km
 * @returns {object}
 */
export function computeCompareChartsData(cat, catB, cells, hav) {
  if (!cat) return null;

  const BIN_STEP = 0.5, MAX_DIST = 30, N_BINS = 60; // 0–30 km, 0.5 km/bin
  const binCenters = Array.from({ length: N_BINS }, (_, i) => (i + 0.5) * BIN_STEP);

  // Raw binned distribution of a flow map by distance from hub (viaggi/g per fascia)
  const binRaw = (flowMap, hub) => {
    const bins = new Array(N_BINS).fill(0);
    if (!flowMap || !hub) return bins;
    for (const id in flowMap) {
      const d = hav(cells.lat[+id], cells.lng[+id], hub[1], hub[0]);
      bins[Math.min(Math.floor(d / BIN_STEP), N_BINS - 1)] += flowMap[id];
    }
    return bins;
  };

  const SW = [0, 5, 10, 15, 20, 25, 30, 40, 50];

  return {
    aLabel:   cat.label,
    bLabel:   catB ? catB.label : null,
    binCenters,
    // Raw binned distributions per direction (entrante / uscente)
    binsIn:  { a: binRaw(cat.inMap,  cat.hub),  b: catB ? binRaw(catB.inMap,  catB.hub)  : null },
    binsOut: { a: binRaw(cat.outMap, cat.hub),  b: catB ? binRaw(catB.outMap, catB.hub)  : null },
    // CO₂ totals per direction (grams/day)
    co2: {
      aIn:  cat.totCo2In  || 0, aOut:  cat.totCo2Out || 0,
      bIn:  catB ? (catB.totCo2In  || 0) : 0,
      bOut: catB ? (catB.totCo2Out || 0) : 0,
    },
    swLevels: SW,
    totals: {
      aIn: cat.totIn,   aOut: cat.totOut,   aIntra: cat.intra,
      bIn:   catB ? catB.totIn   : 0,
      bOut:  catB ? catB.totOut  : 0,
      bIntra: catB ? catB.intra  : 0,
    },
  };
}

// ─── buildCompareViewModel ───────────────────────────────────────────────────
/**
 * Derives all display-ready values for the comparison panel from a computed
 * catB result (output of computeCompareCatchment).
 *
 * @param {object|null} catB    - Result of computeCompareCatchment(), or null
 * @param {object} cells        - data.cells
 * @param {object} muniName     - { [muniId]: string }
 * @param {boolean} co2Mode     - whether to show CO₂ units instead of trip counts
 *
 * @returns {object} view-model fields ready for use in CompareTab / StatsTab
 */
export function buildCompareViewModel(catB, cells, muniName, co2Mode = false) {
  const fmt  = (n) => Math.round(n).toLocaleString('it-IT');
  const tonn = (g) => (g / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 });
  const kg   = (g) => Math.round(g / 1000).toLocaleString('it-IT');

  if (!catB) {
    return {
      hasCatchmentB: false,
      bLabel: '', bKind: '', bSub: '',
      bTotIn: '—', bTotOut: '—', bTotIntra: '—',
      bTopOrigins: [], bTopDests: [],
    };
  }

  const lab = (x) => co2Mode ? kg(x) : fmt(x);

  // aggregate per municipio
  const agg = (map) => {
    const a = {};
    for (const id in map) {
      const m = cells.muni[id] || 0;
      a[m] = (a[m] || 0) + map[id];
    }
    return Object.keys(a)
      .map((k) => ({
        name: +k
          ? (muniName[k] || 'Municipio ' + k).replace('Municipio Roma ', 'Mun. ')
          : 'Area periurbana',
        flux: a[k],
      }))
      .sort((x, y) => y.flux - x.flux);
  };

  const inSrc  = co2Mode ? catB.co2In  : catB.inMap;
  const outSrc = co2Mode ? catB.co2Out : catB.outMap;
  const oi = agg(inSrc),  mi = oi.length  ? oi[0].flux  : 1;
  const od = agg(outSrc), mo = od.length  ? od[0].flux  : 1;

  return {
    hasCatchmentB: true,
    bLabel:    catB.label,
    bKind:     catB.kind,
    bSub:      catB.sub,
    bTotIn:    co2Mode ? tonn(catB.totCo2In)  : fmt(catB.totIn),
    bTotOut:   co2Mode ? tonn(catB.totCo2Out) : fmt(catB.totOut),
    bTotIntra: fmt(catB.intra),
    bTopOrigins: oi.slice(0, 8).map((r) => ({ name: r.name, flux: lab(r.flux), pct: Math.max(3, r.flux / mi * 100) })),
    bTopDests:   od.slice(0, 8).map((r) => ({ name: r.name, flux: lab(r.flux), pct: Math.max(3, r.flux / mo * 100) })),
  };
}
