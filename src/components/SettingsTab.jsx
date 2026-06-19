import React from 'react';
import { css } from '../utils/css.js';
import { segStyle, rowStyle, pill, tabStyle, swatchStyle, autoChip } from '../utils/styles.js';

export default function SettingsTab({ s, v, SWATCHES, colorPreviewRef, onMetric, onToggle, onSetHeatColor, onSetAuto, onBasemap, onFilter }) {
  return (
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:18px;')}>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:8px;')}>Metrica heatmap città</div>
        <div style={css('display:flex;gap:5px;')}>
          <button onClick={() => onMetric('out')} style={segStyle(s.metric === 'out')}>Uscenti</button>
          <button onClick={() => onMetric('inc')} style={segStyle(s.metric === 'inc')}>Entranti</button>
          <button onClick={() => onMetric('co2')} style={segStyle(s.metric === 'co2')}>CO₂</button>
        </div>
      </div>
      <div>
        <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;')}>
          <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Colore — {v.metricLabelShort}</span>
          <span style={css('font-size:12.5px;font-weight:700;color:#003366;')}>{v.heatModeName}</span>
        </div>
        <div style={css('font-size:10px;color:#a3adb7;margin-bottom:8px;')}>Ogni metrica salva il proprio colore.</div>
        <div style={css('display:flex;gap:7px;align-items:center;flex-wrap:wrap;')}>
          <button onClick={onSetAuto} style={autoChip(!s.heatColors[s.metric])}>Auto</button>
          {SWATCHES.map((hex) => (
            <button key={hex} onClick={() => onSetHeatColor(hex)} title={hex} style={swatchStyle(hex, s.heatColors[s.metric] === hex)} />
          ))}
          <label style={css('display:flex;align-items:center;gap:5px;margin-left:2px;cursor:pointer;')}>
            <input type="color" value={v.heatColorValue} onInput={(e) => onSetHeatColor(e.target.value)} onChange={(e) => onSetHeatColor(e.target.value)} />
            <span style={css('font-size:11px;color:#768594;font-weight:600;')}>scegli</span>
          </label>
        </div>
        <div ref={colorPreviewRef} style={css('height:10px;border-radius:2px;margin-top:9px;background:#ebeced;')} />
      </div>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:8px;')}>Zone cartografiche</div>
        <div style={css('display:flex;flex-direction:column;gap:6px;')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;padding:0 11px;height:36px;border:1px solid #ebeced;border-radius:4px;background:#fff;')}>
            <span style={css('font-size:13px;font-weight:600;color:#17324d;')}>Municipio</span>
            <div style={css('display:flex;gap:5px;')}>
              <button onClick={() => onToggle('showMuniBounds')} style={pill(s.showMuniBounds)}>Bordi</button>
              <button onClick={() => onToggle('showMuniLabels')} style={pill(s.showMuniLabels)}>Etichette</button>
            </div>
          </div>
          <div style={css('display:flex;align-items:center;justify-content:space-between;padding:0 11px;height:36px;border:1px solid #ebeced;border-radius:4px;background:#fff;')}>
            <span style={css('font-size:13px;font-weight:600;color:#17324d;')}>Quartieri</span>
            <div style={css('display:flex;gap:5px;')}>
              <button onClick={() => onToggle('showQuartieriBounds')} style={pill(s.showQuartieriBounds)}>Bordi</button>
              <button onClick={() => onToggle('showQuartieriLabels')} style={pill(s.showQuartieriLabels)}>Etichette</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:8px;')}>Livelli</div>
        <div style={css('display:flex;flex-direction:column;gap:8px;')}>
          <button onClick={() => onToggle('showFrazioni')} style={rowStyle()}><span>Etichette frazioni</span><span style={pill(s.showFrazioni)}>{s.showFrazioni ? 'ON' : 'OFF'}</span></button>
        </div>
      </div>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Mappa base</div>
        <select onChange={(e) => onBasemap(e.target.value)} value={s.basemap} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
          <option value="positron">Chiara (Positron)</option>
          <option value="voyager">Stradale (Voyager)</option>
          <option value="dark">Scura (Dark Matter)</option>
        </select>
      </div>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Filtra municipio</div>
        <select onChange={(e) => onFilter(e.target.value)} value={String(s.filterMuni)} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
          <option value="0">Tutta l'area metropolitana</option>
          {v.municipiOptions.map((o) => <option key={o.n} value={o.n}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
