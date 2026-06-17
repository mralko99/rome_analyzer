import React from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer, ArcLayer, ScatterplotLayer, PolygonLayer } from '@deck.gl/layers';

const B = import.meta.env.BASE_URL;

// Parse a CSS declaration string into a React style object (so the original
// inline-style strings from the design can be reused verbatim).
function css(str) {
  const o = {};
  str.split(';').forEach((d) => {
    d = d.trim();
    if (!d) return;
    const i = d.indexOf(':');
    const k = d.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    o[k] = d.slice(i + 1).trim();
  });
  return o;
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true, loadMsg: 'Caricamento dati di mobilità…', errorMsg: '',
      mode: 'city', metric: 'out',
      heatmap: true, grid: true, bounds: true,
      basemap: 'positron', filterMuni: 0,
      timeEnabled: false, hourStart: 7, hourEnd: 9,
      heatColors: { out: null, inc: null, co2: null },
      panelOpen: true, tab: 'settings',
      catchMode: 'radius', catchDir: 'in', catchCo2: false, radiusKm: 0.6,
      areaLevel: '', areaMuni: 0, areaZone: -1, frazId: -1,
      hasPoint: false, ptLng: 0, ptLat: 0,
    };
    this.RAMPS = {
      navy: [[219,234,254],[147,196,245],[67,146,224],[0,77,153],[0,40,80]],
      teal: [[204,255,253],[121,236,232],[11,203,197],[7,127,123],[4,70,68]],
      ambra: [[248,232,205],[238,182,110],[224,140,67],[204,80,55],[150,25,38]],
    };
    this.metricRamp = { out: 'navy', inc: 'teal', co2: 'ambra' };
    this.metricShort = { out: 'Uscenti', inc: 'Entranti', co2: 'CO₂' };
    this.SWATCHES = ['#003366', '#089994', '#cc7a00', '#cc334d', '#008055'];
    this.EF = 117;
    this.HFR = [0.004,0.003,0.002,0.002,0.004,0.010,0.030,0.070,0.105,0.072,0.050,0.045,0.050,0.045,0.044,0.050,0.072,0.100,0.088,0.050,0.032,0.020,0.013,0.009];
    this.STYLES = {
      positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    };
    this.METRIC_LABEL = { out: 'Spostamenti uscenti', inc: 'Spostamenti entranti', co2: 'Emissioni CO₂' };
    this.PRESETS = [
      { name: 'Anagnina', lat: 41.84276, lng: 12.58606 },
      { name: 'Saxa Rubra', lat: 41.974638, lng: 12.49328 },
      { name: 'Centro (Colosseo)', lat: 41.8902, lng: 12.4922 },
      { name: 'Tiburtina', lat: 41.9105, lng: 12.5302 },
    ];
  }

  // ---------- geo helpers ----------
  hav(a1, o1, a2, o2) { const R = 6371, dLat = (a2 - a1) * Math.PI / 180, dLon = (o2 - o1) * Math.PI / 180, la1 = a1 * Math.PI / 180, la2 = a2 * Math.PI / 180; const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  pip(x, y, r) { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
  pipR(x, y, rings) { for (const r of rings) if (this.pip(x, y, r)) return true; return false; }

  componentDidMount() { this.loadData(); }
  componentDidUpdate() { this.updateLegend(); this.updateColorPreview(); }

  async loadData() {
    try {
      const [cells, metrics, panels, municipi, zone, frazioni, b64] = await Promise.all([
        fetch(B + 'data/build/cells.json').then((r) => r.json()),
        fetch(B + 'data/build/metrics.json').then((r) => r.json()),
        fetch(B + 'data/build/panels.json').then((r) => r.json()),
        fetch(B + 'data/build/municipi.json').then((r) => r.json()),
        fetch(B + 'data/build/zone.json').then((r) => r.json()),
        fetch(B + 'data/build/frazioni.json').then((r) => r.json()),
        fetch(B + 'data/build/od_packed.b64.txt').then((r) => r.text()),
      ]);
      this.data = { cells, metrics, panels, municipi, zone, frazioni };
      const bin = atob(b64.trim()); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      this.od = new Uint16Array(bytes.buffer); this.odN = this.od.length / 3;
      const hex = []; for (let id = 1; id <= cells.maxId; id++) if (cells.h3[id]) hex.push({ id, h3: cells.h3[id] });
      this.hexData = hex;
      this.vmax = { out: 0, inc: 0, co2: 0 };
      for (const k of ['out', 'inc', 'co2']) { const a = metrics[k]; let mx = 0; for (let i = 1; i < a.length; i++) if (a[i] > mx) mx = a[i]; this.vmax[k] = mx; }
      const sl = {}, sa = {}, cn = {}; let gx = 0, gy = 0, gc = 0, rx = 0, ry = 0, rc = 0;
      for (let id = 1; id <= cells.maxId; id++) { if (!cells.h3[id]) continue; gx += cells.lng[id]; gy += cells.lat[id]; gc++; const mn = cells.muni[id]; if (mn) { sl[mn] = (sl[mn] || 0) + cells.lng[id]; sa[mn] = (sa[mn] || 0) + cells.lat[id]; cn[mn] = (cn[mn] || 0) + 1; rx += cells.lng[id]; ry += cells.lat[id]; rc++; } }
      this.muniCentroid = {}; Object.keys(cn).forEach((k) => (this.muniCentroid[k] = [sl[k] / cn[k], sa[k] / cn[k]]));
      this.gridCenter = [gx / gc, gy / gc]; this.romaCentroid = [rx / rc, ry / rc];
      this.zoneById = {}; zone.forEach((z) => (this.zoneById[z.id] = z));
      const feats = []; this.muniName = {}; this.muniBbox = {}; this.muniRings = {};
      municipi.forEach((m) => { this.muniName[m.numero] = m.name; this.muniBbox[m.numero] = m.bbox; this.muniRings[m.numero] = m.rings; m.rings.forEach((r) => feats.push({ type: 'Feature', properties: { n: m.numero }, geometry: { type: 'Polygon', coordinates: [r] } })); });
      this.boundaryGeo = { type: 'FeatureCollection', features: feats };
      this.setState({ loading: false }, () => this.initMap());
    } catch (e) { this.setState({ loading: false, errorMsg: 'Errore nel caricamento dei dati: ' + e.message }); }
  }

  initMap() {
    this.map = new maplibregl.Map({ container: this.mapEl, style: this.STYLES[this.state.basemap], center: [12.52, 41.9], zoom: 9.3, minZoom: 8, maxZoom: 15, attributionControl: { compact: true }, preserveDrawingBuffer: true, dragRotate: false, pitchWithRotate: false });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.overlay = new MapboxOverlay({ interleaved: true, layers: [], getTooltip: (i) => this.tooltip(i) });
    this.map.addControl(this.overlay);
    this.map.on('click', (e) => this.setPoint(e.lngLat.lng, e.lngLat.lat));
    this.map.on('load', () => { this.updateLayers(); this.updateLegend(); });
    this.applyPanel();
  }

  // ---------- color ----------
  hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  stopsFromColor(hex) { const c = this.hex2rgb(hex), w = [255, 255, 255], k = [0, 0, 0]; return [this.mix(w, c, .16), this.mix(w, c, .46), c, this.mix(c, k, .3), this.mix(c, k, .55)].map((x) => x.map(Math.round)); }
  stopsForMetric(m) { const h = this.state.heatColors[m]; return h ? this.stopsFromColor(h) : this.RAMPS[this.metricRamp[m]]; }
  cityStops() { return this.stopsForMetric(this.state.metric); }
  catchStops() { const s = this.state; if (s.catchCo2) return this.stopsForMetric('co2'); if (s.catchDir === 'both') return null; return this.stopsForMetric(s.catchDir === 'in' ? 'inc' : 'out'); }
  ramp(t, stops) { const n = stops.length - 1; let x = t * n; if (x < 0) x = 0; if (x > n) x = n; let i = Math.floor(x); if (i >= n) i = n - 1; const u = x - i, a = stops[i], b = stops[i + 1]; return [Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), Math.round(a[2] + (b[2] - a[2]) * u)]; }

  timeFactor() { const s = this.state; if (!s.timeEnabled) return 1; let f = 0, a = Math.min(s.hourStart, s.hourEnd), b = Math.max(s.hourStart, s.hourEnd); for (let h = a; h <= b; h++) f += this.HFR[h]; return f; }

  cityColor(id) {
    const k = this.state.metric, f = this.timeFactor(), stops = this.cityStops();
    const v = (this.data.metrics[k][id] || 0) * f; if (!(v > 0)) return [0, 0, 0, 0];
    let t = Math.log(1 + v) / Math.log(1 + this.vmax[k]); if (t > 1) t = 1;
    const c = this.ramp(t, stops); let a = 205; const fm = this.state.filterMuni; if (fm && this.data.cells.muni[id] !== fm) a = 16;
    return [c[0], c[1], c[2], a];
  }

  buildSelection() {
    const cells = this.data.cells, mem = new Uint8Array(cells.maxId + 1); let count = 0; const s = this.state;
    let hub, label, kind, sub, polyRings = null, circle = null;
    const inBox = (x, y, b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
    if (s.catchMode === 'radius' || s.areaLevel === 'frazione') {
      let lat, lng, name;
      if (s.areaLevel === 'frazione') { const fr = this.data.frazioni[s.frazId]; if (!fr) return null; lat = fr.lat; lng = fr.lng; name = fr.name; }
      else { if (!s.hasPoint) return null; lat = s.ptLat; lng = s.ptLng; name = this._ptName; }
      for (let id = 1; id <= cells.maxId; id++) { if (!cells.h3[id]) continue; if (this.hav(lat, lng, cells.lat[id], cells.lng[id]) <= s.radiusKm) { mem[id] = 1; count++; } }
      hub = [lng, lat]; label = name || 'Punto selezionato'; kind = s.areaLevel === 'frazione' ? 'Frazione · raggio' : 'Bacino · raggio'; sub = lat.toFixed(4) + ', ' + lng.toFixed(4) + ' · ' + count + ' celle'; circle = { lng, lat, km: s.radiusKm };
    } else if (s.areaLevel === 'capitale') {
      for (let id = 1; id <= cells.maxId; id++) if (cells.h3[id]) { mem[id] = 1; count++; }
      hub = this.gridCenter; label = 'Roma Capitale'; kind = 'Intera area metropolitana'; sub = count + ' celle H3';
    } else if (s.areaLevel === 'comune') {
      for (let id = 1; id <= cells.maxId; id++) if (cells.muni[id]) { mem[id] = 1; count++; }
      hub = this.romaCentroid; label = 'Comune di Roma'; kind = 'Tutti i 15 municipi'; sub = count + ' celle nei municipi';
    } else if (s.areaLevel === 'municipio') {
      if (!s.areaMuni) return null; for (let id = 1; id <= cells.maxId; id++) if (cells.muni[id] === s.areaMuni) { mem[id] = 1; count++; }
      hub = this.muniCentroid[s.areaMuni]; label = this.muniName[s.areaMuni]; kind = 'Municipio'; sub = count + ' celle del municipio'; polyRings = this.muniRings[s.areaMuni];
    } else if (s.areaLevel === 'zona') {
      const z = this.zoneById[s.areaZone]; if (!z) return null;
      for (let id = 1; id <= cells.maxId; id++) { if (!cells.h3[id]) continue; const x = cells.lng[id], y = cells.lat[id]; if (!inBox(x, y, z.bbox)) continue; if (this.pipR(x, y, z.rings)) { mem[id] = 1; count++; } }
      hub = [z.cx, z.cy]; label = z.name; kind = z.tipo + (z.muni ? ' · ' + (this.muniName[z.muni] || '') : ''); sub = count + ' celle'; polyRings = z.rings;
    } else return null;
    return { mem, count, hub, label, kind, sub, polyRings, circle };
  }

  computeCatchment() {
    const sel = this.buildSelection(); if (!sel) { this.cat = null; return; }
    const cells = this.data.cells, arr = this.od, n = this.odN, mem = sel.mem, hub = sel.hub;
    const inMap = {}, outMap = {}, co2In = {}, co2Out = {}; let totIn = 0, totOut = 0, totCo2In = 0, totCo2Out = 0, intra = 0;
    for (let i = 0; i < n; i++) {
      const o = arr[3 * i], d = arr[3 * i + 1], f = arr[3 * i + 2], oin = mem[o], din = mem[d];
      if (din && !oin) { inMap[o] = (inMap[o] || 0) + f; totIn += f; const g = f * this.hav(cells.lat[o], cells.lng[o], hub[1], hub[0]) * this.EF; co2In[o] = (co2In[o] || 0) + g; totCo2In += g; }
      else if (oin && !din) { outMap[d] = (outMap[d] || 0) + f; totOut += f; const g = f * this.hav(cells.lat[d], cells.lng[d], hub[1], hub[0]) * this.EF; co2Out[d] = (co2Out[d] || 0) + g; totCo2Out += g; }
      else if (oin && din) intra += f;
    }
    this.cat = { inMap, outMap, co2In, co2Out, totIn, totOut, totCo2In, totCo2Out, intra, count: sel.count, hub, label: sel.label, kind: sel.kind, sub: sel.sub, polyRings: sel.polyRings, circle: sel.circle };
  }

  connValue(id) { const c = this.cat, d = this.state.catchDir, co2 = this.state.catchCo2; if (co2) { if (d === 'in') return c.co2In[id] || 0; if (d === 'out') return c.co2Out[id] || 0; return (c.co2In[id] || 0) + (c.co2Out[id] || 0); } if (d === 'in') return c.inMap[id] || 0; if (d === 'out') return c.outMap[id] || 0; return (c.inMap[id] || 0) + (c.outMap[id] || 0); }

  updateLayers() {
    if (!this.overlay || !this.data) return;
    const s = this.state, layers = [], dark = s.basemap === 'dark';
    if (s.mode === 'city') {
      if (s.heatmap || s.grid) layers.push(new H3HexagonLayer({
        id: 'hex', data: this.hexData, getHexagon: (d) => d.h3, extruded: false, filled: s.heatmap, stroked: s.grid,
        getFillColor: (d) => this.cityColor(d.id), getLineColor: dark ? [255, 255, 255, 30] : [23, 50, 77, 32], lineWidthMinPixels: 0.5, getLineWidth: 1,
        pickable: true, autoHighlight: true, highlightColor: [0, 102, 204, 90],
        updateTriggers: { getFillColor: [s.metric, s.timeEnabled, s.hourStart, s.hourEnd, s.filterMuni, s.heatmap, JSON.stringify(s.heatColors)] },
      }));
    } else if (this.cat) {
      const c = this.data.cells, conn = [], keys = {};
      if (s.catchDir !== 'out') { const m = s.catchCo2 ? this.cat.co2In : this.cat.inMap; Object.keys(m).forEach((k) => (keys[k] = 1)); }
      if (s.catchDir !== 'in') { const m = s.catchCo2 ? this.cat.co2Out : this.cat.outMap; Object.keys(m).forEach((k) => (keys[k] = 1)); }
      let vmax = 1; Object.keys(keys).forEach((id) => { const v = this.connValue(+id); if (v > vmax) vmax = v; if (c.h3[id]) conn.push({ id: +id, h3: c.h3[id], v }); });
      this.connInfo = { vmax }; const vlog = Math.log(1 + vmax);
      const cStops = this.catchStops(), aStops = this.stopsForMetric('inc'), tStops = this.stopsForMetric('out'), both = s.catchDir === 'both' && !s.catchCo2;
      layers.push(new H3HexagonLayer({
        id: 'conn', data: conn, getHexagon: (d) => d.h3, filled: true, stroked: false,
        getFillColor: (d) => {
          let t = Math.log(1 + d.v) / vlog; if (t > 1) t = 1; if (t < 0.05) t = 0.05;
          if (!both) { const col = this.ramp(t, cStops); return [col[0], col[1], col[2], 225]; }
          const iv = this.cat.inMap[d.id] || 0, ov = this.cat.outMap[d.id] || 0, tot = iv + ov, ratio = tot ? ov / tot : 0.5;
          const col = this.mix(this.ramp(t, aStops), this.ramp(t, tStops), ratio).map(Math.round); return [col[0], col[1], col[2], 225];
        },
        pickable: true, autoHighlight: true, highlightColor: [0, 102, 204, 80],
        updateTriggers: { getFillColor: [s.catchDir, s.catchCo2, JSON.stringify(s.heatColors), s.areaLevel, s.areaMuni, s.areaZone, s.frazId, s.radiusKm, s.ptLat] },
      }));
      const hub = this.cat.hub, top = conn.slice().sort((a, b) => b.v - a.v).slice(0, 28), tf = top.length ? top[0].v : 1, arcsIn = [], arcsOut = [];
      top.forEach((t) => { const cell = [c.lng[t.id], c.lat[t.id]], iv = s.catchCo2 ? (this.cat.co2In[t.id] || 0) : (this.cat.inMap[t.id] || 0), ov = s.catchCo2 ? (this.cat.co2Out[t.id] || 0) : (this.cat.outMap[t.id] || 0); if (s.catchDir !== 'out' && iv) arcsIn.push({ from: cell, to: hub, f: iv }); if (s.catchDir !== 'in' && ov) arcsOut.push({ from: hub, to: cell, f: ov }); });
      if (arcsIn.length) layers.push(new ArcLayer({ id: 'arcin', data: arcsIn, getSourcePosition: (d) => d.from, getTargetPosition: (d) => d.to, getSourceColor: [204, 122, 0, 70], getTargetColor: [204, 122, 0, 240], getWidth: (d) => 1 + (d.f / tf) * 8, widthUnits: 'pixels', getHeight: 0.45 }));
      if (arcsOut.length) layers.push(new ArcLayer({ id: 'arcout', data: arcsOut, getSourcePosition: (d) => d.from, getTargetPosition: (d) => d.to, getSourceColor: [7, 127, 123, 240], getTargetColor: [11, 203, 197, 70], getWidth: (d) => 1 + (d.f / tf) * 8, widthUnits: 'pixels', getHeight: 0.45 }));
      if (this.cat.polyRings) layers.push(new GeoJsonLayer({ id: 'areafill', data: { type: 'FeatureCollection', features: this.cat.polyRings.map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [r] } })) }, stroked: true, filled: true, getFillColor: [0, 51, 102, 24], getLineColor: [0, 51, 102, 235], getLineWidth: 2.5, lineWidthUnits: 'pixels' }));
      else if (this.cat.circle) layers.push(new PolygonLayer({ id: 'circle', data: [{ polygon: this.circlePoly(this.cat.circle.lng, this.cat.circle.lat, this.cat.circle.km) }], getPolygon: (d) => d.polygon, filled: true, stroked: true, getFillColor: [0, 51, 102, 18], getLineColor: [0, 51, 102, 200], getLineWidth: 2, lineWidthUnits: 'pixels' }));
      if (s.grid) layers.push(new H3HexagonLayer({ id: 'ctxgrid', data: this.hexData, getHexagon: (d) => d.h3, filled: false, stroked: true, getLineColor: dark ? [255, 255, 255, 45] : [23, 50, 77, 48], lineWidthMinPixels: 0.5 }));
      layers.push(new ScatterplotLayer({ id: 'hub', data: [{ p: hub }], getPosition: (d) => d.p, getFillColor: [255, 200, 0], getRadius: 8, radiusUnits: 'pixels', stroked: true, getLineColor: [0, 51, 102], lineWidthMinPixels: 2.5 }));
    }
    if (s.bounds) layers.push(new GeoJsonLayer({ id: 'bounds', data: this.boundaryGeo, stroked: true, filled: false, getLineColor: (f) => (s.filterMuni && f.properties.n === s.filterMuni) ? [204, 122, 0, 255] : (dark ? [255, 255, 255, 150] : [0, 51, 102, 150]), getLineWidth: (f) => (s.filterMuni && f.properties.n === s.filterMuni) ? 3 : 1.4, lineWidthUnits: 'pixels', lineWidthMinPixels: 1.2, updateTriggers: { getLineColor: [s.filterMuni, s.basemap], getLineWidth: [s.filterMuni] } }));
    this.overlay.setProps({ layers });
  }

  circlePoly(lng, lat, km) { const pts = [], R = 6371, d = km / R, la1 = lat * Math.PI / 180, lo1 = lng * Math.PI / 180; for (let i = 0; i <= 64; i++) { const b = i / 64 * 2 * Math.PI; const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b)); const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2)); pts.push([lo2 * 180 / Math.PI, la2 * 180 / Math.PI]); } return pts; }

  gradStr(stops) { return `linear-gradient(90deg, ${stops.map((c, i) => `rgb(${c[0]},${c[1]},${c[2]}) ${(i / (stops.length - 1) * 100).toFixed(0)}%`).join(',')})`; }
  bothGradStr() { const a = this.ramp(.7, this.stopsForMetric('inc')), b = this.ramp(.7, this.stopsForMetric('out')); return `linear-gradient(90deg, rgb(${a.join(',')}), #b8b08a, rgb(${b.join(',')}))`; }
  updateLegend() { if (!this.legendBar) return; const s = this.state; if (s.mode === 'catchment' && s.catchDir === 'both' && !s.catchCo2) this.legendBar.style.background = this.bothGradStr(); else this.legendBar.style.background = this.gradStr(s.mode === 'catchment' ? (this.catchStops() || this.stopsForMetric('co2')) : this.cityStops()); }
  updateColorPreview() { if (!this.colorPreview) return; this.colorPreview.style.background = this.gradStr(this.cityStops()); }

  tooltip({ object, layer }) {
    if (!object || !layer) return null; const fmt = (n) => Math.round(n).toLocaleString('it-IT');
    if (layer.id === 'hex') { const id = object.id, m = this.data.metrics, c = this.data.cells, f = this.timeFactor(); const mn = c.muni[id] ? (this.muniName[c.muni[id]] || '') : 'Area periurbana'; return { html: `<div style="font-family:'Titillium Web',sans-serif;min-width:150px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:2px">${mn}</div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Uscenti</span><b>${fmt((m.out[id] || 0) * f)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Entranti</span><b>${fmt((m.inc[id] || 0) * f)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>CO₂ t/g</span><b>${((m.co2[id] || 0) * f).toFixed(2)}</b></div></div>`, style: this.ttStyle() }; }
    if (layer.id === 'conn') { const c = this.data.cells, mn = c.muni[object.id] ? (this.muniName[c.muni[object.id]] || '') : 'Area periurbana'; const kg = (g) => (g / 1000).toLocaleString('it-IT', { maximumFractionDigits: 0 }); return { html: `<div style="font-family:'Titillium Web',sans-serif;min-width:160px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:2px">${mn}</div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Verso il bacino</span><b>${fmt(this.cat.inMap[object.id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Dal bacino</span><b>${fmt(this.cat.outMap[object.id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px;opacity:.8"><span>CO₂ kg/g</span><b>${kg((this.cat.co2In[object.id] || 0) + (this.cat.co2Out[object.id] || 0))}</b></div></div>`, style: this.ttStyle() }; }
    return null;
  }
  ttStyle() { return { background: '#003366', color: '#fff', padding: '8px 11px', borderRadius: '4px', boxShadow: '0 8px 16px rgba(0,0,0,.2)', fontSize: '12px' }; }

  refresh() { this.updateLayers(); this.updateLegend(); this.updateColorPreview(); }
  setMetric(m) { this.setState({ metric: m }, () => this.refresh()); }
  toggle(k) { this.setState((s) => ({ [k]: !s[k] }), () => this.refresh()); }
  setHeatColor(v) { this.setState((s) => ({ heatColors: { ...s.heatColors, [s.metric]: v } }), () => this.refresh()); }
  setAuto() { this.setState((s) => ({ heatColors: { ...s.heatColors, [s.metric]: null } }), () => this.refresh()); }
  setTab(t) { this.setState({ tab: t }); }
  setDir(d) { this.setState({ catchDir: d }, () => this.refresh()); }
  toggleCo2() { this.setState((s) => ({ catchCo2: !s.catchCo2 }), () => this.refresh()); }
  setBasemapVal(v) { this.setState({ basemap: v }); if (this.map) { this.map.setStyle(this.STYLES[v]); this.map.once('styledata', () => setTimeout(() => { this.updateLayers(); this.updateLegend(); }, 120)); } }
  setFilterVal(v) { v = +v; this.setState({ filterMuni: v }, () => this.refresh()); if (this.map) { if (v && this.muniBbox[v]) { const b = this.muniBbox[v]; this.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 60, duration: 700 }); } else this.map.flyTo({ center: [12.52, 41.9], zoom: 9.3, duration: 700 }); } }
  setHourStart(v) { v = +v; this.setState((s) => ({ hourStart: v, hourEnd: Math.max(v, s.hourEnd) }), () => this.refresh()); }
  setHourEnd(v) { v = +v; this.setState((s) => ({ hourEnd: v, hourStart: Math.min(v, s.hourStart) }), () => this.refresh()); }
  toggleTime() { this.setState((s) => ({ timeEnabled: !s.timeEnabled }), () => this.refresh()); }

  nearestName(lat, lng) { const c = this.data.cells; let mn = 0, bd = 1e9; for (let id = 1; id <= c.maxId; id++) { if (!c.h3[id]) continue; const d = this.hav(lat, lng, c.lat[id], c.lng[id]); if (d < bd) { bd = d; mn = c.muni[id]; } } return mn ? (this.muniName[mn] || 'Punto selezionato') : 'Area periurbana'; }
  setPoint(lng, lat, name) { this._ptName = name || this.nearestName(lat, lng); this.setState({ hasPoint: true, ptLng: lng, ptLat: lat, mode: 'catchment', catchMode: 'radius', areaLevel: '', tab: 'catchment' }, () => { this.computeCatchment(); this.refresh(); }); }
  setPreset(p) { this.setPoint(p.lng, p.lat, p.name); if (this.map) this.map.flyTo({ center: [p.lng, p.lat], zoom: 11, duration: 800 }); }
  setRadius(v) { this.setState({ radiusKm: +v }); clearTimeout(this._rt); this._rt = setTimeout(() => { if (this.cat && this.cat.circle) { this.computeCatchment(); this.refresh(); } }, 130); }
  setCatchMode(m) { this.cat = null; this._ptName = null; this.setState({ catchMode: m, mode: 'city', hasPoint: false, areaLevel: '', areaMuni: 0, areaZone: -1, frazId: -1 }, () => this.refresh()); }
  setAreaLevel(v) { this.cat = null; this.setState({ areaLevel: v, mode: 'city', areaMuni: 0, areaZone: -1, frazId: -1 }, () => { if (v === 'capitale' || v === 'comune') { this.setState({ mode: 'catchment' }, () => { this.computeCatchment(); this.refresh(); }); if (this.map) this.map.flyTo({ center: this.gridCenter, zoom: v === 'capitale' ? 9.2 : 10, duration: 700 }); } else this.refresh(); }); }
  setAreaMuni(v) { v = +v; const lvl = this.state.areaLevel; if (lvl === 'zona') { this.setState({ areaMuni: v, areaZone: -1 }, () => this.refresh()); return; } if (!v) { this.cat = null; this.setState({ areaMuni: 0, mode: 'city' }, () => this.refresh()); return; } this.setState({ areaMuni: v, mode: 'catchment' }, () => { this.computeCatchment(); this.refresh(); }); if (this.map && this.muniBbox[v]) { const b = this.muniBbox[v]; this.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 70, duration: 700 }); } }
  setAreaZone(v) { v = +v; if (v < 0) { this.cat = null; this.setState({ areaZone: -1, mode: 'city' }, () => this.refresh()); return; } this.setState({ areaZone: v, mode: 'catchment' }, () => { this.computeCatchment(); this.refresh(); }); const z = this.zoneById[v]; if (this.map && z) { const b = z.bbox; this.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 80, duration: 700 }); } }
  setFraz(v) { v = +v; if (v < 0) { this.cat = null; this.setState({ frazId: -1, mode: 'city' }, () => this.refresh()); return; } const fr = this.data.frazioni[v]; this.setState({ frazId: v, mode: 'catchment' }, () => { this.computeCatchment(); this.refresh(); }); if (this.map && fr) this.map.flyTo({ center: [fr.lng, fr.lat], zoom: 12, duration: 700 }); }
  clearPoint() { this.cat = null; this._ptName = null; this.setState({ hasPoint: false, areaMuni: 0, areaZone: -1, frazId: -1, mode: 'city' }, () => this.refresh()); }

  setPanel(open) { this.setState({ panelOpen: open }, () => { this.applyPanel(); setTimeout(() => this.map && this.map.resize(), 80); }); }
  applyPanel() { const rc = this.rightCol, dr = this.drawer; if (!rc || !dr) return; const open = this.state.panelOpen; rc.style.width = open ? '404px' : '0px'; dr.style.display = open ? 'flex' : 'none'; }

  exportPNG() {
    if (!this.map) return;
    this.map.once('render', () => {
      try {
        const src = this.map.getCanvas(), w = src.width, h = src.height, scale = w / this.mapEl.clientWidth;
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h + Math.round(40 * scale); const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(src, 0, 0);
        const bh = Math.round(40 * scale); ctx.fillStyle = '#003366'; ctx.fillRect(0, h, w, bh);
        ctx.fillStyle = '#fff'; ctx.font = `${Math.round(15 * scale)}px 'Titillium Web', sans-serif`; ctx.textBaseline = 'middle';
        let cap; if (this.state.mode === 'catchment' && this.cat) { const dl = (this.state.catchCo2 ? 'CO₂ ' : '') + { in: 'in entrata', out: 'in uscita', both: 'entrata + uscita' }[this.state.catchDir]; cap = `Atlante mobilità Roma — bacino ${this.cat.label} · ${dl}`; } else { const tf = this.state.timeEnabled ? ` · ${this.state.hourStart}:00–${this.state.hourEnd}:59` : ''; cap = `Atlante mobilità Roma — ${this.METRIC_LABEL[this.state.metric]}${tf}`; }
        ctx.fillText(cap, Math.round(16 * scale), h + bh / 2);
        cv.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `atlante-roma-${this.state.mode}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
      } catch (e) { alert('Esportazione non riuscita: ' + e.message); }
    });
    this.map.triggerRepaint();
  }

  // ---------- style helpers ----------
  segStyle(a) { return { flex: '1', height: '32px', border: 'none', borderRadius: '4px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', background: a ? '#003366' : '#f5f5f5', color: a ? '#fff' : '#5c6f82' }; }
  rowStyle() { return { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '34px', padding: '0 11px', border: '1px solid #ebeced', borderRadius: '4px', background: '#fff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', color: '#17324d', cursor: 'pointer' }; }
  pill(on) { return { fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '40px', background: on ? '#003366' : '#ebeced', color: on ? '#fff' : '#768594' }; }
  co2Pill(on) { return { height: '24px', padding: '0 11px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: '700', background: on ? '#cc7a00' : '#ebeced', color: on ? '#fff' : '#768594' }; }
  tabStyle(a) { return { flex: '1', height: '32px', border: 'none', borderRadius: '4px', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: a ? '#003366' : '#f5f5f5', color: a ? '#fff' : '#5c6f82' }; }
  swatchStyle(hex, sel) { return { width: '26px', height: '26px', borderRadius: '4px', background: hex, cursor: 'pointer', padding: '0', border: sel ? '2px solid #003366' : '1px solid #c5c7c9', boxShadow: sel ? '0 0 0 2px #fff inset' : 'none' }; }
  autoChip(sel) { return { height: '28px', padding: '0 12px', borderRadius: '4px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', border: sel ? 'none' : '1px solid #c5c7c9', background: sel ? '#003366' : '#fff', color: sel ? '#fff' : '#5c6f82' }; }

  viewModel() {
    const s = this.state, P = this.data && this.data.panels, fmt = (n) => Math.round(n).toLocaleString('it-IT');
    const tf = this.timeFactor(), pad = (h) => String(h).padStart(2, '0');
    const kg = (g) => Math.round(g / 1000).toLocaleString('it-IT'), tonn = (g) => (g / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 });
    let legendTitle, legendMax, legendMin = '0', legendUnit;
    if (s.mode === 'catchment' && this.cat) {
      const dirTxt = s.catchDir === 'in' ? 'origine' : s.catchDir === 'out' ? 'destinazione' : 'entrata ↔ uscita';
      if (s.catchDir === 'both' && !s.catchCo2) { legendTitle = 'Bacino · entrata ↔ uscita'; legendMin = 'entrata'; legendMax = 'uscita'; legendUnit = ''; }
      else { legendTitle = (s.catchCo2 ? 'CO₂ bacino · ' : 'Bacino · ') + dirTxt; legendMax = this.connInfo ? (s.catchCo2 ? kg(this.connInfo.vmax) : fmt(this.connInfo.vmax)) : '—'; legendUnit = s.catchCo2 ? 'kg/g' : 'viaggi/g'; }
    } else { legendTitle = this.METRIC_LABEL[s.metric] + (s.timeEnabled ? ` · ${pad(s.hourStart)}–${pad(s.hourEnd)}` : ''); legendMax = this.vmax ? fmt((this.vmax[s.metric] || 0) * tf) : '—'; legendUnit = s.metric === 'co2' ? 't/g' : 'viaggi/g'; }
    const zoneAll = this.data ? this.data.zone : [];
    const zoneFiltered = s.areaMuni ? zoneAll.filter((z) => z.muni === s.areaMuni) : zoneAll;
    const v = {
      legendTitle, legendMax, legendMin, legendUnit,
      municipiOptions: P ? P.municipi.slice().sort((a, b) => a.n - b.n).map((m) => ({ n: m.n, label: m.full.replace('Municipio Roma ', 'Municipio ') })) : [],
      heatModeName: s.heatColors[s.metric] ? 'Personalizzato' : 'Automatico',
      heatColorValue: s.heatColors[s.metric] || (s.metric === 'out' ? '#003366' : s.metric === 'inc' ? '#089994' : '#cc7a00'),
      metricLabelShort: this.metricShort[s.metric],
      hourStartLabel: pad(s.hourStart) + ':00', hourEndLabel: pad(s.hourEnd) + ':59',
      hourRangeLabel: s.timeEnabled ? `${pad(s.hourStart)}:00 – ${pad(s.hourEnd)}:59` : 'Intera giornata',
      hourShare: s.timeEnabled ? `≈ ${(tf * 100).toFixed(0)}% dei viaggi` : '100% dei viaggi',
      zoneOptions: zoneFiltered.map((z) => ({ id: z.id, label: z.name + ' · ' + z.tipo + (z.muni ? ' (Mun. ' + (this.muniName[z.muni] || '').replace('Municipio Roma ', '') + ')' : '') })),
      zoneCount: zoneFiltered.length,
      frazOptions: this.data ? this.data.frazioni.map((f, i) => ({ id: i, name: f.name })) : [], frazCount: this.data ? this.data.frazioni.length : 0,
      radiusLabel: s.radiusKm.toFixed(1).replace('.', ',') + ' km',
      noSelHint: s.catchMode === 'area' ? (s.areaLevel ? 'Completa la selezione qui sopra.' : 'Scegli un ambito dal menu qui sopra.') : 'Clicca sulla mappa o scegli un polo qui sopra.',
      inLabel: s.catchCo2 ? 'CO₂ ENTRATA · t/g' : 'IN ENTRATA · viaggi/g', outLabel: s.catchCo2 ? 'CO₂ USCITA · t/g' : 'IN USCITA · viaggi/g',
      kpiTrips: P ? (P.totals.trips / 1e6).toFixed(2).replace('.', ',') + ' M' : '—', kpiCo2: P ? fmt(P.totals.co2_baseline) : '—', kpiCells: P ? fmt(P.totals.cells) : '—',
      co2Bars: [], modalSegs: [], modalLegend: [], modalAuto: 0, scenari: [], smartPts: '', smartArea: '', smartDots: [], smartGrid: [],
      topOrigins: [], topDests: [], totIn: '0', totOut: '0', intraNote: '', selName: '', selSub: '', selKind: '',
    };
    if (this.cat) {
      const c = this.data.cells, co2 = s.catchCo2;
      v.selName = this.cat.label; v.selSub = this.cat.sub; v.selKind = this.cat.kind;
      v.totIn = co2 ? tonn(this.cat.totCo2In) : fmt(this.cat.totIn);
      v.totOut = co2 ? tonn(this.cat.totCo2Out) : fmt(this.cat.totOut);
      v.intraNote = co2 ? `Stima CO₂ tank-to-wheel · ${fmt(this.cat.intra)} spostamenti interni.` : `Più ${fmt(this.cat.intra)} spostamenti interni al bacino.`;
      const agg = (map) => { const a = {}; for (const id in map) { const m = c.muni[id] || 0; a[m] = (a[m] || 0) + map[id]; } return Object.keys(a).map((k) => ({ name: +k ? (this.muniName[k] || 'Municipio ' + k).replace('Municipio Roma ', 'Mun. ') : 'Area periurbana', flux: a[k] })).sort((x, y) => y.flux - x.flux); };
      const inSrc = co2 ? this.cat.co2In : this.cat.inMap, outSrc = co2 ? this.cat.co2Out : this.cat.outMap;
      const oi = agg(inSrc), od = agg(outSrc), mi = oi.length ? oi[0].flux : 1, mo = od.length ? od[0].flux : 1;
      const lab = (x) => co2 ? kg(x) : fmt(x);
      v.topOrigins = oi.slice(0, 8).map((r) => ({ name: r.name, flux: lab(r.flux), pct: Math.max(3, r.flux / mi * 100) }));
      v.topDests = od.slice(0, 8).map((r) => ({ name: r.name, flux: lab(r.flux), pct: Math.max(3, r.flux / mo * 100) }));
    }
    if (P) {
      const muni = P.municipi, maxC = Math.max.apply(null, muni.map((m) => m.co2));
      v.co2Bars = muni.map((m) => ({ name: 'Mun. ' + m.name, pct: Math.max(2, m.co2 / maxC * 100), co2Label: fmt(m.co2), color: `rgb(${this.ramp(0.28 + 0.68 * m.co2 / maxC, this.RAMPS.ambra).join(',')})` }));
      const cs = P.cityShare, C = 2 * Math.PI * 50; let cum = 0;
      const order = [['Auto privata', cs.auto, '#003366'], ['Trasporto pubblico', cs.tpl, '#089994'], ['Piedi · bici', cs.active, '#00b377']];
      v.modalSegs = order.map(([l, val, col]) => { const seg = { color: col, dash: `${(val * C).toFixed(1)} ${C.toFixed(1)}`, off: (-cum * C).toFixed(1) }; cum += val; return seg; });
      v.modalLegend = order.map(([l, val, col]) => ({ label: l, color: col, pct: Math.round(val * 100) })); v.modalAuto = Math.round(cs.auto * 100);
      const sc = P.scenari, sbase = sc[0].co2;
      v.scenari = sc.map((x, i) => ({ name: x.scenario.replace(/^Scenario [A-E] /, '').replace('(attuale)', '').trim(), w: x.co2 / sbase * 100, co2: fmt(x.co2), rid: i === 0 ? 'baseline' : '−' + x.rid_pct.toFixed(0) + '%', ridColor: i === 0 ? '#929da9' : '#008055', color: i === 0 ? '#768594' : `rgb(${this.ramp(0.3 + 0.6 * Math.min(1, x.rid_pct / 28), this.RAMPS.teal).join(',')})` }));
      const sm = P.smart, co2s = sm.map((d) => d.co2), ymin = Math.min.apply(null, co2s), ymax = Math.max.apply(null, co2s);
      const xs = (val) => 34 + (val / 50) * 256, ys = (val) => 16 + (1 - (val - ymin) / (ymax - ymin)) * 104;
      v.smartPts = sm.map((d) => `${xs(d.pct).toFixed(1)},${ys(d.co2).toFixed(1)}`).join(' ');
      v.smartArea = `34,120 ` + sm.map((d) => `${xs(d.pct).toFixed(1)},${ys(d.co2).toFixed(1)}`).join(' ') + ` ${xs(50).toFixed(1)},120`;
      v.smartDots = sm.filter((d, i) => i % 2 === 0 || d.pct === 50).map((d) => ({ cx: xs(d.pct).toFixed(1), cy: ys(d.co2).toFixed(1), lab: d.pct + '%' }));
      v.smartGrid = [ymax, (ymax + ymin) / 2, ymin].map((val) => ({ y: ys(val) + 3, label: fmt(val) }));
    }
    return v;
  }

  render() {
    const s = this.state, v = this.viewModel();
    const pad = (h) => String(h).padStart(2, '0');
    const showClickHint = !s.loading && s.mode === 'city' && s.tab !== 'stats';
    return (
      <div style={css('display:flex;flex-direction:column;height:100vh;width:100vw;overflow:hidden;background:#f5f5f5;')}>
        <header style={css('flex:none;height:56px;background:#003366;display:flex;align-items:center;padding:0 20px;gap:16px;color:#fff;z-index:30;box-shadow:0 4px 4px rgba(0,0,0,.05);')}>
          <div style={css('width:30px;height:30px;border:2px solid rgba(255,255,255,.85);border-radius:4px;display:flex;align-items:center;justify-content:center;flex:none;')}>
            <div style={{ width: '13px', height: '15px', background: 'rgba(255,255,255,.9)', clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)' }} />
          </div>
          <div style={css('display:flex;flex-direction:column;line-height:1.15;')}>
            <span style={css('font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.65);font-weight:600;')}>Roma Capitale · Mobilità urbana</span>
            <span style={css('font-size:18px;font-weight:700;letter-spacing:-.2px;')}>Atlante dei flussi · griglia H3</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => this.exportPNG()} style={css('display:flex;align-items:center;gap:7px;height:34px;padding:0 15px;background:#fff;color:#003366;border:none;border-radius:4px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 11l5 4 5-4M4 19h16" /></svg>
            Esporta PNG
          </button>
        </header>

        <div style={css('flex:1;display:flex;flex-direction:row;min-height:0;position:relative;')}>
          <div style={css('flex:1;position:relative;min-width:0;background:#e8eaed;')}>
            <div ref={(el) => (this.mapEl = el)} style={css('position:absolute;inset:0;')} />

            {!s.panelOpen && (
              <button onClick={() => this.setPanel(true)} style={css('position:absolute;top:14px;left:14px;z-index:12;display:flex;align-items:center;gap:7px;height:36px;padding:0 14px;background:#003366;color:#fff;border:none;border-radius:4px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 16px rgba(0,0,0,.10);')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></svg>
                Pannello dati
              </button>
            )}

            {showClickHint && (
              <div style={css('position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:8;background:#003366;color:#fff;border-radius:40px;padding:7px 16px;font-size:12.5px;font-weight:600;box-shadow:0 8px 16px rgba(0,0,0,.15);display:flex;align-items:center;gap:8px;')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="4" /></svg>
                Clicca un punto qualsiasi per analizzare il suo bacino di mobilità
              </div>
            )}

            <div style={css('position:absolute;bottom:14px;left:14px;z-index:6;background:rgba(255,255,255,.94);border-radius:4px;padding:9px 12px;box-shadow:0 4px 4px rgba(0,0,0,.06);min-width:200px;')}>
              <div style={css('font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5c6f82;margin-bottom:6px;')}>{v.legendTitle}</div>
              <div ref={(el) => (this.legendBar = el)} style={css('height:9px;border-radius:2px;background:#ebeced;')} />
              <div style={css('display:flex;justify-content:space-between;margin-top:3px;')}>
                <span style={css('font-size:10px;color:#929da9;')}>{v.legendMin}</span>
                <span style={css('font-size:10px;color:#5c6f82;font-weight:600;')}>{v.legendMax} <span style={css('color:#929da9;font-weight:400;')}>{v.legendUnit}</span></span>
              </div>
            </div>

            {s.loading && (
              <div style={css('position:absolute;inset:0;background:rgba(245,245,245,.96);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;')}>
                <div style={{ width: '38px', height: '38px', border: '3px solid #d9dadb', borderTopColor: '#003366', borderRadius: '50%', animation: 'amspin .9s linear infinite' }} />
                <div style={css('font-size:14px;color:#5c6f82;font-weight:600;')}>{s.loadMsg}</div>
              </div>
            )}
            {s.errorMsg && (
              <div style={css('position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:21;background:#fbeff1;border:1px solid #cc334d;border-radius:4px;padding:16px 20px;max-width:340px;color:#7a1f2e;font-size:14px;')}>{s.errorMsg}</div>
            )}
          </div>

          <div ref={(el) => (this.rightCol = el)} style={css('flex:none;width:404px;overflow:hidden;background:#fafafa;')}>
            <div ref={(el) => (this.drawer = el)} style={css('height:100%;display:flex;flex-direction:column;border-left:1px solid #ebeced;background:#fafafa;')}>
              <div style={css('flex:none;display:flex;align-items:center;justify-content:space-between;padding:11px 16px;background:#fff;border-bottom:1px solid #ebeced;')}>
                <span style={css('font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#003366;')}>Dati e grafici</span>
                <button onClick={() => this.setPanel(false)} title="Chiudi pannello" style={css('display:flex;align-items:center;gap:6px;height:28px;padding:0 11px;border:1px solid #ebeced;background:#fff;border-radius:4px;cursor:pointer;color:#5c6f82;font-family:inherit;font-size:12.5px;font-weight:600;')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m13 5 7 7-7 7M20 12H4" /></svg>
                  Chiudi
                </button>
              </div>

              <div style={css('flex:none;display:flex;gap:3px;padding:9px 12px;background:#fff;border-bottom:1px solid #ebeced;')}>
                <button onClick={() => this.setTab('settings')} style={this.tabStyle(s.tab === 'settings')}>Impostazioni</button>
                <button onClick={() => this.setTab('catchment')} style={this.tabStyle(s.tab === 'catchment')}>Bacino</button>
                <button onClick={() => this.setTab('stats')} style={this.tabStyle(s.tab === 'stats')}>Statistiche</button>
              </div>

              <div style={css('flex:1;overflow-y:auto;')}>
                {s.tab === 'settings' && this.renderSettings(s, v)}
                {s.tab === 'catchment' && this.renderCatchment(s, v, pad)}
                {s.tab === 'stats' && this.renderStats(v)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderSettings(s, v) {
    return (
      <div style={css('padding:16px;display:flex;flex-direction:column;gap:18px;')}>
        <div>
          <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:8px;')}>Metrica heatmap città</div>
          <div style={css('display:flex;gap:5px;')}>
            <button onClick={() => this.setMetric('out')} style={this.segStyle(s.metric === 'out')}>Uscenti</button>
            <button onClick={() => this.setMetric('inc')} style={this.segStyle(s.metric === 'inc')}>Entranti</button>
            <button onClick={() => this.setMetric('co2')} style={this.segStyle(s.metric === 'co2')}>CO₂</button>
          </div>
        </div>
        <div>
          <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;')}>
            <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Colore — {v.metricLabelShort}</span>
            <span style={css('font-size:12.5px;font-weight:700;color:#003366;')}>{v.heatModeName}</span>
          </div>
          <div style={css('font-size:10px;color:#a3adb7;margin-bottom:8px;')}>Ogni metrica salva il proprio colore.</div>
          <div style={css('display:flex;gap:7px;align-items:center;flex-wrap:wrap;')}>
            <button onClick={() => this.setAuto()} style={this.autoChip(!s.heatColors[s.metric])}>Auto</button>
            {this.SWATCHES.map((hex) => (
              <button key={hex} onClick={() => this.setHeatColor(hex)} title={hex} style={this.swatchStyle(hex, s.heatColors[s.metric] === hex)} />
            ))}
            <label style={css('display:flex;align-items:center;gap:5px;margin-left:2px;cursor:pointer;')}>
              <input type="color" value={v.heatColorValue} onInput={(e) => this.setHeatColor(e.target.value)} onChange={(e) => this.setHeatColor(e.target.value)} />
              <span style={css('font-size:11px;color:#768594;font-weight:600;')}>scegli</span>
            </label>
          </div>
          <div ref={(el) => (this.colorPreview = el)} style={css('height:10px;border-radius:2px;margin-top:9px;background:#ebeced;')} />
        </div>
        <div>
          <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:8px;')}>Livelli</div>
          <div style={css('display:flex;flex-direction:column;gap:8px;')}>
            <button onClick={() => this.toggle('heatmap')} style={this.rowStyle()}><span>Heatmap dati</span><span style={this.pill(s.heatmap)}>{s.heatmap ? 'ON' : 'OFF'}</span></button>
            <button onClick={() => this.toggle('grid')} style={this.rowStyle()}><span>Griglia H3</span><span style={this.pill(s.grid)}>{s.grid ? 'ON' : 'OFF'}</span></button>
            <button onClick={() => this.toggle('bounds')} style={this.rowStyle()}><span>Confini municipi</span><span style={this.pill(s.bounds)}>{s.bounds ? 'ON' : 'OFF'}</span></button>
          </div>
        </div>
        <div>
          <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Mappa base</div>
          <select onChange={(e) => this.setBasemapVal(e.target.value)} value={s.basemap} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
            <option value="positron">Chiara (Positron)</option>
            <option value="voyager">Stradale (Voyager)</option>
            <option value="dark">Scura (Dark Matter)</option>
          </select>
        </div>
        <div>
          <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Filtra municipio</div>
          <select onChange={(e) => this.setFilterVal(e.target.value)} value={String(s.filterMuni)} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
            <option value="0">Tutta l'area metropolitana</option>
            {v.municipiOptions.map((o) => <option key={o.n} value={o.n}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;')}>
            <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Fascia oraria</span>
            <button onClick={() => this.toggleTime()} style={this.pill(s.timeEnabled)}>{s.timeEnabled ? 'Attivo' : 'Off'}</button>
          </div>
          <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:9px;')}>
            <span style={css('width:34px;flex:none;font-size:11px;font-weight:600;color:#768594;')}>Dalle</span>
            <input type="range" min="0" max="23" step="1" value={s.hourStart} onChange={(e) => this.setHourStart(e.target.value)} disabled={!s.timeEnabled} />
            <span style={css('width:42px;flex:none;text-align:right;font-size:13px;font-weight:700;color:#17324d;font-variant-numeric:tabular-nums;')}>{v.hourStartLabel}</span>
          </div>
          <div style={css('display:flex;align-items:center;gap:10px;')}>
            <span style={css('width:34px;flex:none;font-size:11px;font-weight:600;color:#768594;')}>Alle</span>
            <input type="range" min="0" max="23" step="1" value={s.hourEnd} onChange={(e) => this.setHourEnd(e.target.value)} disabled={!s.timeEnabled} />
            <span style={css('width:42px;flex:none;text-align:right;font-size:13px;font-weight:700;color:#17324d;font-variant-numeric:tabular-nums;')}>{v.hourEndLabel}</span>
          </div>
          <div style={css('display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;')}>
            <span style={css('font-size:13px;font-weight:600;color:#003366;')}>{v.hourRangeLabel}</span>
            <span style={css('font-size:11px;color:#929da9;')}>{v.hourShare}</span>
          </div>
        </div>
      </div>
    );
  }

  renderCatchment(s, v) {
    return (
      <div style={css('padding:16px;display:flex;flex-direction:column;gap:16px;')}>
        <div style={css('font-size:12.5px;color:#5c6f82;line-height:1.45;')}>Da dove arrivano e dove vanno gli spostamenti di un'area, in modo <b style={{ color: '#17324d' }}>gerarchico</b>.</div>
        <div>
          <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Tipo di bacino</div>
          <div style={css('display:flex;gap:5px;')}>
            <button onClick={() => this.setCatchMode('radius')} style={this.segStyle(s.catchMode === 'radius')}>Raggio attorno a un punto</button>
            <button onClick={() => this.setCatchMode('area')} style={this.segStyle(s.catchMode === 'area')}>Area amministrativa</button>
          </div>
        </div>

        {s.catchMode === 'radius' && (
          <div style={css('display:flex;flex-direction:column;gap:16px;')}>
            <div>
              <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Poli di interesse</div>
              <div style={css('display:flex;flex-wrap:wrap;gap:6px;')}>
                {this.PRESETS.map((p) => (
                  <button key={p.name} onClick={() => this.setPreset(p)} style={css('height:30px;padding:0 12px;border:1px solid #c5c7c9;background:#fff;border-radius:40px;font-family:inherit;font-size:12.5px;font-weight:600;color:#003366;cursor:pointer;')}>{p.name}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;')}>
                <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Raggio del bacino</span>
                <span style={css('font-size:13.5px;font-weight:700;color:#003366;')}>{v.radiusLabel}</span>
              </div>
              <input type="range" min="0.2" max="10" step="0.1" value={s.radiusKm} onChange={(e) => this.setRadius(e.target.value)} />
              <div style={css('display:flex;justify-content:space-between;margin-top:2px;')}><span style={css('font-size:10px;color:#a3adb7;')}>200 m</span><span style={css('font-size:10px;color:#a3adb7;')}>10 km</span></div>
            </div>
          </div>
        )}

        {s.catchMode === 'area' && (
          <div style={css('display:flex;flex-direction:column;gap:13px;')}>
            <div>
              <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Ambito (livello)</div>
              <select onChange={(e) => this.setAreaLevel(e.target.value)} value={s.areaLevel} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
                <option value="">— scegli un livello —</option>
                <option value="capitale">Roma Capitale — intera area metropolitana</option>
                <option value="comune">Comune di Roma — tutta la città</option>
                <option value="municipio">Municipio di Roma</option>
                <option value="zona">Zona / Rione / Quartiere</option>
                <option value="frazione">Frazione dell'area metropolitana</option>
              </select>
            </div>
            {(s.areaLevel === 'municipio' || s.areaLevel === 'zona') && (
              <div>
                <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>{s.areaLevel === 'zona' ? 'Filtra per municipio (opzionale)' : 'Seleziona municipio'}</div>
                <select onChange={(e) => this.setAreaMuni(e.target.value)} value={String(s.areaMuni)} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
                  <option value="0">{s.areaLevel === 'zona' ? 'Tutti i municipi' : '— scegli un municipio —'}</option>
                  {v.municipiOptions.map((o) => <option key={o.n} value={o.n}>{o.label}</option>)}
                </select>
              </div>
            )}
            {s.areaLevel === 'zona' && (
              <div>
                <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Zona / Rione / Quartiere</div>
                <select onChange={(e) => this.setAreaZone(e.target.value)} value={String(s.areaZone)} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
                  <option value="-1">— scegli una zona ({v.zoneCount}) —</option>
                  {v.zoneOptions.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
              </div>
            )}
            {s.areaLevel === 'frazione' && (
              <div>
                <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Frazione · raggio {v.radiusLabel}</div>
                <select onChange={(e) => this.setFraz(e.target.value)} value={String(s.frazId)} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
                  <option value="-1">— scegli una frazione ({v.frazCount}) —</option>
                  {v.frazOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <input type="range" min="0.2" max="10" step="0.1" value={s.radiusKm} onChange={(e) => this.setRadius(e.target.value)} style={{ marginTop: '9px' }} />
              </div>
            )}
          </div>
        )}

        <div>
          <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;')}>
            <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Direzione visualizzata</span>
            <button onClick={() => this.toggleCo2()} style={this.co2Pill(s.catchCo2)}>CO₂ {s.catchCo2 ? 'ON' : 'OFF'}</button>
          </div>
          <div style={css('display:flex;gap:5px;')}>
            <button onClick={() => this.setDir('in')} style={this.segStyle(s.catchDir === 'in')}>Entrata</button>
            <button onClick={() => this.setDir('out')} style={this.segStyle(s.catchDir === 'out')}>Uscita</button>
            <button onClick={() => this.setDir('both')} style={this.segStyle(s.catchDir === 'both')}>Entrambi</button>
          </div>
          {s.catchDir === 'both' && !s.catchCo2 && (
            <>
              <div style={{ ...css('height:9px;border-radius:2px;margin-top:9px;'), background: this.bothGradStr() }} />
              <div style={css('display:flex;justify-content:space-between;margin-top:3px;font-size:10px;color:#768594;font-weight:600;')}><span>prevale entrata</span><span>prevale uscita</span></div>
            </>
          )}
          {s.catchCo2 && (
            <div style={css('font-size:10px;color:#a3adb7;margin-top:7px;line-height:1.35;')}>CO₂ stimata: spostamenti × distanza dal centro del bacino × 117 g/km.</div>
          )}
        </div>

        {this.cat ? (
          <div style={css('border-top:1px solid #ebeced;padding-top:14px;display:flex;flex-direction:column;gap:14px;')}>
            <div style={css('display:flex;align-items:center;justify-content:space-between;')}>
              <div>
                <div style={css('font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#089994;')}>{v.selKind}</div>
                <div style={css('font-size:14px;font-weight:700;color:#003366;')}>{v.selName}</div>
                <div style={css("font-size:11px;color:#929da9;font-family:'Roboto Mono',monospace;")}>{v.selSub}</div>
              </div>
              <button onClick={() => this.clearPoint()} style={css('height:28px;padding:0 11px;border:1px solid #ebeced;background:#fff;border-radius:4px;cursor:pointer;color:#5c6f82;font-family:inherit;font-size:12.5px;font-weight:600;')}>Azzera</button>
            </div>
            <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px;')}>
              <div style={css('background:#f6e4c8;border-radius:4px;padding:10px 12px;')}>
                <div style={css('font-size:10px;color:#995c00;font-weight:600;')}>{v.inLabel}</div>
                <div style={css("font-family:'Lora',serif;font-size:22px;font-weight:600;color:#995c00;font-variant-numeric:tabular-nums;")}>{v.totIn}</div>
              </div>
              <div style={css('background:#ccfffd;border-radius:4px;padding:10px 12px;')}>
                <div style={css('font-size:10px;color:#077f7b;font-weight:600;')}>{v.outLabel}</div>
                <div style={css("font-family:'Lora',serif;font-size:22px;font-weight:600;color:#05615e;font-variant-numeric:tabular-nums;")}>{v.totOut}</div>
              </div>
            </div>
            <div style={css('font-size:11.5px;color:#929da9;margin-top:-6px;')}>{v.intraNote}</div>
            {this.renderRanks('Da dove arrivano', 'origine', v.topOrigins, '#cc7a00')}
            {this.renderRanks('Dove vanno', 'destinazione', v.topDests, '#089994')}
          </div>
        ) : (
          <div style={css('border-top:1px solid #ebeced;padding-top:16px;display:flex;gap:10px;align-items:flex-start;color:#5c6f82;')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5c6f82" strokeWidth="2" style={{ flex: 'none', marginTop: '1px' }}><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="4" /></svg>
            <span style={css('font-size:12.5px;line-height:1.4;')}>{v.noSelHint}</span>
          </div>
        )}
      </div>
    );
  }

  renderRanks(title, sub, rows, color) {
    return (
      <div>
        <div style={css('font-size:13px;font-weight:700;color:#003366;margin-bottom:9px;')}>{title} <span style={css('font-weight:400;color:#929da9;')}>· {sub}</span></div>
        <div style={css('display:flex;flex-direction:column;gap:7px;')}>
          {rows.map((r, i) => (
            <div key={i} style={css('display:flex;align-items:center;gap:9px;')}>
              <span style={css('width:118px;flex:none;font-size:12px;font-weight:600;color:#17324d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;')}>{r.name}</span>
              <div style={css('flex:1;height:12px;background:#ebeced;border-radius:3px;overflow:hidden;')}><div style={{ height: '100%', borderRadius: '3px', background: color, width: r.pct + '%' }} /></div>
              <span style={css('width:52px;flex:none;text-align:right;font-size:12px;font-weight:600;color:#5c6f82;font-variant-numeric:tabular-nums;')}>{r.flux}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderStats(v) {
    const kpi = (label, val, color) => (
      <div style={css('background:#fff;padding:13px 14px;')}>
        <div style={css('font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#768594;')}>{label}</div>
        <div style={{ fontFamily: "'Lora',serif", fontSize: '24px', fontWeight: 600, color, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
      </div>
    );
    return (
      <div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:#ebeced;border-bottom:1px solid #ebeced;')}>
          {kpi('Spostamenti/g', v.kpiTrips, '#003366')}
          {kpi('CO₂ t/g', v.kpiCo2, '#cc7a00')}
          {kpi('Celle H3', v.kpiCells, '#17324d')}
        </div>
        <div style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
          <div style={css('font-size:15px;font-weight:700;color:#003366;')}>CO₂ per municipio</div>
          <div style={css('font-size:11.5px;color:#929da9;margin-bottom:11px;')}>Tonnellate/giorno · stima dai flussi pendolari</div>
          <div style={css('display:flex;flex-direction:column;gap:7px;')}>
            {v.co2Bars.map((b, i) => (
              <div key={i} style={css('display:flex;align-items:center;gap:9px;')}>
                <span style={css('width:58px;flex:none;font-size:12px;font-weight:600;color:#17324d;')}>{b.name}</span>
                <div style={css('flex:1;height:13px;background:#ebeced;border-radius:3px;overflow:hidden;')}><div style={{ height: '100%', borderRadius: '3px', background: b.color, width: b.pct + '%' }} /></div>
                <span style={css("width:44px;flex:none;text-align:right;font-family:'Lora',serif;font-size:13px;font-weight:600;color:#17324d;font-variant-numeric:tabular-nums;")}>{b.co2Label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
          <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Ripartizione modale</div>
          <div style={css('font-size:11.5px;color:#929da9;margin-bottom:9px;')}>Media città · pesata per popolazione</div>
          <div style={css('display:flex;align-items:center;gap:18px;')}>
            <svg width="116" height="116" viewBox="0 0 140 140" style={{ flex: 'none' }}>
              <circle cx="70" cy="70" r="50" fill="none" stroke="#ebeced" strokeWidth="18" />
              <g transform="rotate(-90 70 70)">
                {v.modalSegs.map((sg, i) => <circle key={i} cx="70" cy="70" r="50" fill="none" stroke={sg.color} strokeWidth="18" strokeDasharray={sg.dash} strokeDashoffset={sg.off} />)}
              </g>
              <text x="70" y="66" textAnchor="middle" fontFamily="Lora" fontSize="26" fontWeight="600" fill="#003366">{v.modalAuto}%</text>
              <text x="70" y="82" textAnchor="middle" fontFamily="Titillium Web" fontSize="10" fontWeight="600" fill="#768594">AUTO</text>
            </svg>
            <div style={css('flex:1;display:flex;flex-direction:column;gap:9px;')}>
              {v.modalLegend.map((m, i) => (
                <div key={i} style={css('display:flex;align-items:center;gap:8px;')}>
                  <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: m.color, flex: 'none' }} />
                  <div style={css('flex:1;font-size:13px;color:#17324d;')}>{m.label}</div>
                  <div style={css('font-size:14px;font-weight:700;color:#003366;font-variant-numeric:tabular-nums;')}>{m.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
          <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Scenari di intervento</div>
          <div style={css('font-size:11.5px;color:#929da9;margin-bottom:9px;')}>CO₂ t/g e riduzione vs baseline</div>
          <div style={css('display:flex;flex-direction:column;gap:9px;')}>
            {v.scenari.map((sc, i) => (
              <div key={i}>
                <div style={css('display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;')}>
                  <span style={css('font-size:12.5px;color:#17324d;font-weight:600;')}>{sc.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: sc.ridColor, fontVariantNumeric: 'tabular-nums' }}>{sc.rid}</span>
                </div>
                <div style={css('height:14px;background:#ebeced;border-radius:3px;overflow:hidden;position:relative;')}>
                  <div style={{ height: '100%', borderRadius: '3px', background: sc.color, width: sc.w + '%' }} />
                  <span style={css('position:absolute;right:6px;top:0;line-height:14px;font-size:10.5px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums;')}>{sc.co2}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={css('padding:15px 16px 24px;')}>
          <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Impatto smart working</div>
          <div style={css('font-size:11.5px;color:#929da9;margin-bottom:9px;')}>CO₂ t/g al variare dell'adozione</div>
          <svg width="100%" viewBox="0 0 300 150" style={{ display: 'block' }}>
            <line x1="34" y1="120" x2="290" y2="120" stroke="#d9dadb" strokeWidth="1" />
            <line x1="34" y1="14" x2="34" y2="120" stroke="#d9dadb" strokeWidth="1" />
            {v.smartGrid.map((g, i) => <text key={i} x="30" y={g.y} textAnchor="end" fontFamily="Titillium Web" fontSize="9" fill="#a3adb7">{g.label}</text>)}
            <polygon points={v.smartArea} fill="#089994" opacity="0.08" />
            <polyline points={v.smartPts} fill="none" stroke="#089994" strokeWidth="2.5" strokeLinejoin="round" />
            {v.smartDots.map((d, i) => (
              <g key={i}>
                <circle cx={d.cx} cy={d.cy} r="3" fill="#fff" stroke="#089994" strokeWidth="2" />
                <text x={d.cx} y="135" textAnchor="middle" fontFamily="Titillium Web" fontSize="9" fill="#768594">{d.lab}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  }
}
