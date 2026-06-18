import React from 'react';
import { css } from '../utils/css.js';
import { segStyle, co2Pill } from '../utils/styles.js';
import RankList from './RankList.jsx';

export default function CatchmentTab({ s, v, bothGradStr, onSetCatchMode, onSetAreaLevel, onSetAreaMuni, onSetAreaZone, onSetFraz, onSetRadius, onSetDir, onToggleCo2, onClearPoint, onPreset, onNevralgico }) {
  return (
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:16px;')}>
      <div style={css('font-size:12.5px;color:#5c6f82;line-height:1.45;')}>Da dove arrivano e dove vanno gli spostamenti di un'area, in modo <b style={{ color: '#17324d' }}>gerarchico</b>.</div>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Tipo di bacino</div>
        <div style={css('display:flex;gap:5px;')}>
          <button onClick={() => onSetCatchMode('radius')} style={segStyle(s.catchMode === 'radius')}>Raggio attorno a un punto</button>
          <button onClick={() => onSetCatchMode('area')} style={segStyle(s.catchMode === 'area')}>Area amministrativa</button>
        </div>
      </div>

      {s.catchMode === 'radius' && (
        <div style={css('display:flex;flex-direction:column;gap:16px;')}>
          <div>
            <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Poli di interesse</div>
            <div style={css('display:flex;flex-wrap:wrap;gap:6px;')}>
              {v.presets.map((p) => (
                <button key={p.name} onClick={() => onPreset(p)} style={css('height:30px;padding:0 12px;border:1px solid #c5c7c9;background:#fff;border-radius:40px;font-family:inherit;font-size:12.5px;font-weight:600;color:#003366;cursor:pointer;')}>{p.name}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Punti nevralgici</div>
            <div style={css('display:flex;flex-direction:column;gap:5px;')}>
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
            </div>
          </div>
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
        </div>
      )}

      {s.catchMode === 'area' && (
        <div style={css('display:flex;flex-direction:column;gap:13px;')}>
          <div>
            <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:7px;')}>Ambito (livello)</div>
            <select onChange={(e) => onSetAreaLevel(e.target.value)} value={s.areaLevel} style={css('width:100%;height:36px;border:1px solid #c5c7c9;border-radius:4px;padding:0 9px;font-family:inherit;font-size:14px;color:#17324d;background:#fff;cursor:pointer;')}>
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

      <div>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;')}>
          <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Direzione visualizzata</span>
          <button onClick={onToggleCo2} style={co2Pill(s.catchCo2)}>CO₂ {s.catchCo2 ? 'ON' : 'OFF'}</button>
        </div>
        <div style={css('display:flex;gap:5px;')}>
          <button onClick={() => onSetDir('in')} style={segStyle(s.catchDir === 'in')}>Entrata</button>
          <button onClick={() => onSetDir('out')} style={segStyle(s.catchDir === 'out')}>Uscita</button>
          <button onClick={() => onSetDir('both')} style={segStyle(s.catchDir === 'both')}>Entrambi</button>
        </div>
        {s.catchDir === 'both' && !s.catchCo2 && (
          <>
            <div style={{ ...css('height:9px;border-radius:2px;margin-top:9px;'), background: bothGradStr() }} />
            <div style={css('display:flex;justify-content:space-between;margin-top:3px;font-size:10px;color:#768594;font-weight:600;')}><span>prevale entrata</span><span>prevale uscita</span></div>
          </>
        )}
        {s.catchCo2 && (
          <div style={css('font-size:10px;color:#a3adb7;margin-top:7px;line-height:1.35;')}>CO₂ stimata: spostamenti × distanza dal centro del bacino × 117 g/km.</div>
        )}
      </div>

      {v.hasCatchment ? (
        <div style={css('border-top:1px solid #ebeced;padding-top:14px;display:flex;flex-direction:column;gap:14px;')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;')}>
            <div>
              <div style={css('font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#089994;')}>{v.selKind}</div>
              <div style={css('font-size:14px;font-weight:700;color:#003366;')}>{v.selName}</div>
              <div style={css("font-size:11px;color:#929da9;font-family:'Roboto Mono',monospace;")}>{v.selSub}</div>
            </div>
            <button onClick={onClearPoint} style={css('height:28px;padding:0 11px;border:1px solid #ebeced;background:#fff;border-radius:4px;cursor:pointer;color:#5c6f82;font-family:inherit;font-size:12.5px;font-weight:600;')}>Azzera</button>
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
          <RankList title="Da dove arrivano" sub="origine" rows={v.topOrigins} color="#cc7a00" />
          <RankList title="Dove vanno" sub="destinazione" rows={v.topDests} color="#089994" />
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
