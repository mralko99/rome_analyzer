import React from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer, ArcLayer, ScatterplotLayer, PolygonLayer } from '@deck.gl/layers';
import { css, B } from './utils/css.js';
import AppHeader from './components/AppHeader.jsx';
import MapView from './components/MapView.jsx';
import SidePanel from './components/SidePanel.jsx';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true, loadMsg: 'Caricamento dati di mobilità…', errorMsg: '',
      mode: 'city', metric: 'out',
      heatmap: true, grid: true, bounds: true, showNevralgic: true,
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
    this.PUNTI_NEVRALGICI = [
      { id: 'hub_termini', nome: 'Roma Termini', tipologia: 'Grande Attrattore Centrale', latitudine: 41.9014, longitudine: 12.5005, raggio_cattura_km: 0.8, note: 'Cuore intermodale. Picco assoluto di flussi in entrata con distanze altamente eterogenee.' },
      { id: 'hub_eur', nome: 'EUR – Palasport', tipologia: 'Polo Direzionale', latitudine: 41.8315, longitudine: 12.4654, raggio_cattura_km: 1.0, note: 'Centro lavorativo quadrante sud. Alta dipendenza da gomma tramite Cristoforo Colombo e Pontina.' },
      { id: 'hub_anagnina', nome: 'Nodo Anagnina', tipologia: 'Filtro Sud-Est (Park & Ride)', latitudine: 41.8428, longitudine: 12.5860, raggio_cattura_km: 0.6, note: 'Capolinea Metro A e scambio Cotral. Alta conversione da flussi in auto a trasporto pubblico.' },
      { id: 'hub_ponte_mammolo', nome: 'Ponte Mammolo / Rebibbia', tipologia: 'Filtro Est', latitudine: 41.9216, longitudine: 12.5653, raggio_cattura_km: 0.5, note: "Snodo vitale per i flussi in entrata dall'hinterland est lungo l'asse Tiburtina." },
      { id: 'hub_saxa_rubra', nome: 'Saxa Rubra', tipologia: 'Polo Direzionale e di Scambio Nord', latitudine: 41.974638, longitudine: 12.493280, raggio_cattura_km: 0.6, note: 'Polo lavorativo e interscambio periferico. Distanze medie percorse molto elevate.' },
      { id: 'hub_ostia_centro', nome: 'Ostia Lido (Centro)', tipologia: 'Macro-Polo Periferico Costiero', latitudine: 41.7303, longitudine: 12.2825, raggio_cattura_km: 1.2, note: 'Flussi di uscita massicci verso l\'EUR e il centro tramite Via del Mare e ferrovia Roma-Lido.' },
      { id: 'hub_tor_vergata', nome: 'Policlinico / Campus Tor Vergata', tipologia: 'Attrattore Periferico Estremo', latitudine: 41.8587, longitudine: 12.6300, raggio_cattura_km: 1.5, note: 'Cittadella molto dispersa. Raggio di cattura più ampio necessario per coprire facoltà e ospedale.' },
      { id: 'hub_ponte_di_nona', nome: 'Ponte di Nona / Roma Est', tipologia: 'Periferia Residenziale Est', latitudine: 41.9168, longitudine: 12.6648, raggio_cattura_km: 1.0, note: 'Emblema dello sprawl urbano. Altissimo tasso di motorizzazione privata e densità emissiva.' },
      { id: 'hub_casalotti', nome: 'Casalotti / Boccea', tipologia: 'Periferia Residenziale Nord-Ovest', latitudine: 41.9366, longitudine: 12.3855, raggio_cattura_km: 0.8, note: 'Quartiere isolato dalle direttrici su ferro. Forti flussi in uscita dipendenti dalla viabilità ordinaria.' },
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
    this.map.on('click', (e) => { if (this._nevClick) { this._nevClick = false; return; } this.setPoint(e.lngLat.lng, e.lngLat.lat); });
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
    if (s.showNevralgic) layers.push(new ScatterplotLayer({ id: 'nevralgic', data: this.PUNTI_NEVRALGICI, getPosition: (d) => [d.longitudine, d.latitudine], getFillColor: (d) => this.nevralgicoColor(d.tipologia), getLineColor: [255, 255, 255], getRadius: 9, radiusUnits: 'pixels', stroked: true, lineWidthMinPixels: 2, pickable: true, autoHighlight: true, highlightColor: [255, 240, 150, 120], onClick: (info) => { if (info.object) this.setNevralgicPoint(info.object); } }));
    this.overlay.setProps({ layers });
  }

  nevralgicoColor(tipologia) {
    if (/Attrattore Centrale/i.test(tipologia)) return [204, 80, 55];
    if (/Polo Direzionale/i.test(tipologia)) return [7, 127, 123];
    if (/Filtro/i.test(tipologia)) return [0, 128, 85];
    if (/Periferia/i.test(tipologia)) return [204, 51, 77];
    if (/Macro-Polo/i.test(tipologia)) return [0, 77, 153];
    return [100, 100, 140];
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
  updateLegend() { if (!this.legendBar) return; const s = this.state; if (s.mode === 'catchment' && s.catchDir === 'both' && !s.catchCo2) this.legendBar.style.background = this.bothGradStr(); else this.legendBar.style.background = this.gradStr(s.mode === 'catchment' ? (this.catchStops() || this.stopsForMetric('co2')) : this.cityStops()); }
  updateColorPreview() { if (!this.colorPreview) return; this.colorPreview.style.background = this.gradStr(this.cityStops()); }

  tooltip({ object, layer }) {
    if (!object || !layer) return null; const fmt = (n) => Math.round(n).toLocaleString('it-IT');
    if (layer.id === 'hex') { const id = object.id, m = this.data.metrics, c = this.data.cells, f = this.timeFactor(); const mn = c.muni[id] ? (this.muniName[c.muni[id]] || '') : 'Area periurbana'; return { html: `<div style="font-family:'Titillium Web',sans-serif;min-width:150px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:2px">${mn}</div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Uscenti</span><b>${fmt((m.out[id] || 0) * f)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Entranti</span><b>${fmt((m.inc[id] || 0) * f)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>CO₂ t/g</span><b>${((m.co2[id] || 0) * f).toFixed(2)}</b></div></div>`, style: this.ttStyle() }; }
    if (layer.id === 'conn') { const c = this.data.cells, mn = c.muni[object.id] ? (this.muniName[c.muni[object.id]] || '') : 'Area periurbana'; const kg = (g) => (g / 1000).toLocaleString('it-IT', { maximumFractionDigits: 0 }); return { html: `<div style="font-family:'Titillium Web',sans-serif;min-width:160px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:2px">${mn}</div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Verso il bacino</span><b>${fmt(this.cat.inMap[object.id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px"><span>Dal bacino</span><b>${fmt(this.cat.outMap[object.id] || 0)}</b></div><div style="display:flex;justify-content:space-between;gap:14px;font-size:12px;opacity:.8"><span>CO₂ kg/g</span><b>${kg((this.cat.co2In[object.id] || 0) + (this.cat.co2Out[object.id] || 0))}</b></div></div>`, style: this.ttStyle() }; }
    if (layer.id === 'nevralgic') { const p = object; return { html: `<div style="font-family:'Titillium Web',sans-serif;max-width:220px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:3px">${p.tipologia}</div><div style="font-size:13px;font-weight:700;margin-bottom:5px">${p.nome}</div><div style="font-size:11px;opacity:.85;line-height:1.4">${p.note}</div><div style="font-size:10px;opacity:.5;margin-top:4px">Raggio bacino: ${p.raggio_cattura_km} km · clicca per analizzare</div></div>`, style: this.ttStyle() }; }
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
  // (moved to src/utils/styles.js)

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
      presets: this.PRESETS,
      puntiNevralgici: this.PUNTI_NEVRALGICI.map((p) => ({ ...p, color: this.nevralgicoColor(p.tipologia) })),
      hasCatchment: !!this.cat,
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
    const showClickHint = !s.loading && s.mode === 'city' && s.tab !== 'stats';
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
            onToggleTime={() => this.toggleTime()}
            onHourStart={(v) => this.setHourStart(v)}
            onHourEnd={(v) => this.setHourEnd(v)}
            onSetCatchMode={(m) => this.setCatchMode(m)}
            onSetAreaLevel={(v) => this.setAreaLevel(v)}
            onSetAreaMuni={(v) => this.setAreaMuni(v)}
            onSetAreaZone={(v) => this.setAreaZone(v)}
            onSetFraz={(v) => this.setFraz(v)}
            onSetRadius={(v) => this.setRadius(v)}
            onSetDir={(d) => this.setDir(d)}
            onToggleCo2={() => this.toggleCo2()}
            onClearPoint={() => this.clearPoint()}
            onPreset={(p) => this.setPreset(p)}
            onNevralgico={(p) => this.setNevralgicPoint(p)}
          />
        </div>
      </div>
    );
  }
}
