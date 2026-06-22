import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer, ArcLayer, ScatterplotLayer, PolygonLayer, TextLayer } from '@deck.gl/layers';
import PUNTI_NEVRALGICI, { nevralgicoColor } from '../data/puntiNevralgici.js';

/**
 * Builds all deck.gl layers from a context object.
 * @param {Object} ctx - Context with s, data, computed, colors, geo, onNevralgicClick
 * @returns {{ layers: Layer[], connInfo: Object|null }}
 */
export default function buildLayers(ctx) {
  const { s, data, computed, colors, geo, onNevralgicClick } = ctx;
  const { hexData, cat, catB, vmax, comuniGeo, boundaryGeo, quartieriGeo, zoneGeo, romaGeo,
          etichetteLabelData, comuniLabelData, muniLabelData, frazLabelData, mapZoom } = computed;
  const { cityColor, ramp, hex2rgb, stopsForMetric, catchStops, mix, connValue } = colors;
  const { circlePoly } = geo;

  const layers = [];
  const dark = s.basemap === 'dark';
  let connInfo = null;

  // Active selection target (A vs B) — drives the selectable polygon affordances
  const editingB = s.editTarget === 'B';
  const selLevel  = editingB ? s.compareLevel : s.areaLevel;
  const selMuni   = editingB ? s.compareMuni  : s.areaMuni;
  const selZone   = editingB ? s.compareZone  : s.areaZone;
  const selComune = editingB ? s.compareComuneEsternoId : s.comuneEsternoId;
  const selAccent = editingB ? [7, 127, 123] : [0, 51, 102];
  const selecting = s.tab === 'catchment';

  // Hex heatmap
  if (s.heatmap || s.grid) layers.push(new H3HexagonLayer({
    id: 'hex', data: hexData, getHexagon: (d) => d.h3, extruded: false, filled: s.heatmap, stroked: s.grid,
    getFillColor: (d) => cityColor(d.id), getLineColor: dark ? [255, 255, 255, 30] : [23, 50, 77, 32], lineWidthMinPixels: 0.5, getLineWidth: 1,
    pickable: true, autoHighlight: true, highlightColor: [0, 102, 204, 90],
    updateTriggers: { getFillColor: [s.metric, s.filterMuni, s.heatmap, JSON.stringify(s.heatColors)] },
  }));

  // CO₂ catchment overlay
  if (s.mode === 'catchment' && s.catchCo2 && s.tab === 'catchment') layers.push(new H3HexagonLayer({
    id: 'hex-co2', data: hexData, getHexagon: (d) => d.h3, extruded: false, filled: true, stroked: false,
    getFillColor: (d) => cityColor(d.id, 'co2'), getLineColor: [0, 0, 0, 0], lineWidthMinPixels: 0, pickable: false,
    updateTriggers: { getFillColor: [s.catchCo2, s.tab] },
  }));

  if (cat) {
    const c = data.cells, f = s.catchFlags;

    // Connection layer (in/out flows)
    if (f.in || f.out) {
      const conn = [], keys = {};
      if (f.in) Object.keys(cat.inMap).forEach((k) => (keys[k] = 1));
      if (f.out) Object.keys(cat.outMap).forEach((k) => (keys[k] = 1));
      let cvmax = 1;
      Object.keys(keys).forEach((id) => { const v = connValue(+id); if (v > cvmax) cvmax = v; if (c.h3[id]) conn.push({ id: +id, h3: c.h3[id], v }); });
      connInfo = { vmax: cvmax };
      const vlog = Math.log(1 + cvmax);
      const cStops = catchStops(), aStops = stopsForMetric('inc'), tStops = stopsForMetric('out'), both = f.in && f.out;
      layers.push(new H3HexagonLayer({
        id: 'conn', data: conn, getHexagon: (d) => d.h3, extruded: false, filled: true, stroked: false,
        getFillColor: (d) => {
          let t = Math.log(1 + d.v) / vlog; if (t > 1) t = 1; if (t < 0.05) t = 0.05;
          if (!both) { const col = ramp(t, cStops); return [col[0], col[1], col[2], 225]; }
          const iv = cat.inMap[d.id] || 0, ov = cat.outMap[d.id] || 0, tot = iv + ov, ratio = tot ? ov / tot : 0.5;
          const col = mix(ramp(t, aStops), ramp(t, tStops), ratio).map(Math.round); return [col[0], col[1], col[2], 225];
        },
        pickable: true, autoHighlight: true, highlightColor: [0, 102, 204, 80],
        updateTriggers: { getFillColor: [JSON.stringify(f), JSON.stringify(s.heatColors), s.areaLevel, s.areaMuni, s.areaZone, s.frazId, s.radiusKm, s.ptLat] },
      }));

      const hub = cat.hub, top = conn.slice().sort((a, b) => b.v - a.v).slice(0, 28), tf = top.length ? top[0].v : 1, arcsIn = [], arcsOut = [];
      top.forEach((t) => {
        const cell = [c.lng[t.id], c.lat[t.id]], iv = cat.inMap[t.id] || 0, ov = cat.outMap[t.id] || 0;
        if (f.in && iv) arcsIn.push({ from: cell, to: hub, f: iv });
        if (f.out && ov) arcsOut.push({ from: hub, to: cell, f: ov });
      });
      if (arcsIn.length) layers.push(new ArcLayer({ id: 'arcin', data: arcsIn, getSourcePosition: (d) => d.from, getTargetPosition: (d) => d.to, getSourceColor: [204, 122, 0, 70], getTargetColor: [204, 122, 0, 240], getWidth: (d) => 1 + (d.f / tf) * 8, widthUnits: 'pixels', getHeight: 0 }));
      if (arcsOut.length) layers.push(new ArcLayer({ id: 'arcout', data: arcsOut, getSourcePosition: (d) => d.from, getTargetPosition: (d) => d.to, getSourceColor: [7, 127, 123, 240], getTargetColor: [11, 203, 197, 70], getWidth: (d) => 1 + (d.f / tf) * 8, widthUnits: 'pixels', getHeight: 0 }));
    }

    // Internal trips layer
    if (f.internal) {
      const intData = [], intMet = data.metrics.internal, intVmax = vmax.internal, intStops = stopsForMetric('internal'), intVlog = Math.log(1 + intVmax);
      for (let id = 1; id <= c.maxId; id++) { if (cat.mem[id] && c.h3[id]) intData.push({ id, h3: c.h3[id] }); }
      layers.push(new H3HexagonLayer({
        id: 'internal', data: intData, getHexagon: (d) => d.h3, extruded: false, filled: true, stroked: false,
        getFillColor: (d) => { const v = intMet[d.id] || 0; if (!(v > 0)) return [0, 0, 0, 0]; let t = Math.log(1 + v) / intVlog; if (t > 1) t = 1; const col = ramp(t, intStops); return [col[0], col[1], col[2], 200]; },
        pickable: true, autoHighlight: true, highlightColor: [0, 102, 204, 80],
        updateTriggers: { getFillColor: [JSON.stringify(s.heatColors), s.areaLevel, s.areaMuni, s.areaZone, s.frazId, s.radiusKm, s.ptLat] },
      }));
    }

    // Area polygon / circle
    if (cat.polyRings) layers.push(new GeoJsonLayer({ id: 'areafill', data: { type: 'FeatureCollection', features: cat.polyRings.map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [r] } })) }, stroked: true, filled: true, getFillColor: [0, 51, 102, 24], getLineColor: [0, 51, 102, 235], getLineWidth: 2.5, lineWidthUnits: 'pixels' }));
    else if (cat.circle) layers.push(new PolygonLayer({ id: 'circle', data: [{ polygon: circlePoly(cat.circle.lng, cat.circle.lat, cat.circle.km) }], getPolygon: (d) => d.polygon, filled: true, stroked: true, getFillColor: [0, 51, 102, 18], getLineColor: [0, 51, 102, 200], getLineWidth: 2, lineWidthUnits: 'pixels' }));
    layers.push(new ScatterplotLayer({ id: 'hub', data: [{ p: cat.hub }], getPosition: (d) => d.p, getFillColor: [255, 200, 0], getRadius: 8, radiusUnits: 'pixels', stroked: true, getLineColor: [0, 51, 102], lineWidthMinPixels: 2.5 }));
  }

  // Area B overlay (Confronto tab, or while editing B in the Selezione tab)
  if ((s.tab === 'compare' || (s.tab === 'catchment' && s.editTarget === 'B')) && catB) {
    const cB = data.cells, memB = [];
    for (let id = 1; id <= cB.maxId; id++) { if (catB.mem[id] && cB.h3[id]) memB.push({ id, h3: cB.h3[id] }); }
    layers.push(new H3HexagonLayer({ id: 'areaB-cells', data: memB, getHexagon: (d) => d.h3, extruded: false, filled: true, stroked: false, getFillColor: [11, 203, 197, 70], pickable: false }));
    if (catB.polyRings) layers.push(new GeoJsonLayer({ id: 'areaB-fill', data: { type: 'FeatureCollection', features: catB.polyRings.map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [r] } })) }, stroked: true, filled: false, getLineColor: [7, 127, 123, 235], getLineWidth: 2.5, lineWidthUnits: 'pixels' }));
    else if (catB.circle) layers.push(new PolygonLayer({ id: 'areaB-circle', data: [{ polygon: circlePoly(catB.circle.lng, catB.circle.lat, catB.circle.km) }], getPolygon: (d) => d.polygon, filled: false, stroked: true, getLineColor: [7, 127, 123, 220], getLineWidth: 2, lineWidthUnits: 'pixels' }));
    layers.push(new ScatterplotLayer({ id: 'areaB-hub', data: [{ p: catB.hub }], getPosition: (d) => d.p, getFillColor: [11, 203, 197], getRadius: 8, radiusUnits: 'pixels', stroked: true, getLineColor: [7, 127, 123], lineWidthMinPixels: 2.5 }));
  }

  // Municipality boundaries
  if (s.showMuniBounds) {
    const mb = hex2rgb(s.muniBorderColor);
    layers.push(new GeoJsonLayer({ id: 'bounds', data: boundaryGeo, stroked: true, filled: false, getLineColor: (feat) => (s.filterMuni && feat.properties.n === s.filterMuni) ? [204, 122, 0, 255] : [...mb, 220], getLineWidth: (feat) => (s.filterMuni && feat.properties.n === s.filterMuni) ? Math.max(s.muniBorderWidth, 2.5) : s.muniBorderWidth, lineWidthUnits: 'pixels', lineWidthMinPixels: 1, updateTriggers: { getLineColor: [s.filterMuni, s.muniBorderColor], getLineWidth: [s.filterMuni, s.muniBorderWidth] } }));
  }

  // Municipality labels
  if (s.showMuniLabels && muniLabelData && muniLabelData.length) {
    const ml = hex2rgb(s.muniLabelColor);
    layers.push(new TextLayer({ id: 'munilabels', data: muniLabelData, getPosition: (d) => d.position, getText: (d) => d.text, getSize: s.muniLabelSize, getColor: [...ml, 235], getBackgroundColor: dark ? [0, 0, 0, 190] : [255, 255, 255, 210], background: true, backgroundPadding: [5, 3], fontWeight: 700, fontFamily: "'Titillium Web',sans-serif", billboard: false, sizeUnits: 'pixels', getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: [s.muniLabelColor], getSize: [s.muniLabelSize], getBackgroundColor: [s.basemap] } }));
  }

  // Quartieri boundaries
  if (s.showQuartieriBounds && quartieriGeo) {
    const qb = hex2rgb(s.quartieriBorderColor);
    layers.push(new GeoJsonLayer({ id: 'quartieri-bounds', data: quartieriGeo, stroked: true, filled: false, getLineColor: [...qb, 180], getLineWidth: s.quartieriBorderWidth, lineWidthUnits: 'pixels', lineWidthMinPixels: 0.5, updateTriggers: { getLineColor: [s.quartieriBorderColor], getLineWidth: [s.quartieriBorderWidth] } }));
  }

  // Quartieri / zone labels
  if (s.showQuartieriLabels && etichetteLabelData) {
    const ql = hex2rgb(s.quartieriLabelColor);
    layers.push(new TextLayer({ id: 'quartieriLabels', data: etichetteLabelData, getPosition: (d) => d.position, getText: (d) => d.text, getSize: s.quartieriLabelSize, getColor: [...ql, 220], getBackgroundColor: dark ? [0, 0, 0, 170] : [240, 245, 255, 200], background: true, backgroundPadding: [4, 2], fontFamily: "'Titillium Web',sans-serif", fontWeight: 600, billboard: false, sizeUnits: 'pixels', getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: [s.quartieriLabelColor], getSize: [s.quartieriLabelSize], getBackgroundColor: [s.basemap] } }));
  }

  // Frazione labels
  if (s.showFrazioni && frazLabelData && mapZoom >= 11) {
    const fl = hex2rgb(s.frazLabelColor);
    layers.push(new TextLayer({ id: 'frazlabels', data: frazLabelData, getPosition: (d) => d.position, getText: (d) => d.text, getSize: s.frazLabelSize, getColor: [...fl, 230], getBackgroundColor: dark ? [0, 0, 0, 180] : [240, 255, 253, 215], background: true, backgroundPadding: [4, 2], fontFamily: "'Titillium Web',sans-serif", fontWeight: 600, billboard: false, sizeUnits: 'pixels', getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: [s.frazLabelColor], getSize: [s.frazLabelSize], getBackgroundColor: [s.basemap] } }));
  }

  // Selectable municipio polygons (active target, Selezione tab)
  if (selecting && selLevel === 'municipio' && boundaryGeo) {
    layers.push(new GeoJsonLayer({
      id: 'muni-select', data: boundaryGeo, stroked: true, filled: true, pickable: true, autoHighlight: true,
      highlightColor: [...selAccent, 55],
      getFillColor: (feat) => (feat.properties.n === selMuni) ? [...selAccent, 42] : [...selAccent, 10],
      getLineColor: [...selAccent, 230],
      getLineWidth: (feat) => (feat.properties.n === selMuni) ? 2.5 : 1.2, lineWidthUnits: 'pixels', lineWidthMinPixels: 1,
      updateTriggers: { getFillColor: [selMuni, editingB], getLineWidth: [selMuni], getLineColor: [editingB] },
    }));
  }

  // Selectable zona polygons (active target, Selezione tab)
  if (selecting && selLevel === 'zona' && zoneGeo) {
    layers.push(new GeoJsonLayer({
      id: 'zona-select', data: zoneGeo, stroked: true, filled: true, pickable: true, autoHighlight: true,
      highlightColor: [...selAccent, 55],
      getFillColor: (feat) => (feat.properties.id === selZone) ? [...selAccent, 42] : [...selAccent, 10],
      getLineColor: [...selAccent, 230],
      getLineWidth: (feat) => (feat.properties.id === selZone) ? 2.5 : 1, lineWidthUnits: 'pixels', lineWidthMinPixels: 0.8,
      updateTriggers: { getFillColor: [selZone, editingB], getLineWidth: [selZone], getLineColor: [editingB] },
    }));
  }

  // Selectable Comune di Roma polygon (union of municipi) — Roma is only a 'ROMA' option, not in comuniGeo
  if (selecting && selLevel === 'comune_esterno' && romaGeo) {
    const romaSel = selComune === 'ROMA';
    layers.push(new GeoJsonLayer({
      id: 'roma-select', data: romaGeo, stroked: true, filled: true, pickable: true, autoHighlight: true,
      highlightColor: [...selAccent, 55],
      getFillColor: romaSel ? [...selAccent, 42] : [...selAccent, 10],
      getLineColor: [...selAccent, 230],
      getLineWidth: romaSel ? 2.5 : 1.2, lineWidthUnits: 'pixels', lineWidthMinPixels: 1,
      updateTriggers: { getFillColor: [selComune, editingB], getLineWidth: [selComune], getLineColor: [editingB] },
    }));
  }

  // Comuni (province) boundaries
  if ((s.showComuniBounds || selLevel === 'comune_esterno') && comuniGeo) {
    const bc = hex2rgb(s.comuniBorderColor);
    const selMode = selLevel === 'comune_esterno';
    layers.push(new GeoJsonLayer({ id: 'comuni-bounds', data: comuniGeo, stroked: true, filled: selMode, getFillColor: [0, 51, 102, 8], pickable: true, autoHighlight: true, highlightColor: [...hex2rgb(s.comuniBorderColor), selMode ? 30 : 60], getLineColor: [...bc, 220], getLineWidth: s.comuniBorderWidth, lineWidthUnits: 'pixels', lineWidthMinPixels: 1, updateTriggers: { getLineColor: [s.comuniBorderColor], getLineWidth: [s.comuniBorderWidth], filled: [selMode] } }));
  }

  // Comuni labels
  if (s.showComuniLabels && comuniLabelData) {
    const lc = hex2rgb(s.comuniLabelColor);
    layers.push(new TextLayer({ id: 'comuni-labels', data: comuniLabelData, getPosition: (d) => d.position, getText: (d) => d.text, getSize: s.comuniLabelSize, getColor: [...lc, 235], getBackgroundColor: dark ? [10, 0, 30, 185] : [255, 255, 255, 215], background: true, backgroundPadding: [4, 2], fontFamily: "'Titillium Web',sans-serif", fontWeight: 600, billboard: false, sizeUnits: 'pixels', getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: [s.comuniLabelColor, s.basemap], getSize: [s.comuniLabelSize], getBackgroundColor: [s.basemap] } }));
  }

  // Punti nevralgici (strategic points)
  if (s.showNevralgic) layers.push(new ScatterplotLayer({ id: 'nevralgic', data: PUNTI_NEVRALGICI, getPosition: (d) => [d.longitudine, d.latitudine], getFillColor: (d) => nevralgicoColor(d.tipologia), getLineColor: [255, 255, 255], getRadius: 9, radiusUnits: 'pixels', stroked: true, lineWidthMinPixels: 2, pickable: true, autoHighlight: true, highlightColor: [255, 240, 150, 120], onClick: (info) => { if (info.object) onNevralgicClick(info.object); } }));

  return { layers, connInfo };
}
