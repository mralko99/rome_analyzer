import React, { useState } from 'react';
import { css } from '../utils/css.js';
import { segStyle, co2Pill, rowStyle, pill } from '../utils/styles.js';
import AreaSelector from './AreaSelector.jsx';

export default function CatchmentTab({
  s, v, bothGradStr,
  onSetCatchMode, onSetAreaLevel, onSetAreaMuni, onSetAreaZone, onSetFraz, onSetRadius,
  onToggleDir, onToggleCo2, onToggle, onNevralgico, onSetAreaComuneEsterno,
  onSetEditTarget, onSetCompareMode, onToggleCompareDir, onResetActiveSelection,
  onSetCompareLevel, onSetCompareMuni, onSetCompareZone, onSetCompareFraz,
  onSetCompareComuneEsterno, onSetCompareRadius, onSetCompareNevralgico,
}) {
  const [poliOpen, setPoliOpen] = useState(false);
  const target = s.editTarget || 'A';
  const isB = target === 'B';

  // Active-area accessor: maps every selector control to A or B state/handlers.
  const sel = isB ? {
    mode: s.compareMode || 'area',
    level: s.compareLevel,
    muni: s.compareMuni,
    zone: s.compareZone,
    frazId: s.compareFrazId ?? -1,
    comuneId: s.compareComuneEsternoId ?? -1,
    radiusKm: s.compareRadiusKm ?? 0.6,
    hasPoint: s.compareHasPoint,
    ptLat: s.comparePtLat,
    ptLng: s.comparePtLng,
    flags: s.compareFlags,
    zoneOptions: v.compareZoneOptions,
    radiusLabel: Number(s.compareRadiusKm ?? 0.6).toFixed(1).replace('.', ',') + ' km',
    accent: '#089994',
    setMode: onSetCompareMode,
    setLevel: onSetCompareLevel,
    setMuni: onSetCompareMuni,
    setZone: onSetCompareZone,
    setFraz: onSetCompareFraz,
    setComune: onSetCompareComuneEsterno,
    setRadius: onSetCompareRadius,
    toggleDir: onToggleCompareDir,
    nevralgico: onSetCompareNevralgico,
  } : {
    mode: s.catchMode,
    level: s.areaLevel,
    muni: s.areaMuni,
    zone: s.areaZone,
    frazId: s.frazId,
    comuneId: s.comuneEsternoId,
    radiusKm: s.radiusKm,
    hasPoint: s.hasPoint,
    ptLat: s.ptLat,
    ptLng: s.ptLng,
    flags: s.catchFlags,
    zoneOptions: v.zoneOptions,
    radiusLabel: v.radiusLabel,
    accent: '#cc7a00',
    setMode: onSetCatchMode,
    setLevel: onSetAreaLevel,
    setMuni: onSetAreaMuni,
    setZone: onSetAreaZone,
    setFraz: onSetFraz,
    setComune: onSetAreaComuneEsterno,
    setRadius: onSetRadius,
    toggleDir: onToggleDir,
    nevralgico: onNevralgico,
  };

  const targetBtn = (id, color) => ({
    flex: '1', height: '34px', border: 'none', borderRadius: '4px',
    fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
    background: target === id ? color : '#f5f5f5',
    color: target === id ? '#fff' : '#5c6f82',
  });

  return (
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:16px;')}>
      <div style={css('font-size:12.5px;color:#5c6f82;line-height:1.45;')}>Da dove arrivano e dove vanno gli spostamenti di un'area, in modo <b style={{ color: '#17324d' }}>gerarchico</b>.</div>
      <div style={css('display:flex;flex-direction:column;gap:8px;')}>
        <button onClick={onToggleCo2} style={rowStyle()}><span>Attiva CO₂</span><span style={pill(s.catchCo2)}>{s.catchCo2 ? 'ON' : 'OFF'}</span></button>
        <button onClick={() => onToggle('grid')} style={rowStyle()}><span>Griglia H3</span><span style={pill(s.grid)}>{s.grid ? 'ON' : 'OFF'}</span></button>
      </div>

      {/* ── Area A / B chooser ── */}
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Area da modificare</div>
        <div style={css('display:flex;gap:5px;')}>
          <button onClick={() => onSetEditTarget('A')} style={targetBtn('A', '#cc7a00')}>Area A · principale</button>
          <button onClick={() => onSetEditTarget('B')} style={targetBtn('B', '#089994')}>Area B · confronto</button>
        </div>
      </div>

      <div>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;')}>
          <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Direzione visualizzata</span>
        </div>
        <div style={css('display:flex;gap:5px;')}>
          <button onClick={() => sel.toggleDir('in')} style={pill(sel.flags && sel.flags.in)}>Entrata</button>
          <button onClick={() => sel.toggleDir('out')} style={pill(sel.flags && sel.flags.out)}>Uscita</button>
          <button onClick={() => sel.toggleDir('internal')} style={pill(sel.flags && sel.flags.internal)}>Interno</button>
        </div>
        {sel.flags && sel.flags.in && sel.flags.out && !s.catchCo2 && (
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
          <button onClick={() => sel.setMode('radius')} style={segStyle(sel.mode === 'radius')}>Punto</button>
          <button onClick={() => sel.setMode('area')} style={segStyle(sel.mode === 'area')}>Area</button>
          <button onClick={onResetActiveSelection} style={{ ...segStyle(false), color: '#cc334d', border: '1px solid #f0c8cf' }}>Reset</button>
        </div>
      </div>

      {sel.mode === 'radius' && (
        <div style={css('display:flex;flex-direction:column;gap:16px;')}>
          <div>
            <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;')}>
              <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Raggio del bacino</span>
              <span style={{ ...css('font-size:13.5px;font-weight:700;'), color: sel.accent }}>{sel.radiusLabel}</span>
            </div>
            <input type="range" min="0.2" max="10" step="0.1" value={sel.radiusKm} onChange={(e) => sel.setRadius(e.target.value)} />
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
                const active = sel.hasPoint && Math.abs(sel.ptLat - p.latitudine) < 0.0001 && Math.abs(sel.ptLng - p.longitudine) < 0.0001;
                return (
                  <button key={p.id} onClick={() => sel.nevralgico(p)} style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '38px', padding: '0 11px', border: active ? `2px solid rgb(${col.join(',')})` : '1px solid #ebeced', background: active ? `rgba(${col.join(',')},0.07)` : '#fff', borderRadius: '6px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
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

      {sel.mode === 'area' && (
        <AreaSelector
          level={sel.level}
          muni={sel.muni}
          zone={sel.zone}
          frazId={sel.frazId}
          comuneId={sel.comuneId}
          radiusKm={sel.radiusKm}
          municipiOptions={v.municipiOptions}
          zoneOptions={sel.zoneOptions}
          frazOptions={v.frazOptions}
          comuniOptions={v.comuniEsterniOptions || []}
          levels={['capitale', 'municipio', 'zona', 'frazione', 'comune_esterno']}
          accentColor={sel.accent}
          mapHint
          onSetLevel={sel.setLevel}
          onSetMuni={sel.setMuni}
          onSetZone={sel.setZone}
          onSetFraz={sel.setFraz}
          onSetRadius={sel.setRadius}
          onSetComune={sel.setComune}
        />
      )}

    </div>
  );
}
