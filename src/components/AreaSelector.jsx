import React from 'react';
import { css } from '../utils/css.js';

const LEVEL_DEFS = [
  { id: 'capitale',       label: 'Intera città' },
  { id: 'comune_esterno', label: 'Comuni'       },
  { id: 'municipio',      label: 'Municipio'    },
  { id: 'zona',           label: 'Zona'         },
  { id: 'frazione',       label: 'Frazione'     },
  { id: 'punto',          label: 'Punto'        },
];

export default function AreaSelector({
  level        = '',
  muni         = 0,
  zone         = -1,
  frazId       = -1,
  comuneId     = -1,
  radiusKm     = 0.6,
  municipiOptions = [],
  zoneOptions     = [],
  frazOptions     = [],
  comuniOptions   = [],
  poli            = [],
  hasPoint        = false,
  ptLat           = 0,
  ptLng           = 0,
  levels = ['capitale', 'municipio', 'zona', 'frazione', 'comune_esterno'],
  accentColor = '#003366',
  placeholder = null,
  mapHint = false,
  onSetLevel,
  onSetMuni,
  onSetZone,
  onSetFraz,
  onSetRadius,
  onSetComune,
  onPolo,
}) {
  const visible = LEVEL_DEFS.filter(l => levels.includes(l.id));

  const dropStyle = {
    width: '100%', height: '36px', borderRadius: '4px',
    padding: '0 9px', fontFamily: 'inherit', fontSize: '13px',
    color: '#17324d', background: '#fff', cursor: 'pointer',
    border: `1px solid ${accentColor}`,
  };

  const lbl = css('font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5c6f82;margin-bottom:6px;');

  return (
    <div style={css('display:flex;flex-direction:column;gap:12px;')}>

      <div style={css('display:flex;gap:5px;flex-wrap:wrap;')}>
        {visible.map(lv => (
          <button
            key={lv.id}
            onClick={() => onSetLevel?.(lv.id)}
            style={{
              flex: 'none', height: '30px', padding: '0 12px',
              border: 'none', borderRadius: '4px',
              fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer',
              background: level === lv.id ? accentColor : '#f5f5f5',
              color:      level === lv.id ? '#fff'       : '#5c6f82',
            }}
          >
            {lv.label}
          </button>
        ))}
      </div>

      {!level && placeholder && (
        <div style={css('font-size:11px;color:#a3adb7;line-height:1.4;')}>{placeholder}</div>
      )}

      {level === 'capitale' && (
        <div style={css('font-size:11.5px;color:#5c6f82;font-weight:600;line-height:1.4;')}>
          Tutti i flussi dell&apos;area metropolitana di Roma.
        </div>
      )}

      {(level === 'municipio' || level === 'zona') && (
        <div>
          <div style={lbl}>
            {level === 'zona' ? 'Filtra per municipio (opzionale)' : 'Seleziona municipio'}
          </div>
          <select onChange={e => onSetMuni?.(e.target.value)} value={String(muni)} style={dropStyle}>
            <option value="0">{level === 'zona' ? 'Tutti i municipi' : '— scegli un municipio —'}</option>
            {municipiOptions.map(o => <option key={o.n} value={o.n}>{o.label}</option>)}
          </select>
        </div>
      )}

      {level === 'zona' && (
        <div>
          <div style={lbl}>Zona / Rione / Quartiere</div>
          <select onChange={e => onSetZone?.(e.target.value)} value={String(zone)} style={dropStyle}>
            <option value="-1">— scegli una zona ({zoneOptions.length}) —</option>
            {zoneOptions.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </div>
      )}

      {level === 'frazione' && (
        <>
          <div>
            <div style={lbl}>Punto dell&apos;area metropolitana</div>
            <select onChange={e => onSetFraz?.(e.target.value)} value={String(frazId)} style={dropStyle}>
              <option value="-1">— scegli un punto ({frazOptions.length}) —</option>
              {frazOptions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          {onSetRadius && (
            <div>
              <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:5px;')}>
                <span style={lbl}>Raggio</span>
                <span style={{ fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '700', color: '#003366', fontVariantNumeric: 'tabular-nums' }}>
                  {Number(radiusKm).toFixed(1).replace('.', ',')} km
                </span>
              </div>
              <input type="range" min="0.2" max="10" step="0.1" value={radiusKm} onChange={e => onSetRadius(e.target.value)} />
            </div>
          )}
        </>
      )}

      {level === 'punto' && (
        <>
          <div style={css('font-size:11.5px;color:#5c6f82;line-height:1.4;')}>
            Clicca sulla mappa per posizionare il punto del bacino.
          </div>
          {onSetRadius && (
            <div>
              <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:5px;')}>
                <span style={lbl}>Raggio</span>
                <span style={{ fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '700', color: accentColor, fontVariantNumeric: 'tabular-nums' }}>
                  {Number(radiusKm).toFixed(1).replace('.', ',')} km
                </span>
              </div>
              <input type="range" min="0.2" max="10" step="0.1" value={radiusKm} onChange={e => onSetRadius(e.target.value)} />
            </div>
          )}
          {poli.length > 0 && (
            <div>
              <div style={lbl}>Poli di interesse</div>
              <div style={css('display:flex;flex-direction:column;gap:5px;')}>
                {poli.map((p) => {
                  const col = p.color;
                  const active = hasPoint && Math.abs(ptLat - p.latitudine) < 0.0001 && Math.abs(ptLng - p.longitudine) < 0.0001;
                  return (
                    <button key={p.id} onClick={() => onPolo?.(p)} style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '38px', padding: '0 11px', border: active ? `2px solid rgb(${col.join(',')})` : '1px solid #ebeced', background: active ? `rgba(${col.join(',')},0.07)` : '#fff', borderRadius: '6px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
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
          )}
        </>
      )}

      {level === 'comune_esterno' && (
        <div>
          <div style={lbl}>Comune (Prov. Roma)</div>
          <select onChange={e => onSetComune?.(e.target.value)} value={String(comuneId)} style={dropStyle}>
            <option value="-1">— scegli un comune ({comuniOptions.length}) —</option>
            {comuniOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {mapHint && (
            <div style={css('font-size:10px;color:#a3adb7;margin-top:5px;')}>
              oppure clicca direttamente sulla mappa
            </div>
          )}
        </div>
      )}

    </div>
  );
}
