import React, { useState, useEffect, useRef } from 'react';
import { css } from '../utils/css.js';
import { segStyle, pill, autoChip, rowStyle } from '../utils/styles.js';

function sampleGradient(stops, t) {
  if (!stops || stops.length === 0) return '#888888';
  if (t <= stops[0].pos) return stops[0].hex;
  if (t >= stops[stops.length - 1].pos) return stops[stops.length - 1].hex;
  for (let i = 0; i < stops.length - 1; i++) {
    const lo = stops[i], hi = stops[i + 1];
    if (lo.pos <= t && hi.pos >= t) {
      const span = hi.pos - lo.pos, u = span > 0 ? (t - lo.pos) / span : 0;
      const h2r = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; };
      const a = h2r(lo.hex), b = h2r(hi.hex);
      return '#' + [0,1,2].map((i) => Math.round(a[i]+(b[i]-a[i])*u).toString(16).padStart(2,'0')).join('');
    }
  }
  return stops[stops.length - 1].hex;
}

// ── Shared sub-components for the layer style rows ──────────────────────────

function LayerRow({ label, accentColor, open, onToggleOpen, pills, children }) {
  return (
    <div style={css('border:1px solid #ebeced;border-radius:4px;background:#fff;overflow:hidden;')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;padding:0 11px;height:36px;')}>
        <span style={css('font-size:13px;font-weight:600;color:#17324d;')}>{label}</span>
        <div style={css('display:flex;gap:5px;align-items:center;')}>
          {pills.map((p) => (
            <button key={p.label} onClick={p.onClick} style={pill(p.active)}>{p.label}</button>
          ))}
          <button
            onClick={onToggleOpen}
            title="Personalizza stile"
            style={css(`width:26px;height:26px;border-radius:4px;border:1px solid ${open ? accentColor : '#c5c7c9'};background:${open ? accentColor + '22' : '#fff'};color:${open ? accentColor : '#768594'};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;padding:0;`)}
          >⚙</button>
        </div>
      </div>
      {open && children}
    </div>
  );
}

function StyleSubPanel({ accentColor, borderColor, borderWidth, labelColor, labelSize, onBorderColor, onBorderWidth, onLabelColor, onLabelSize }) {
  const hasBorder = borderColor !== undefined;
  return (
    <div style={{ ...css('padding:10px 11px 12px;border-top:1px solid #f0f0f0;display:flex;flex-direction:column;gap:10px;'), background: accentColor + '1a' }}>
      {hasBorder && (
        <div style={css('display:flex;flex-direction:column;gap:5px;')}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: accentColor }}>Bordi</span>
          <div style={css('display:flex;align-items:center;gap:8px;')}>
            <label style={css('display:flex;align-items:center;gap:5px;font-size:12px;color:#5c6f82;font-weight:600;cursor:pointer;')}>
              <input type="color" value={borderColor} onChange={(e) => onBorderColor(e.target.value)}
                style={css('width:26px;height:26px;padding:0;border:1px solid #c5c7c9;border-radius:4px;cursor:pointer;')} />
              Colore
            </label>
            <label style={css('display:flex;align-items:center;gap:5px;font-size:12px;color:#5c6f82;font-weight:600;flex:1;')}>
              Spessore
              <input type="range" min="0.5" max="4" step="0.5" value={borderWidth}
                onChange={(e) => onBorderWidth(+e.target.value)}
                style={{ flex: 1, cursor: 'pointer', accentColor }} />
              <span style={css('font-size:11px;color:#929da9;min-width:22px;text-align:right;')}>{borderWidth}px</span>
            </label>
          </div>
        </div>
      )}
      <div style={css('display:flex;flex-direction:column;gap:5px;')}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: accentColor }}>Etichette</span>
        <div style={css('display:flex;align-items:center;gap:8px;')}>
          <label style={css('display:flex;align-items:center;gap:5px;font-size:12px;color:#5c6f82;font-weight:600;cursor:pointer;')}>
            <input type="color" value={labelColor} onChange={(e) => onLabelColor(e.target.value)}
              style={css('width:26px;height:26px;padding:0;border:1px solid #c5c7c9;border-radius:4px;cursor:pointer;')} />
            Colore
          </label>
          <label style={css('display:flex;align-items:center;gap:5px;font-size:12px;color:#5c6f82;font-weight:600;flex:1;')}>
            Dim.
            <input type="range" min="8" max="18" step="1" value={labelSize}
              onChange={(e) => onLabelSize(+e.target.value)}
              style={{ flex: 1, cursor: 'pointer', accentColor }} />
            <span style={css('font-size:11px;color:#929da9;min-width:22px;text-align:right;')}>{labelSize}px</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function SettingsTab({ s, v, onMetric, onToggle, onSetHeatColor, onSetAuto, onBasemap, onFilter, onSetLayerStyle }) {
  const [draftStops, setDraftStops] = useState(v.heatStops);
  const [selIdx, setSelIdx] = useState(0);
  const [dragIdx, setDragIdx] = useState(null);
  const [comuniOpen, setComuniOpen] = useState(false);  const [muniOpen, setMuniOpen] = useState(false);
  const [quartieriOpen, setQuartieriOpen] = useState(false);
  const [frazOpen, setFrazOpen] = useState(false);  const barRef = useRef(null);
  const draftRef = useRef(draftStops);
  useEffect(() => { draftRef.current = draftStops; }, [draftStops]);

  useEffect(() => { setDraftStops(v.heatStops); setSelIdx(0); }, [s.metric]);

  useEffect(() => {
    if (dragIdx === null) return;
    const onMove = (e) => {
      const bar = barRef.current; if (!bar) return;
      const rect = bar.getBoundingClientRect();
      let pos = (e.clientX - rect.left) / rect.width;
      setDraftStops((prev) => {
        const next = [...prev];
        const lo = dragIdx > 0 ? prev[dragIdx - 1].pos + 0.005 : 0;
        const hi = dragIdx < prev.length - 1 ? prev[dragIdx + 1].pos - 0.005 : 1;
        next[dragIdx] = { ...next[dragIdx], pos: Math.max(lo, Math.min(hi, pos)) };
        return next;
      });
    };
    const onUp = () => { onSetHeatColor(draftRef.current); setDragIdx(null); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [dragIdx]);

  const gradCss = draftStops
    ? `linear-gradient(90deg, ${draftStops.map((st) => `${st.hex} ${(st.pos * 100).toFixed(1)}%`).join(', ')})`
    : '#ebeced';

  const handleBarClick = (e) => {
    if (!barRef.current || !draftStops || draftStops.length >= 5) return;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.max(0.005, Math.min(0.995, (e.clientX - rect.left) / rect.width));
    const hex = sampleGradient(draftStops, pos);
    const newStop = { pos, hex };
    const next = [...draftStops, newStop].sort((a, b) => a.pos - b.pos);
    const newIdx = next.indexOf(newStop);
    setDraftStops(next); setSelIdx(newIdx); onSetHeatColor(next);
  };

  const handleColorChange = (hex) => {
    const next = draftStops.map((st, i) => i === selIdx ? { ...st, hex } : st);
    setDraftStops(next); onSetHeatColor(next);
  };

  const handleDelete = () => {
    if (!draftStops || draftStops.length <= 2 || selIdx === 0 || selIdx === draftStops.length - 1) return;
    const next = draftStops.filter((_, i) => i !== selIdx);
    setDraftStops(next); setSelIdx(Math.min(selIdx, next.length - 1)); onSetHeatColor(next);
  };

  return (
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:18px;')}>
      <div style={css('display:flex;flex-direction:column;gap:8px;')}>
        <button onClick={() => onToggle('heatmap')} style={rowStyle()}><span>Heatmap dati</span><span style={pill(s.heatmap)}>{s.heatmap ? 'ON' : 'OFF'}</span></button>
        <button onClick={() => onToggle('grid')} style={rowStyle()}><span>Griglia H3</span><span style={pill(s.grid)}>{s.grid ? 'ON' : 'OFF'}</span></button>
      </div>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:8px;')}>Metrica heatmap città</div>
        <div style={css('display:flex;gap:5px;flex-wrap:wrap;')}>
          <button onClick={() => onMetric('out')} style={segStyle(s.metric === 'out')}>Uscenti</button>
          <button onClick={() => onMetric('inc')} style={segStyle(s.metric === 'inc')}>Entranti</button>
          <button onClick={() => onMetric('internal')} style={segStyle(s.metric === 'internal')}>Interno</button>
          <button onClick={() => onMetric('co2')} style={segStyle(s.metric === 'co2')}>CO₂</button>
        </div>
      </div>
      <div>
        <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;')}>
          <span style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>Gradiente — {v.metricLabelShort}</span>
          <span style={css('font-size:12.5px;font-weight:700;color:#003366;')}>{v.heatModeName}</span>
        </div>
        <div style={css('font-size:10px;color:#a3adb7;margin-bottom:10px;')}>Click sulla barra per aggiungere stop (max 5). Ogni metrica salva il proprio gradiente.</div>
        <div style={css('position:relative;margin-bottom:20px;')}>
          <div
            ref={barRef}
            onClick={handleBarClick}
            style={{ height: 28, borderRadius: 4, background: gradCss, cursor: draftStops && draftStops.length < 5 ? 'crosshair' : 'default', border: '1px solid #dce1e6', boxSizing: 'border-box' }}
          />
          {draftStops && draftStops.map((st, i) => {
            const isFirst = i === 0, isLast = i === draftStops.length - 1;
            const isSel = i === selIdx;
            return (
              <div
                key={i}
                onMouseDown={(!isFirst && !isLast) ? (e) => { e.stopPropagation(); e.preventDefault(); setSelIdx(i); setDragIdx(i); } : undefined}
                onClick={(e) => { e.stopPropagation(); setSelIdx(i); }}
                style={{
                  position: 'absolute', left: `${(st.pos * 100).toFixed(2)}%`, top: '50%',
                  transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%',
                  background: st.hex, boxSizing: 'border-box',
                  border: isSel ? '2.5px solid #003366' : '2px solid #fff',
                  boxShadow: isSel ? '0 0 0 1.5px #003366' : '0 1px 3px rgba(0,0,0,.35)',
                  cursor: (!isFirst && !isLast) ? 'ew-resize' : 'pointer', zIndex: isSel ? 2 : 1,
                }}
              />
            );
          })}
        </div>
        <div style={css('display:flex;align-items:center;gap:8px;')}>
          <button onClick={() => { setDraftStops(v.heatDefaultStops); setSelIdx(0); onSetAuto(); }} style={autoChip(!s.heatColors[s.metric])}>Auto</button>
          <label style={css('display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;')}>
            <input
              type="color"
              value={draftStops ? (draftStops[selIdx]?.hex || '#000000') : '#000000'}
              onChange={(e) => handleColorChange(e.target.value)}
              style={css('width:28px;height:28px;padding:0;border:1px solid #c5c7c9;border-radius:4px;cursor:pointer;')}
            />
            <span style={css('font-size:11px;color:#768594;font-weight:600;')}>
              Stop {selIdx + 1}/{draftStops ? draftStops.length : 0}
            </span>
          </label>
          {draftStops && draftStops.length > 2 && selIdx > 0 && selIdx < draftStops.length - 1 && (
            <button onClick={handleDelete} style={css('height:28px;padding:0 10px;border-radius:4px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid #cc334d;background:#fff;color:#cc334d;')}>×</button>
          )}
        </div>
      </div>
      <div>
        <div style={css('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;margin-bottom:8px;')}>Confini e Etichette</div>
        <div style={css('display:flex;flex-direction:column;gap:6px;')}>

          {/* ── Comuni (Provincia) ── */}
          <LayerRow label="Comuni (Prov. Roma)" accentColor="#7c3aed" open={comuniOpen} onToggleOpen={() => setComuniOpen((o) => !o)}
            pills={[
              { label: 'Bordi', active: s.showComuniBounds, onClick: () => onToggle('showComuniBounds') },
              { label: 'Etichette', active: s.showComuniLabels, onClick: () => onToggle('showComuniLabels') },
            ]}
          >
            <StyleSubPanel accentColor="#7c3aed"
              borderColor={s.comuniBorderColor} borderWidth={s.comuniBorderWidth}
              labelColor={s.comuniLabelColor} labelSize={s.comuniLabelSize}
              onBorderColor={(v) => onSetLayerStyle('comuniBorderColor', v)}
              onBorderWidth={(v) => onSetLayerStyle('comuniBorderWidth', v)}
              onLabelColor={(v) => onSetLayerStyle('comuniLabelColor', v)}
              onLabelSize={(v) => onSetLayerStyle('comuniLabelSize', v)}
            />
          </LayerRow>

          {/* ── Municipi ── */}
          <LayerRow label="Municipi (Comune di Roma)" accentColor="#003366" open={muniOpen} onToggleOpen={() => setMuniOpen((o) => !o)}
            pills={[
              { label: 'Bordi', active: s.showMuniBounds, onClick: () => onToggle('showMuniBounds') },
              { label: 'Etichette', active: s.showMuniLabels, onClick: () => onToggle('showMuniLabels') },
            ]}
          >
            <StyleSubPanel accentColor="#003366"
              borderColor={s.muniBorderColor} borderWidth={s.muniBorderWidth}
              labelColor={s.muniLabelColor} labelSize={s.muniLabelSize}
              onBorderColor={(v) => onSetLayerStyle('muniBorderColor', v)}
              onBorderWidth={(v) => onSetLayerStyle('muniBorderWidth', v)}
              onLabelColor={(v) => onSetLayerStyle('muniLabelColor', v)}
              onLabelSize={(v) => onSetLayerStyle('muniLabelSize', v)}
            />
          </LayerRow>

          {/* ── Quartieri ── */}
          <LayerRow label="Quartieri (Comune di Roma)" accentColor="#3c64a0" open={quartieriOpen} onToggleOpen={() => setQuartieriOpen((o) => !o)}
            pills={[
              { label: 'Bordi', active: s.showQuartieriBounds, onClick: () => onToggle('showQuartieriBounds') },
              { label: 'Etichette', active: s.showQuartieriLabels, onClick: () => onToggle('showQuartieriLabels') },
            ]}
          >
            <StyleSubPanel accentColor="#3c64a0"
              borderColor={s.quartieriBorderColor} borderWidth={s.quartieriBorderWidth}
              labelColor={s.quartieriLabelColor} labelSize={s.quartieriLabelSize}
              onBorderColor={(v) => onSetLayerStyle('quartieriBorderColor', v)}
              onBorderWidth={(v) => onSetLayerStyle('quartieriBorderWidth', v)}
              onLabelColor={(v) => onSetLayerStyle('quartieriLabelColor', v)}
              onLabelSize={(v) => onSetLayerStyle('quartieriLabelSize', v)}
            />
          </LayerRow>

          {/* ── Frazioni (solo etichette) ── */}
          <LayerRow label="Frazioni (Comune di Roma)" accentColor="#004640" open={frazOpen} onToggleOpen={() => setFrazOpen((o) => !o)}
            pills={[
              { label: 'Etichette', active: s.showFrazioni, onClick: () => onToggle('showFrazioni') },
            ]}
          >
            <StyleSubPanel accentColor="#004640"
              labelColor={s.frazLabelColor} labelSize={s.frazLabelSize}
              onLabelColor={(v) => onSetLayerStyle('frazLabelColor', v)}
              onLabelSize={(v) => onSetLayerStyle('frazLabelSize', v)}
            />
          </LayerRow>

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
    </div>
  );
}
