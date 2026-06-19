import React from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer, ArcLayer, ScatterplotLayer, PolygonLayer, TextLayer } from '@deck.gl/layers';
import { css, B } from './utils/css.js';
import PUNTI_NEVRALGICI, { nevralgicoColor } from './data/puntiNevralgici.js';
import AppHeader from './components/AppHeader.jsx';
import MapView from './components/MapView.jsx';
import SidePanel from './components/SidePanel.jsx';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true, loadMsg: 'Caricamento dati di mobilità…', errorMsg: '',
      mode: 'city', metric: 'out',
      heatmap: true, grid: true, showMuniBounds: true, showMuniLabels: true, showQuartieriBounds: false, showQuartieriLabels: false, showNevralgic: false, showFrazioni: false,
      showComuniBounds: false, showComuniLabels: false,
      comuniBorderColor: '#7c3aed', comuniBorderWidth: 1.5,
      comuniLabelColor: '#7c3aed', comuniLabelSize: 11,
      muniBorderColor: '#003366', muniBorderWidth: 1.8,
      muniLabelColor: '#003366', muniLabelSize: 13,
      quartieriBorderColor: '#3c64a0', quartieriBorderWidth: 0.8,
      quartieriLabelColor: '#003278', quartieriLabelSize: 11,
      frazLabelColor: '#004640', frazLabelSize: 10,
      basemap: 'positron', filterMuni: 0,
      heatColors: { out: null, inc: null, co2: null, internal: null },
      panelOpen: true, tab: 'settings',
      catchMode: 'radius', catchFlags: { in: true, out: true, internal: true }, catchCo2: false, radiusKm: 0.6,
      areaLevel: '', areaMuni: 0, areaZone: -1, frazId: -1,
      hasPoint: false, ptLng: 0, ptLat: 0,
    };
    this.RAMPS = {
      navy: [[219,234,254],[147,196,245],[67,146,224],[0,77,153],[0,40,80]],
      teal: [[204,255,253],[121,236,232],[11,203,197],[7,127,123],[4,70,68]],
      ambra: [[248,232,205],[238,182,110],[224,140,67],[204,80,55],[150,25,38]],
      green: [[232,247,241],[147,217,187],[0,128,85],[0,92,61],[0,56,39]],
    };
    this.METRIC_DEFAULT_STOPS = {
      out: [{ pos: 0, hex: '#dbeafe' }, { pos: 1, hex: '#002850' }],
      inc: [{ pos: 0, hex: '#ccfffd' }, { pos: 1, hex: '#044644' }],
      co2: [{ pos: 0, hex: '#f8e8cd' }, { pos: 1, hex: '#961926' }],
      internal: [{ pos: 0, hex: '#e8f7f1' }, { pos: 1, hex: '#003827' }],
    };
    this.metricRamp = { out: 'navy', inc: 'teal', co2: 'ambra', internal: 'green' };
    this.metricShort = { out: 'Uscenti', inc: 'Entranti', co2: 'CO₂', internal: 'Interno' };
    this.SWATCHES = ['#81ecec', '#ff7675', '#0984e3', '#00b894', '#fdcb6e'];
    this.EF = 117;

    this.STYLES = {
      positron: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
      voyager: 'https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json',
      dark: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
    };
    this.METRIC_LABEL = { out: 'Spostamenti uscenti', inc: 'Spostamenti entranti', co2: 'Emissioni CO₂', internal: 'Spostamenti interni' };
  }

  // ---------- geo helpers ----------
  hav(a1, o1, a2, o2) { const R = 6371, dLat = (a2 - a1) * Math.PI / 180, dLon = (o2 - o1) * Math.PI / 180, la1 = a1 * Math.PI / 180, la2 = a2 * Math.PI / 180; const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  pip(x, y, r) { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
  pipR(x, y, rings) { for (const r of rings) if (this.pip(x, y, r)) return true; return false; }

  componentDidMount() { this.loadData(); }
  componentDidUpdate() { this.updateLegend(); this.updateColorPreview(); }

  async loadData() {
    try {
      const [cells, metrics, panels, municipi, zone, frazioni, b64, quartieriGeo, comuniGeo] = await Promise.all([
        fetch(B + 'data/build/cells.json').then((r) => r.json()),
        fetch(B + 'data/build/metrics.json').then((r) => r.json()),
        fetch(B + 'data/build/panels.json').then((r) => r.json()),
        fetch(B + 'data/build/municipi.json').then((r) => r.json()),
        fetch(B + 'data/build/zone.json').then((r) => r.json()),
        fetch(B + 'data/build/frazioni.json').then((r) => r.json()),
        fetch(B + 'data/build/od_packed.b64.txt').then((r) => r.text()),
        fetch(B + 'data/build/quartieri.geojson').then((r) => r.json()),
        fetch(B + 'data/build/comuni_provincia_roma.geojson').then((r) => r.json()),
      ]);
      this.data = { cells, metrics, panels, municipi, zone, frazioni };
      this.quartieriGeo = quartieriGeo;
      this.comuniGeo = comuniGeo;
      this.comuniLabelData = (comuniGeo.features || []).map((f) => { const c = f.geometry; let pos; if (c.type === 'Polygon') { const ring = c.coordinates[0]; let sx = 0, sy = 0; ring.forEach(([x, y]) => { sx += x; sy += y; }); pos = [sx / ring.length, sy / ring.length]; } else if (c.type === 'MultiPolygon') { let sx = 0, sy = 0, cnt = 0; c.coordinates[0][0].forEach(([x, y]) => { sx += x; sy += y; cnt++; }); pos = [sx / cnt, sy / cnt]; } else { pos = [0, 0]; } return { position: pos, text: f.properties.name || '' }; }).filter((d) => d.text);
      this.etichetteLabelData = zone.map((z) => ({ position: [z.cx, z.cy], text: z.name }));
      const bin = atob(b64.trim()); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      this.od = new Uint16Array(bytes.buffer); this.odN = this.od.length / 3;
      const hex = []; for (let id = 1; id <= cells.maxId; id++) if (cells.h3[id]) hex.push({ id, h3: cells.h3[id] });
      this.hexData = hex;
      this.vmax = { out: 0, inc: 0, co2: 0, internal: 0 };
      for (const k of ['out', 'inc', 'co2', 'internal']) { const a = metrics[k]; let mx = 0; for (let i = 1; i < a.length; i++) if (a[i] > mx) mx = a[i]; this.vmax[k] = mx; }
      const sl = {}, sa = {}, cn = {}; let gx = 0, gy = 0, gc = 0, rx = 0, ry = 0, rc = 0;
      for (let id = 1; id <= cells.maxId; id++) { if (!cells.h3[id]) continue; gx += cells.lng[id]; gy += cells.lat[id]; gc++; const mn = cells.muni[id]; if (mn) { sl[mn] = (sl[mn] || 0) + cells.lng[id]; sa[mn] = (sa[mn] || 0) + cells.lat[id]; cn[mn] = (cn[mn] || 0) + 1; rx += cells.lng[id]; ry += cells.lat[id]; rc++; } }
      this.muniCentroid = {}; Object.keys(cn).forEach((k) => (this.muniCentroid[k] = [sl[k] / cn[k], sa[k] / cn[k]]));
      this.gridCenter = [gx / gc, gy / gc]; this.romaCentroid = [rx / rc, ry / rc];
      this.zoneById = {}; zone.forEach((z) => (this.zoneById[z.id] = z));
      const zFeats = []; zone.forEach((z) => { z.rings.forEach((r) => zFeats.push({ type: 'Feature', properties: { id: z.id, name: z.name, tipo: z.tipo, muni: z.muni }, geometry: { type: 'Polygon', coordinates: [r] } })); }); this.zoneGeo = { type: 'FeatureCollection', features: zFeats };
      const feats = []; this.muniName = {}; this.muniBbox = {}; this.muniRings = {};
      municipi.forEach((m) => { this.muniName[m.numero] = m.name; this.muniBbox[m.numero] = m.bbox; this.muniRings[m.numero] = m.rings; m.rings.forEach((r) => feats.push({ type: 'Feature', properties: { n: m.numero }, geometry: { type: 'Polygon', coordinates: [r] } })); });
      this.boundaryGeo = { type: 'FeatureCollection', features: feats };
      let _bx0 = Infinity, _by0 = Infinity, _bx1 = -Infinity, _by1 = -Infinity; this.muniLabelData = []; municipi.forEach((m) => { const b = m.bbox; if (b[0] < _bx0) _bx0 = b[0]; if (b[1] < _by0) _by0 = b[1]; if (b[2] > _bx1) _bx1 = b[2]; if (b[3] > _by1) _by1 = b[3]; const pos = this.muniCentroid[m.numero]; if (pos) this.muniLabelData.push({ position: pos, text: m.roman }); }); this.allMuniBbox = [_bx0, _by0, _bx1, _by1];
      this.frazLabelData = frazioni.map((f) => ({ position: [f.lng, f.lat], text: f.name, tipo: f.tipo }));
      this.setState({ loading: false }, () => this.initMap());
    } catch (e) { this.setState({ loading: false, errorMsg: 'Errore nel caricamento dei dati: ' + e.message }); }
  }

  initMap() {
    this.map = new maplibregl.Map({ container: this.mapEl, style: this.STYLES[this.state.basemap], center: [12.52, 41.9], zoom: 9.3, minZoom: 8, maxZoom: 15, attributionControl: { compact: true }, preserveDrawingBuffer: true, dragRotate: false, pitchWithRotate: false });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.overlay = new MapboxOverlay({ interleaved: true, layers: [], getTooltip: (i) => this.tooltip(i) });
    this.map.addControl(this.overlay);
    this.map.on('click', (e) => { if (this._nevClick) { this._nevClick = false; return; } const _s = this.state; if (_s.catchMode === 'scroll') return; if (_s.catchMode === 'area') { this.setPointInArea(e.lngLat.lng, e.lngLat.lat); } else { this.setPoint(e.lngLat.lng, e.lngLat.lat); } });
    this.map.on('load', () => { if (this.allMuniBbox) { const _b = this.allMuniBbox; this.map.fitBounds([[_b[0], _b[1]], [_b[2], _b[3]]], { padding: 45, animate: false }); } this.updateLayers(); this.updateLegend(); });
    this.map.on('zoomend', () => this.refresh());
    this.applyPanel();
  }

  // ---------- color ----------
  hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  stopsFromColor(hex) { const c = this.hex2rgb(hex), w = [255, 255, 255], k = [0, 0, 0]; return [this.mix(w, c, .16), this.mix(w, c, .46), c, this.mix(c, k, .3), this.mix(c, k, .55)].map((x) => x.map(Math.round)); }
  stopsFromGradient(stops) { return [0, 0.25, 0.5, 0.75, 1].map((t) => { let lo = stops[0], hi = stops[stops.length - 1]; for (let i = 0; i < stops.length - 1; i++) { if (stops[i].pos <= t && stops[i + 1].pos >= t) { lo = stops[i]; hi = stops[i + 1]; break; } } const span = hi.pos - lo.pos; const u = span > 0 ? (t - lo.pos) / span : 0; return this.mix(this.hex2rgb(lo.hex), this.hex2rgb(hi.hex), u).map(Math.round); }); }
  stopsForMetric(m) { const h = this.state.heatColors[m]; return Array.isArray(h) ? this.stopsFromGradient(h) : this.RAMPS[this.metricRamp[m]]; }
  cityStops() { return this.stopsForMetric(this.state.metric); }
  catchStops() { const s = this.state, f = s.catchFlags; if (s.catchCo2) return this.stopsForMetric('co2'); if (f.in && f.out) return null; if (f.in) return this.stopsForMetric('inc'); if (f.out) return this.stopsForMetric('out'); return this.stopsForMetric('internal'); }
  ramp(t, stops) { const n = stops.length - 1; let x = t * n; if (x < 0) x = 0; if (x > n) x = n; let i = Math.floor(x); if (i >= n) i = n - 1; const u = x - i, a = stops[i], b = stops[i + 1]; return [Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), Math.round(a[2] + (b[2] - a[2]) * u)]; }

  cityColor(id, metricOverride) {
    const k = metricOverride || this.state.metric, stops = this.stopsForMetric(k);
    const v = (this.data.metrics[k][id] || 0); if (!(v > 0)) return [0, 0, 0, 0];
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
    this.cat = { inMap, outMap, co2In, co2Out, totIn, totOut, totCo2In, totCo2Out, intra, count: sel.count, mem: sel.mem, hub, label: sel.label, kind: sel.kind, sub: sel.sub, polyRings: sel.polyRings, circle: sel.circle };
  }

  connValue(id) { const c = this.cat, f = this.state.catchFlags, co2 = this.state.catchCo2; if (!f.in && !f.out) return 0; if (co2) { if (f.in && f.out) return (c.co2In[id] || 0) + (c.co2Out[id] || 0); if (f.in) return c.co2In[id] || 0; return c.co2Out[id] || 0; } if (f.in && f.out) return (c.inMap[id] || 0) + (c.outMap[id] || 0); if (f.in) return c.inMap[id] || 0; return c.outMap[id] || 0; }

  updateLayers() {
    if (!this.overlay || !this.data) return;
    const s = this.state, layers = [], dark = s.basemap === 'dark';
    if (s.heatmap || s.grid) layers.push(new H3HexagonLayer({
      id: 'hex', data: this.hexData, getHexagon: (d) => d.h3, extruded: false, filled: s.heatmap, stroked: s.grid,
      getFillColor: (d) => this.cityColor(d.id), getLineColor: dark ? [255, 255, 255, 30] : [23, 50, 77, 32], lineWidthMinPixels: 0.5, getLineWidth: 1,
      pickable: true, autoHighlight: true, highlightColor: [0, 102, 204, 90],
      updateTriggers: { getFillColor: [s.metric, s.filterMuni, s.heatmap, JSON.stringify(s.heatColors)] },
    }));
    if (s.mode === 'catchment' && s.catchCo2 && s.tab === 'catchment') layers.push(new H3HexagonLayer({
      id: 'hex-co2', data: this.hexData, getHexagon: (d) => d.h3, extruded: false, filled: true, stroked: false,
      getFillColor: (d) => this.cityColor(d.id, 'co2'), getLineColor: [0, 0, 0, 0], lineWidthMinPixels: 0,
      pickable: false,
      updateTriggers: { getFillColor: [s.catchCo2, s.tab] },
    }));
    if (this.cat) {
      const c = this.data.cells, f = s.catchFlags;
      if (f.in || f.out) {
        const conn = [], keys = {};
        if (f.in) Object.keys(this.cat.inMap).forEach((k) => (keys[k] = 1));
        if (f.out) Object.keys(this.cat.outMap).forEach((k) => (keys[k] = 1));
        let vmax = 1; Object.keys(keys).forEach((id) => { const v = this.connValue(+id); if (v > vmax) vmax = v; if (c.h3[id]) conn.push({ id: +id, h3: c.h3[id], v }); });
        this.connInfo = { vmax }; const vlog = Math.log(1 + vmax);
        const cStops = this.catchStops(), aStops = this.stopsForMetric('inc'), tStops = this.stopsForMetric('out'), both = f.in && f.out;
        layers.push(new H3HexagonLayer({
          id: 'conn', data: conn, getHexagon: (d) => d.h3, extruded: false, filled: true, stroked: false,
          getFillColor: (d) => {
            let t = Math.log(1 + d.v) / vlog; if (t > 1) t = 1; if (t < 0.05) t = 0.05;
            if (!both) { const col = this.ramp(t, cStops); return [col[0], col[1], col[2], 225]; }
            const iv = this.cat.inMap[d.id] || 0, ov = this.cat.outMap[d.id] || 0, tot = iv + ov, ratio = tot ? ov / tot : 0.5;
            const col = this.mix(this.ramp(t, aStops), this.ramp(t, tStops), ratio).map(Math.round); return [col[0], col[1], col[2], 225];
          },
          pickable: true, autoHighlight: true, highlightColor: [0, 102, 204, 80],
          updateTriggers: { getFillColor: [JSON.stringify(f), JSON.stringify(s.heatColors), s.areaLevel, s.areaMuni, s.areaZone, s.frazId, s.radiusKm, s.ptLat] },
        }));
        const hub = this.cat.hub, top = conn.slice().sort((a, b) => b.v - a.v).slice(0, 28), tf = top.length ? top[0].v : 1, arcsIn = [], arcsOut = [];
        top.forEach((t) => { const cell = [c.lng[t.id], c.lat[t.id]], iv = this.cat.inMap[t.id] || 0, ov = this.cat.outMap[t.id] || 0; if (f.in && iv) arcsIn.push({ from: cell, to: hub, f: iv }); if (f.out && ov) arcsOut.push({ from: hub, to: cell, f: ov }); });
        if (arcsIn.length) layers.push(new ArcLayer({ id: 'arcin', data: arcsIn, getSourcePosition: (d) => d.from, getTargetPosition: (d) => d.to, getSourceColor: [204, 122, 0, 70], getTargetColor: [204, 122, 0, 240], getWidth: (d) => 1 + (d.f / tf) * 8, widthUnits: 'pixels', getHeight: 0 }));
        if (arcsOut.length) layers.push(new ArcLayer({ id: 'arcout', data: arcsOut, getSourcePosition: (d) => d.from, getTargetPosition: (d) => d.to, getSourceColor: [7, 127, 123, 240], getTargetColor: [11, 203, 197, 70], getWidth: (d) => 1 + (d.f / tf) * 8, widthUnits: 'pixels', getHeight: 0 }));
      }
      if (f.internal) {
        const intData = [], intMet = this.data.metrics.internal, intVmax = this.vmax.internal, intStops = this.stopsForMetric('internal'), intVlog = Math.log(1 + intVmax);
        for (let id = 1; id <= c.maxId; id++) { if (this.cat.mem[id] && c.h3[id]) intData.push({ id, h3: c.h3[id] }); }
        layers.push(new H3HexagonLayer({
          id: 'internal', data: intData, getHexagon: (d) => d.h3, extruded: false, filled: true, stroked: false,
          getFillColor: (d) => { const v = intMet[d.id] || 0; if (!(v > 0)) return [0, 0, 0, 0]; let t = Math.log(1 + v) / intVlog; if (t > 1) t = 1; const col = this.ramp(t, intStops); return [col[0], col[1], col[2], 200]; },
          pickable: true, autoHighlight: true, highlightColor: [0, 102, 204, 80],
          updateTriggers: { getFillColor: [JSON.stringify(s.heatColors), s.areaLevel, s.areaMuni, s.areaZone, s.frazId, s.radiusKm, s.ptLat] },
        }));
      }
      if (this.cat.polyRings) layers.push(new GeoJsonLayer({ id: 'areafill', data: { type: 'FeatureCollection', features: this.cat.polyRings.map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [r] } })) }, stroked: true, filled: true, getFillColor: [0, 51, 102, 24], getLineColor: [0, 51, 102, 235], getLineWidth: 2.5, lineWidthUnits: 'pixels' }));
      else if (this.cat.circle) layers.push(new PolygonLayer({ id: 'circle', data: [{ polygon: this.circlePoly(this.cat.circle.lng, this.cat.circle.lat, this.cat.circle.km) }], getPolygon: (d) => d.polygon, filled: true, stroked: true, getFillColor: [0, 51, 102, 18], getLineColor: [0, 51, 102, 200], getLineWidth: 2, lineWidthUnits: 'pixels' }));
      layers.push(new ScatterplotLayer({ id: 'hub', data: [{ p: this.cat.hub }], getPosition: (d) => d.p, getFillColor: [255, 200, 0], getRadius: 8, radiusUnits: 'pixels', stroked: true, getLineColor: [0, 51, 102], lineWidthMinPixels: 2.5 }));
    }
    if (s.showMuniBounds) { const mb = this.hex2rgb(s.muniBorderColor); layers.push(new GeoJsonLayer({ id: 'bounds', data: this.boundaryGeo, stroked: true, filled: false, getLineColor: (f) => (s.filterMuni && f.properties.n === s.filterMuni) ? [204, 122, 0, 255] : [...mb, 220], getLineWidth: (f) => (s.filterMuni && f.properties.n === s.filterMuni) ? Math.max(s.muniBorderWidth, 2.5) : s.muniBorderWidth, lineWidthUnits: 'pixels', lineWidthMinPixels: 1, updateTriggers: { getLineColor: [s.filterMuni, s.muniBorderColor], getLineWidth: [s.filterMuni, s.muniBorderWidth] } })); }
    if (s.showMuniLabels && this.muniLabelData && this.muniLabelData.length) { const ml = this.hex2rgb(s.muniLabelColor); layers.push(new TextLayer({ id: 'munilabels', data: this.muniLabelData, getPosition: (d) => d.position, getText: (d) => d.text, getSize: s.muniLabelSize, getColor: [...ml, 235], getBackgroundColor: dark ? [0, 0, 0, 190] : [255, 255, 255, 210], background: true, backgroundPadding: [5, 3], fontWeight: 700, fontFamily: "'Titillium Web',sans-serif", billboard: false, sizeUnits: 'pixels', getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: [s.muniLabelColor], getSize: [s.muniLabelSize], getBackgroundColor: [s.basemap] } })); }
    if (s.showQuartieriBounds && this.quartieriGeo) { const qb = this.hex2rgb(s.quartieriBorderColor); layers.push(new GeoJsonLayer({ id: 'quartieri-bounds', data: this.quartieriGeo, stroked: true, filled: false, getLineColor: [...qb, 180], getLineWidth: s.quartieriBorderWidth, lineWidthUnits: 'pixels', lineWidthMinPixels: 0.5, updateTriggers: { getLineColor: [s.quartieriBorderColor], getLineWidth: [s.quartieriBorderWidth] } })); }
    if (s.showQuartieriLabels && this.etichetteLabelData) { const ql = this.hex2rgb(s.quartieriLabelColor); layers.push(new TextLayer({ id: 'quartieriLabels', data: this.etichetteLabelData, getPosition: (d) => d.position, getText: (d) => d.text, getSize: s.quartieriLabelSize, getColor: [...ql, 220], getBackgroundColor: dark ? [0, 0, 0, 170] : [240, 245, 255, 200], background: true, backgroundPadding: [4, 2], fontFamily: "'Titillium Web',sans-serif", fontWeight: 600, billboard: false, sizeUnits: 'pixels', getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: [s.quartieriLabelColor], getSize: [s.quartieriLabelSize], getBackgroundColor: [s.basemap] } })); }
    if (s.showFrazioni && this.frazLabelData) { const fl = this.hex2rgb(s.frazLabelColor); const _fzoom = this.map ? this.map.getZoom() : 9; if (_fzoom >= 11) layers.push(new TextLayer({ id: 'frazlabels', data: this.frazLabelData, getPosition: (d) => d.position, getText: (d) => d.text, getSize: s.frazLabelSize, getColor: [...fl, 230], getBackgroundColor: dark ? [0, 0, 0, 180] : [240, 255, 253, 215], background: true, backgroundPadding: [4, 2], fontFamily: "'Titillium Web',sans-serif", fontWeight: 600, billboard: false, sizeUnits: 'pixels', getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: [s.frazLabelColor], getSize: [s.frazLabelSize], getBackgroundColor: [s.basemap] } })); }
    if (s.showComuniBounds && this.comuniGeo) { const bc = this.hex2rgb(s.comuniBorderColor); layers.push(new GeoJsonLayer({ id: 'comuni-bounds', data: this.comuniGeo, stroked: true, filled: false, pickable: true, autoHighlight: true, highlightColor: [...this.hex2rgb(s.comuniBorderColor), 60], getLineColor: [...bc, 220], getLineWidth: s.comuniBorderWidth, lineWidthUnits: 'pixels', lineWidthMinPixels: 1, updateTriggers: { getLineColor: [s.comuniBorderColor], getLineWidth: [s.comuniBorderWidth] } })); }
    if (s.showComuniLabels && this.comuniLabelData) { const lc = this.hex2rgb(s.comuniLabelColor); layers.push(new TextLayer({ id: 'comuni-labels', data: this.comuniLabelData, getPosition: (d) => d.position, getText: (d) => d.text, getSize: s.comuniLabelSize, getColor: [...lc, 235], getBackgroundColor: dark ? [10, 0, 30, 185] : [255, 255, 255, 215], background: true, backgroundPadding: [4, 2], fontFamily: "'Titillium Web',sans-serif", fontWeight: 600, billboard: false, sizeUnits: 'pixels', getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: [s.comuniLabelColor, s.basemap], getSize: [s.comuniLabelSize], getBackgroundColor: [s.basemap] } })); }
    if (s.showNevralgic) layers.push(new ScatterplotLayer({ id: 'nevralgic', data: PUNTI_NEVRALGICI, getPosition: (d) => [d.longitudine, d.latitudine], getFillColor: (d) => nevralgicoColor(d.tipologia), getLineColor: [255, 255, 255], getRadius: 9, radiusUnits: 'pixels', stroked: true, lineWidthMinPixels: 2, pickable: true, autoHighlight: true, highlightColor: [255, 240, 150, 120], onClick: (info) => { if (info.object) this.setNevralgicPoint(info.object); } }));
    this.overlay.setProps({ layers });
  }

  setNevralgicPoint(p) {
    this._nevClick = true;
    this._ptName = p.nome;
    this.setState({ hasPoint: true, ptLng: p.longitudine, ptLat: p.latitudine, mode: 'catchment', catchMode: 'radius', areaLevel: '', tab: 'catchment', radiusKm: p.raggio_cattura_km }, () => { this.computeCatchment(); this.refresh(); });
    if (this.map) this.map.flyTo({ center: [p.longitudine, p.latitudine], zoom: 12, duration: 800 });
  }

  circlePoly(lng, lat, km) { const pts = [], R = 6371, d = km / R, la1 = lat * Math.PI / 180, lo1 = lng * Math.PI / 180; for (let i = 0; i <= 64; i++) { const b = i / 64 * 2 * Math.PI; const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b)); const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2)); pts.push([lo2 * 180 / Math.PI, la2 * 180 / Math.PI]); } return pts; }

  gradStr(stops) { return `linear-gradient(90deg, ${stops.map((c, i) => `rgb(${c[0]},${c[1]},${c[2]}) ${(i / (stops.length - 1) * 100).toFixed(0)}%`).join(',')})`; }
  bothGradStr() { const a = this.ramp(.7, this.stopsForMetric('inc')), b = this.ramp(.7, this.stopsForMetric('out')); return `linear-gradient(90deg, rgb(${a.join(',')}), #b8b08a, rgb(${b.join(',')}))`; }
  updateLegend() { if (!this.legendBar) return; const s = this.state, f = s.catchFlags; if (s.mode === 'catchment' && f && f.in && f.out && !s.catchCo2) this.legendBar.style.background = this.bothGradStr(); else this.legendBar.style.background = this.gradStr(s.mode === 'catchment' ? (this.catchStops() || this.stopsForMetric('co2')) : this.cityStops()); }
  updateColorPreview() { if (!this.colorPreview) return; this.colorPreview.style.background = this.gradStr(this.cityStops()); }

  zoneNameAtZoom(id) {
    const c = this.data.cells, lng = c.lng[id], lat = c.lat[id], zoom = this.map ? this.map.getZoom() : 9;
    if (zoom >= 12.5 && this.data.frazioni && this.data.frazioni.length) {
      let nearest = null, bd = 1.0;
      this.data.frazioni.forEach((f) => { const d = this.hav(lat, lng, f.lat, f.lng); if (d < bd) { bd = d; nearest = f.name; } });
      if (nearest) return nearest;
    }
    if (zoom >= 11 && this.zoneById) {
      const inBox = (x, y, b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
      for (const z of (this.data.zone || [])) { const zd = this.zoneById[z.id]; if (!zd || !zd.bbox || !zd.rings) continue; if (!inBox(lng, lat, zd.bbox)) continue; if (this.pipR(lng, lat, zd.rings)) return zd.name; }
    }
    if (c.muni[id]) return this.muniName[c.muni[id]] || '';
    return 'Area periurbana';
  }

  tooltip({ object, layer }) {
    if (!object || !layer) return null; const fmt = (n) => Math.round(n).toLocaleString('it-IT');
    if (layer.id === 'hex') { const id = object.id, m = this.data.metrics, c = this.data.cells; const mn = this.zoneNameAtZoom(id); return { html: `<div style="font-family:'Titillium Web',sans-serif;min-width:150px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:2px">${mn}</div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Uscenti</span><b>${fmt(m.out[id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Entranti</span><b>${fmt(m.inc[id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Interni</span><b>${fmt(m.internal[id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>CO₂ t/g</span><b>${(m.co2[id] || 0).toFixed(2)}</b></div></div>`, style: this.ttStyle() }; }
    if (layer.id === 'conn') { const c = this.data.cells, mn = c.muni[object.id] ? (this.muniName[c.muni[object.id]] || '') : 'Area periurbana'; const kg = (g) => (g / 1000).toLocaleString('it-IT', { maximumFractionDigits: 0 }); return { html: `<div style="font-family:'Titillium Web',sans-serif;min-width:160px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:2px">${mn}</div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Verso il bacino</span><b>${fmt(this.cat.inMap[object.id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Dal bacino</span><b>${fmt(this.cat.outMap[object.id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px;opacity:.8"><span>CO₂ kg/g</span><b>${kg((this.cat.co2In[object.id] || 0) + (this.cat.co2Out[object.id] || 0))}</b></div></div>`, style: this.ttStyle() }; }
    if (layer.id === 'nevralgic') { const p = object; return { html: `<div style="font-family:'Titillium Web',sans-serif;max-width:220px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:3px">${p.tipologia}</div><div style="font-size:13px;font-weight:700;margin-bottom:5px">${p.nome}</div><div style="font-size:11px;opacity:.85;line-height:1.4">${p.note}</div><div style="font-size:10px;opacity:.5;margin-top:4px">Raggio bacino: ${p.raggio_cattura_km} km · clicca per analizzare</div></div>`, style: this.ttStyle() }; }
    if (layer.id === 'comuni-bounds') { const p = object.properties || {}; const istat = p.istat ? `<div style="display:flex;justify-content:space-between;gap:14px;font-size:11px;opacity:.7"><span>ISTAT</span><b>${p.istat}</b></div>` : ''; const pop = p.popolazione ? `<div style="display:flex;justify-content:space-between;gap:14px;font-size:11px;opacity:.7"><span>Popolazione</span><b>${Number(p.popolazione).toLocaleString('it-IT')}</b></div>` : ''; return { html: `<div style="font-family:'Titillium Web',sans-serif;min-width:150px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:3px">Comune</div><div style="font-size:13px;font-weight:700;margin-bottom:4px">${p.name || ''}</div>${istat}${pop}</div>`, style: this.ttStyle() }; }
    return null;
  }
  ttStyle() { return { background: '#003366', color: '#fff', padding: '8px 11px', borderRadius: '4px', boxShadow: '0 8px 16px rgba(0,0,0,.2)', fontSize: '12px' }; }

  refresh() { this.updateLayers(); this.updateLegend(); this.updateColorPreview(); }
  setMetric(m) { this.setState({ metric: m }, () => this.refresh()); }
  toggle(k) { this.setState((s) => ({ [k]: !s[k] }), () => this.refresh()); }
  setHeatColor(v) { this.setState((s) => ({ heatColors: { ...s.heatColors, [s.metric]: v } }), () => this.refresh()); }
  setAuto() { this.setState((s) => ({ heatColors: { ...s.heatColors, [s.metric]: null } }), () => this.refresh()); }
  setTab(t) { this.setState({ tab: t, ...(t !== 'catchment' ? { catchCo2: false } : {}) }, () => this.refresh()); }
  setDir(d) { this.setState({ catchDir: d }, () => this.refresh()); }
  toggleDir(which) { this.setState((s) => ({ catchFlags: { ...s.catchFlags, [which]: !s.catchFlags[which] } }), () => this.refresh()); }
  toggleCo2() { this.setState((s) => ({ catchCo2: !s.catchCo2 }), () => this.refresh()); }
  setBasemapVal(v) { this.setState({ basemap: v }); if (this.map) { this.map.setStyle(this.STYLES[v]); this.map.once('styledata', () => setTimeout(() => { this.updateLayers(); this.updateLegend(); }, 120)); } }
  setFilterVal(v) { v = +v; this.setState({ filterMuni: v }, () => this.refresh()); if (this.map) { if (v && this.muniBbox[v]) { const b = this.muniBbox[v]; this.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 60, duration: 700 }); } else this.map.flyTo({ center: [12.52, 41.9], zoom: 9.3, duration: 700 }); } }
  setLayerStyle(k, v) { this.setState({ [k]: v }, () => this.refresh()); }

  nearestName(lat, lng) { const c = this.data.cells; let mn = 0, bd = 1e9; for (let id = 1; id <= c.maxId; id++) { if (!c.h3[id]) continue; const d = this.hav(lat, lng, c.lat[id], c.lng[id]); if (d < bd) { bd = d; mn = c.muni[id]; } } return mn ? (this.muniName[mn] || 'Punto selezionato') : 'Area periurbana'; }
  setPoint(lng, lat, name) { this._ptName = name || this.nearestName(lat, lng); this.setState({ hasPoint: true, ptLng: lng, ptLat: lat, mode: 'catchment', catchMode: 'radius', areaLevel: '' }, () => { this.computeCatchment(); this.refresh(); }); }
  setPointInArea(lng, lat) {
    const s = this.state;
    if (s.areaLevel === 'municipio') {
      const c = this.data.cells; let mn = 0, bd = 1e9;
      for (let id = 1; id <= c.maxId; id++) { if (!c.h3[id] || !c.muni[id]) continue; const d = this.hav(lat, lng, c.lat[id], c.lng[id]); if (d < bd) { bd = d; mn = c.muni[id]; } }
      if (mn) this.setAreaMuni(mn);
    } else if (s.areaLevel === 'zona') {
      const inBox = (x, y, b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
      for (const z of (this.data.zone || [])) { const zd = this.zoneById[z.id]; if (!zd || !zd.bbox || !zd.rings) continue; if (!inBox(lng, lat, zd.bbox)) continue; if (this.pipR(lng, lat, zd.rings)) { this.setAreaZone(z.id); return; } }
    } else if (s.areaLevel === 'frazione') {
      let best = -1, bd = Infinity;
      this.data.frazioni.forEach((f, i) => { const d = this.hav(lat, lng, f.lat, f.lng); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) this.setFraz(best);
    }
  }
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
  // (moved to src/utils/styles.js)

  viewModel() {
    const s = this.state, P = this.data && this.data.panels, fmt = (n) => Math.round(n).toLocaleString('it-IT');
    const kg = (g) => Math.round(g / 1000).toLocaleString('it-IT'), tonn = (g) => (g / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 });
    let legendTitle, legendMax, legendMin = '0', legendUnit;
    if (s.mode === 'catchment' && this.cat) {
      const dirTxt = s.catchDir === 'in' ? 'origine' : s.catchDir === 'out' ? 'destinazione' : s.catchDir === 'internal' ? 'interno' : 'entrata ↔ uscita';
      if (s.catchDir === 'both' && !s.catchCo2) { legendTitle = 'Bacino · entrata ↔ uscita'; legendMin = 'entrata'; legendMax = 'uscita'; legendUnit = ''; }
      else if (s.catchDir === 'internal') { legendTitle = 'Spostamenti interni · bacino'; legendMax = this.vmax ? fmt(this.vmax.internal || 0) : '—'; legendUnit = 'viaggi/g'; }
      else if (s.catchCo2) { legendTitle = 'CO₂ · città intera'; legendMax = this.vmax ? fmt(this.vmax.co2 || 0) : '—'; legendUnit = 't/g'; }
      else { legendTitle = 'Bacino · ' + dirTxt; legendMax = this.connInfo ? fmt(this.connInfo.vmax) : '—'; legendUnit = 'viaggi/g'; }
    } else { legendTitle = this.METRIC_LABEL[s.metric]; legendMax = this.vmax ? fmt(this.vmax[s.metric] || 0) : '—'; legendUnit = s.metric === 'co2' ? 't/g' : 'viaggi/g'; }
    const zoneAll = this.data ? this.data.zone : [];
    const zoneFiltered = s.areaMuni ? zoneAll.filter((z) => z.muni === s.areaMuni) : zoneAll;
    const v = {
      legendTitle, legendMax, legendMin, legendUnit,
      municipiOptions: P ? P.municipi.slice().sort((a, b) => a.n - b.n).map((m) => ({ n: m.n, label: m.full.replace('Municipio Roma ', 'Municipio ') })) : [],
      heatModeName: Array.isArray(s.heatColors[s.metric]) ? 'Personalizzato' : 'Automatico',
      heatStops: s.heatColors[s.metric] || this.METRIC_DEFAULT_STOPS[s.metric],
      heatDefaultStops: this.METRIC_DEFAULT_STOPS[s.metric],
      metricLabelShort: this.metricShort[s.metric],
      zoneOptions: zoneFiltered.map((z) => ({ id: z.id, label: z.name + ' · ' + z.tipo + (z.muni ? ' (Mun. ' + (this.muniName[z.muni] || '').replace('Municipio Roma ', '') + ')' : '') })),
      zoneCount: zoneFiltered.length,
      frazOptions: this.data ? this.data.frazioni.map((f, i) => ({ id: i, name: f.name })) : [], frazCount: this.data ? this.data.frazioni.length : 0,
      radiusLabel: s.radiusKm.toFixed(1).replace('.', ',') + ' km',
      noSelHint: s.catchMode === 'area' ? (s.areaLevel ? 'Completa la selezione qui sopra.' : 'Scegli un ambito dal menu qui sopra.') : 'Clicca sulla mappa o scegli un polo qui sopra.',
      inLabel: s.catchCo2 ? 'CO₂ ENTRATA · t/g' : 'IN ENTRATA · viaggi/g', outLabel: s.catchCo2 ? 'CO₂ USCITA · t/g' : 'IN USCITA · viaggi/g',
      kpiTrips: P ? (P.totals.trips / 1e6).toFixed(2).replace('.', ',') + ' M' : '—', kpiCo2: P ? fmt(P.totals.co2_baseline) : '—', kpiCells: P ? fmt(P.totals.cells) : '—',
      co2Bars: [], modalSegs: [], modalLegend: [], modalAuto: 0, modalTrips: [], scenari: [], smartPts: '', smartArea: '', smartDots: [], smartGrid: [],
      muniRank: null, muniRankOf: 15,
      topOrigins: [], topDests: [], totIn: '0', totOut: '0', totIntra: '0', intraNote: '', selName: '', selSub: '', selKind: '',
      puntiNevralgici: PUNTI_NEVRALGICI.map((p) => ({ ...p, color: nevralgicoColor(p.tipologia) })),
      hasCatchment: !!this.cat,
    };
    if (this.cat) {
      const c = this.data.cells, co2 = s.catchCo2;
      v.selName = this.cat.label; v.selSub = this.cat.sub; v.selKind = this.cat.kind;
      v.totIn = co2 ? tonn(this.cat.totCo2In) : fmt(this.cat.totIn);
      v.totOut = co2 ? tonn(this.cat.totCo2Out) : fmt(this.cat.totOut);
      v.totIntra = fmt(this.cat.intra);
      v.intraNote = co2 ? `Stima CO₂ tank-to-wheel · ${fmt(this.cat.intra)} spostamenti interni.` : `Più ${fmt(this.cat.intra)} spostamenti interni al bacino.`;
      const agg = (map) => { const a = {}; for (const id in map) { const m = c.muni[id] || 0; a[m] = (a[m] || 0) + map[id]; } return Object.keys(a).map((k) => ({ name: +k ? (this.muniName[k] || 'Municipio ' + k).replace('Municipio Roma ', 'Mun. ') : 'Area periurbana', flux: a[k] })).sort((x, y) => y.flux - x.flux); };
      const inSrc = co2 ? this.cat.co2In : this.cat.inMap, outSrc = co2 ? this.cat.co2Out : this.cat.outMap;
      const oi = agg(inSrc), od = agg(outSrc), mi = oi.length ? oi[0].flux : 1, mo = od.length ? od[0].flux : 1;
      const lab = (x) => co2 ? kg(x) : fmt(x);
      v.topOrigins = oi.slice(0, 8).map((r) => ({ name: r.name, flux: lab(r.flux), pct: Math.max(3, r.flux / mi * 100) }));
      v.topDests = od.slice(0, 8).map((r) => ({ name: r.name, flux: lab(r.flux), pct: Math.max(3, r.flux / mo * 100) }));
      if (this.cat.kind === 'Municipio' && P) { const sortedMuni = P.municipi.slice().sort((a, b) => b.co2 - a.co2); const rank = sortedMuni.findIndex((m) => m.full === this.cat.label) + 1; if (rank > 0) { v.muniRank = rank; v.muniRankOf = sortedMuni.length; } }
    }
    if (P) {
      const muni = P.municipi, maxC = Math.max.apply(null, muni.map((m) => m.co2));
      v.co2Bars = muni.map((m) => ({ name: 'Mun. ' + m.name, pct: Math.max(2, m.co2 / maxC * 100), co2Label: fmt(m.co2), color: `rgb(${this.ramp(0.28 + 0.68 * m.co2 / maxC, this.RAMPS.ambra).join(',')})` }));
      const cs = P.cityShare, C = 2 * Math.PI * 50; let cum = 0;
      const order = [['Auto privata', cs.auto, '#003366'], ['Trasporto pubblico', cs.tpl, '#089994'], ['Piedi · bici', cs.active, '#00b377']];
      v.modalSegs = order.map(([l, val, col]) => { const midAng = (cum + val / 2) * 2 * Math.PI - Math.PI / 2; const seg = { color: col, dash: `${(val * C).toFixed(1)} ${C.toFixed(1)}`, off: (-cum * C).toFixed(1), labelX: (70 + 50 * Math.cos(midAng)).toFixed(1), labelY: (70 + 50 * Math.sin(midAng)).toFixed(1), pct: Math.round(val * 100) }; cum += val; return seg; });
      v.modalLegend = order.map(([l, val, col]) => ({ label: l, color: col, pct: Math.round(val * 100) })); v.modalAuto = Math.round(cs.auto * 100);
      v.modalTrips = order.map(([l, val]) => ({ trips_fmt: (val * P.totals.trips / 1e6).toFixed(1).replace('.', ',') + ' M' }));
      const sc = P.scenari, sbase = sc[0].co2;
      const scShortLabels = ['Base', 'A', 'B', 'C', 'D', 'E'];
      v.scenari = sc.map((x, i) => ({ name: x.scenario.replace(/^Scenario [A-E] /, '').replace('(attuale)', '').trim(), shortName: scShortLabels[i] || String(i), w: x.co2 / sbase * 100, co2: fmt(x.co2), rid: i === 0 ? 'baseline' : '\u2212' + x.rid_pct.toFixed(0) + '%', ridT: i === 0 ? null : (x.rid_t != null ? fmt(x.rid_t) : null), ridColor: i === 0 ? '#929da9' : '#008055', color: i === 0 ? '#768594' : `rgb(${this.ramp(0.3 + 0.6 * Math.min(1, x.rid_pct / 28), this.RAMPS.teal).join(',')})` }));
      const sm = P.smart, co2s = sm.map((d) => d.co2), ymin = Math.min.apply(null, co2s), ymax = Math.max.apply(null, co2s);
      const xs = (val) => 34 + (val / 50) * 256, ys = (val) => 16 + (1 - (val - ymin) / (ymax - ymin)) * 104;
      v.smartPts = sm.map((d) => `${xs(d.pct).toFixed(1)},${ys(d.co2).toFixed(1)}`).join(' ');
      v.smartArea = `34,120 ` + sm.map((d) => `${xs(d.pct).toFixed(1)},${ys(d.co2).toFixed(1)}`).join(' ') + ` ${xs(50).toFixed(1)},120`;
      v.smartDots = sm.map((d, i) => ({ cx: xs(d.pct).toFixed(1), cy: ys(d.co2).toFixed(1), lab: d.pct + '%', lab2: fmt(d.co2), above: i % 2 === 0 }));
      v.smartGrid = [ymax, (ymax + ymin) / 2, ymin].map((val) => ({ y: ys(val) + 3, label: fmt(val) }));
    }
    return v;
  }

  render() {
    const s = this.state, v = this.viewModel();
    const showClickHint = !s.loading && s.mode === 'city' && s.tab !== 'stats' && s.catchMode !== 'scroll';
    return (
      <div style={css('display:flex;flex-direction:column;height:100vh;width:100vw;overflow:hidden;background:#f5f5f5;')}>
        <AppHeader onExport={() => this.exportPNG()} />

        <div style={css('flex:1;display:flex;flex-direction:row;min-height:0;position:relative;')}>
          <MapView
            mapRef={(el) => (this.mapEl = el)}
            legendBarRef={(el) => (this.legendBar = el)}
            loading={s.loading}
            loadMsg={s.loadMsg}
            errorMsg={s.errorMsg}
            panelOpen={s.panelOpen}
            showClickHint={showClickHint}
            cursorMode={s.catchMode}
            legendTitle={v.legendTitle}
            legendMin={v.legendMin}
            legendMax={v.legendMax}
            legendUnit={v.legendUnit}
            onOpenPanel={() => this.setPanel(true)}
          />

          <SidePanel
            sidePanelRef={(el) => (this.rightCol = el)}
            drawerRef={(el) => (this.drawer = el)}
            colorPreviewRef={(el) => (this.colorPreview = el)}
            s={s} v={v}
            SWATCHES={this.SWATCHES}
            bothGradStr={() => this.bothGradStr()}
            onClosePanel={() => this.setPanel(false)}
            onSetTab={(t) => this.setTab(t)}
            onMetric={(m) => this.setMetric(m)}
            onToggle={(k) => this.toggle(k)}
            onSetHeatColor={(c) => this.setHeatColor(c)}
            onSetAuto={() => this.setAuto()}
            onBasemap={(v) => this.setBasemapVal(v)}
            onFilter={(v) => this.setFilterVal(v)}
            onSetCatchMode={(m) => this.setCatchMode(m)}
            onSetAreaLevel={(v) => this.setAreaLevel(v)}
            onSetAreaMuni={(v) => this.setAreaMuni(v)}
            onSetAreaZone={(v) => this.setAreaZone(v)}
            onSetFraz={(v) => this.setFraz(v)}
            onSetRadius={(v) => this.setRadius(v)}
            onToggleDir={(w) => this.toggleDir(w)}
            onToggleCo2={() => this.toggleCo2()}
            onClearPoint={() => this.clearPoint()}
            onNevralgico={(p) => this.setNevralgicPoint(p)}
            onSetLayerStyle={(k, v) => this.setLayerStyle(k, v)}
          />
        </div>
      </div>
    );
  }
}
