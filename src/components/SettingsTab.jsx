import React from 'react';
import { css } from '../utils/css.js';
import { segStyle, rowStyle, pill, tabStyle, swatchStyle, autoChip } from '../utils/styles.js';

export default function SettingsTab({ s, v, SWATCHES, colorPreviewRef, onMetric, onToggle, onSetHeatColor, onSetAuto, onBasemap, onFilter, onToggleTime, onHourStart, onHourEnd }) {
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
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:8px;')}>Livelli</div>
        <div style={css('display:flex;flex-direction:column;gap:8px;')}>
          <button onClick={() => onToggle('heatmap')} style={rowStyle()}><span>Heatmap dati</span><span style={pill(s.heatmap)}>{s.heatmap ? 'ON' : 'OFF'}</span></button>
          <button onClick={() => onToggle('grid')} style={rowStyle()}><span>Griglia H3</span><span style={pill(s.grid)}>{s.grid ? 'ON' : 'OFF'}</span></button>
          <button onClick={() => onToggle('bounds')} style={rowStyle()}><span>Confini municipi</span><span style={pill(s.bounds)}>{s.bounds ? 'ON' : 'OFF'}</span></button>
          <button onClick={() => onToggle('showNevralgic')} style={rowStyle()}><span>Punti nevralgici</span><span style={pill(s.showNevralgic)}>{s.showNevralgic ? 'ON' : 'OFF'}</span></button>
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
      <div>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;')}>
          <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Fascia oraria</span>
          <button onClick={onToggleTime} style={pill(s.timeEnabled)}>{s.timeEnabled ? 'Attivo' : 'Off'}</button>
        </div>
        <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:9px;')}>
          <span style={css('width:34px;flex:none;font-size:11px;font-weight:600;color:#768594;')}>Dalle</span>
          <input type="range" min="0" max="23" step="1" value={s.hourStart} onChange={(e) => onHourStart(e.target.value)} disabled={!s.timeEnabled} />
          <span style={css('width:42px;flex:none;text-align:right;font-size:13px;font-weight:700;color:#17324d;font-variant-numeric:tabular-nums;')}>{v.hourStartLabel}</span>
        </div>
        <div style={css('display:flex;align-items:center;gap:10px;')}>
          <span style={css('width:34px;flex:none;font-size:11px;font-weight:600;color:#768594;')}>Alle</span>
          <input type="range" min="0" max="23" step="1" value={s.hourEnd} onChange={(e) => onHourEnd(e.target.value)} disabled={!s.timeEnabled} />
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
