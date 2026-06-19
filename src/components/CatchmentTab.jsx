import React, { useState } from 'react';
import { css } from '../utils/css.js';
import { segStyle, co2Pill, rowStyle, pill } from '../utils/styles.js';

export default function CatchmentTab({ s, v, bothGradStr, onSetCatchMode, onSetAreaLevel, onSetAreaMuni, onSetAreaZone, onSetFraz, onSetRadius, onToggleDir, onToggleCo2, onToggle, onNevralgico }) {
  const [poliOpen, setPoliOpen] = useState(false);
  return (
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:16px;')}>
      <div style={css('font-size:12.5px;color:#5c6f82;line-height:1.45;')}>Da dove arrivano e dove vanno gli spostamenti di un'area, in modo <b style={{ color: '#17324d' }}>gerarchico</b>.</div>
      <div style={css('display:flex;flex-direction:column;gap:8px;')}>
        <button onClick={onToggleCo2} style={rowStyle()}><span>Attiva CO₂</span><span style={pill(s.catchCo2)}>{s.catchCo2 ? 'ON' : 'OFF'}</span></button>
        <button onClick={() => onToggle('grid')} style={rowStyle()}><span>Griglia H3</span><span style={pill(s.grid)}>{s.grid ? 'ON' : 'OFF'}</span></button>
      </div>
      <div>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;')}>
          <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Direzione visualizzata</span>
        </div>
        <div style={css('display:flex;gap:5px;')}>
          <button onClick={() => onToggleDir('in')} style={pill(s.catchFlags && s.catchFlags.in)}>Entrata</button>
          <button onClick={() => onToggleDir('out')} style={pill(s.catchFlags && s.catchFlags.out)}>Uscita</button>
          <button onClick={() => onToggleDir('internal')} style={pill(s.catchFlags && s.catchFlags.internal)}>Interno</button>
        </div>
        {s.catchFlags && s.catchFlags.in && s.catchFlags.out && !s.catchCo2 && (
          <>
            <div style={{ ...css('height:9px;border-radius:2px;margin-top:9px;'), background: bothGradStr() }} />
            <div style={css('display:flex;justify-content:space-between;margin-top:3px;font-size:10px;color:#768594;font-weight:600;')}><span>prevale entrata</span><span>prevale uscita</span></div>
          </>
        )}
        {s.catchCo2 && (
          <div style={css('font-size:10px;color:#a3adb7;margin-top:7px;line-height:1.35;')}>CO₂ stimata: spostamenti × distanza dal centro del bacino × 117 g/km.</div>
        )}
      </div>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Tipologia selezione</div>
        <div style={css('display:flex;gap:5px;')}>
          <button onClick={() => onSetCatchMode('radius')} style={segStyle(s.catchMode === 'radius')}>Punto</button>
          <button onClick={() => onSetCatchMode('area')} style={segStyle(s.catchMode === 'area')}>Area</button>
          <button onClick={() => onSetCatchMode('scroll')} style={segStyle(s.catchMode === 'scroll')}>Esplora</button>
        </div>
      </div>

      {s.catchMode === 'radius' && (
        <div style={css('display:flex;flex-direction:column;gap:16px;')}>
          <div>
            <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;')}>
              <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Raggio del bacino</span>
              <span style={css('font-size:13.5px;font-weight:700;color:#003366;')}>{v.radiusLabel}</span>
            </div>
            <input type="range" min="0.2" max="10" step="0.1" value={s.radiusKm} onChange={(e) => onSetRadius(e.target.value)} />
            <div style={css('display:flex;justify-content:space-between;margin-top:2px;')}>
              <span style={css('font-size:10px;color:#a3adb7;')}>200 m</span>
              <span style={css('font-size:10px;color:#a3adb7;')}>10 km</span>
            </div>
          </div>
          <div>
            <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;')}>
              <button onClick={() => setPoliOpen((o) => !o)} style={css('display:flex;align-items:center;gap:5px;background:none;border:none;padding:0;cursor:pointer;font-family:inherit;')}>
                <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Poli di interesse</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5c6f82" strokeWidth="2.5" style={{ transition: 'transform .2s', transform: poliOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <button onClick={() => onToggle('showNevralgic')} title={s.showNevralgic ? 'Nascondi sulla mappa' : 'Mostra sulla mappa'} style={css(`display:flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:12px;border:1px solid ${s.showNevralgic ? '#089994' : '#c5c7c9'};background:${s.showNevralgic ? '#e6f7f7' : '#f2f2f2'};cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;color:${s.showNevralgic ? '#077f7b' : '#768594'};transition:all .15s;`)}>
                <span style={css(`width:8px;height:8px;border-radius:50%;background:${s.showNevralgic ? '#089994' : '#c5c7c9'};transition:background .15s;`)} />
                {s.showNevralgic ? 'ON' : 'OFF'}
              </button>
            </div>
            {poliOpen && <div style={css('display:flex;flex-direction:column;gap:5px;')}>
              {v.puntiNevralgici.map((p) => {
                const col = p.color;
                const active = s.hasPoint && Math.abs(s.ptLat - p.latitudine) < 0.0001 && Math.abs(s.ptLng - p.longitudine) < 0.0001;
                return (
                  <button key={p.id} onClick={() => onNevralgico(p)} style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '38px', padding: '0 11px', border: active ? `2px solid rgb(${col.join(',')})` : '1px solid #ebeced', background: active ? `rgba(${col.join(',')},0.07)` : '#fff', borderRadius: '6px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: `rgb(${col.join(',')})`, flexShrink: 0, border: '2px solid white', boxShadow: `0 0 0 1.5px rgb(${col.join(',')})` }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#17324d', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
                      <span style={{ fontSize: '10px', color: '#929da9', fontWeight: '600' }}>{p.tipologia} · {p.raggio_cattura_km} km</span>
                    </span>
                  </button>
                );
              })}
            </div>}
          </div>
        </div>
      )}

      {s.catchMode === 'area' && (
        <div style={css('display:flex;flex-direction:column;gap:13px;')}>
          <div>
            <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Ambito (livello)</div>
            <select onChange={(e) => onSetAreaLevel(e.target.value)} value={s.areaLevel} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
              <option value="">— scegli un livello —</option>
              <option value="comune">Comune di Roma</option>
              <option value="municipio">Municipi di Roma</option>
              <option value="zona">Quartieri</option>
              <option value="frazione">Punto dell'area metropolitana</option>
            </select>
          </div>
          {(s.areaLevel === 'municipio' || s.areaLevel === 'zona') && (
            <div>
              <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>{s.areaLevel === 'zona' ? 'Filtra per municipio (opzionale)' : 'Seleziona municipio'}</div>
              <select onChange={(e) => onSetAreaMuni(e.target.value)} value={String(s.areaMuni)} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
                <option value="0">{s.areaLevel === 'zona' ? 'Tutti i municipi' : '— scegli un municipio —'}</option>
                {v.municipiOptions.map((o) => <option key={o.n} value={o.n}>{o.label}</option>)}
              </select>
            </div>
          )}
          {s.areaLevel === 'zona' && (
            <div>
              <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Zona / Rione / Quartiere</div>
              <select onChange={(e) => onSetAreaZone(e.target.value)} value={String(s.areaZone)} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
                <option value="-1">— scegli una zona ({v.zoneCount}) —</option>
                {v.zoneOptions.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </div>
          )}
          {s.areaLevel === 'frazione' && (
            <div>
              <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Frazione · raggio {v.radiusLabel}</div>
              <select onChange={(e) => onSetFraz(e.target.value)} value={String(s.frazId)} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
                <option value="-1">— scegli una frazione ({v.frazCount}) —</option>
                {v.frazOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input type="range" min="0.2" max="10" step="0.1" value={s.radiusKm} onChange={(e) => onSetRadius(e.target.value)} style={{ marginTop: '9px' }} />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
