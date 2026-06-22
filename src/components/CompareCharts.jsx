import React, { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { css } from '../utils/css.js';

// ── SVG layout constants ─────────────────────────────────────────────────────
const VW = 300, VH = 140;
const ML = 44, MR = 10, MT = 10, MB = 28;
const CW = VW - ML - MR;   // 246
const CH = VH - MT - MB;   // 102

// Bar-chart layout (slightly taller bottom margin for group labels)
const BML = 44, BMR = 10, BMT = 14, BMB = 36;
const BCW = VW - BML - BMR;
const BCH = VH - BMT - BMB;   // 90

// Map a value → SVG x/y pixel inside the chart area
const px = (v, mn, mx) => ML + Math.max(0, Math.min(1, mx > mn ? (v - mn) / (mx - mn) : 0)) * CW;
const py = (v, mn, mx) => MT + (1 - Math.max(0, Math.min(1, mx > mn ? (v - mn) / (mx - mn) : 0))) * CH;

const fmtNum = (n) => {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'k';
  return Math.round(n).toString();
};
const fmtT = (n) => (n >= 10 ? n.toFixed(0) : n.toFixed(1));
const fmtPct = (n) => (n >= 10 ? n.toFixed(0) : n.toFixed(1)) + '%';

// Series math helpers
const smooth5 = (bins) => bins.map((_, i) => {
  let s = 0, c = 0;
  for (let j = Math.max(0, i - 2); j <= Math.min(bins.length - 1, i + 2); j++) { s += bins[j]; c++; }
  return s / c;
});
const sumArr = (arr) => arr.reduce((a, b) => a + b, 0);
const cumsum = (arr) => { let c = 0; return arr.map((v) => (c += v)); };

// ── Small reusables ──────────────────────────────────────────────────────────
function DlBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Scarica PNG"
      style={css('border:none;background:none;cursor:pointer;padding:3px;color:#a3adb7;display:flex;align-items:center;border-radius:4px;')}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}

// Segmented toggle control
function Seg({ options, value, onChange }) {
  return (
    <div style={css('display:inline-flex;border:1px solid #e1e4e8;border-radius:5px;overflow:hidden;background:#fff;')}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              border: 'none',
              borderLeft: o.first ? 'none' : '1px solid #e1e4e8',
              background: active ? '#003366' : '#fff',
              color: active ? '#fff' : '#5c6f82',
              fontFamily: 'inherit',
              fontSize: '9.5px',
              fontWeight: 600,
              padding: '3px 9px',
              cursor: 'pointer',
              lineHeight: 1.4,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Direction (entrante/uscente) + scale (assoluto/proporzione) controls
function ChartControls({ dir, setDir, scale, setScale, showDir = true, showScale = true }) {
  return (
    <div style={css('display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;')}>
      {showDir && (
        <Seg
          value={dir}
          onChange={setDir}
          options={[{ value: 'in', label: 'Entrante', first: true }, { value: 'out', label: 'Uscente' }]}
        />
      )}
      {showScale && (
        <Seg
          value={scale}
          onChange={setScale}
          options={[{ value: 'abs', label: 'Assoluto', first: true }, { value: 'prop', label: 'Proporzione' }]}
        />
      )}
    </div>
  );
}

function useDl(ref, filename) {
  return useCallback(() => {
    if (!ref.current) return;
    html2canvas(ref.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true }).then((canvas) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename + '.png'; a.click();
        URL.revokeObjectURL(url);
      });
    });
  }, [ref, filename]);
}

function ChartCard({ refEl, title, sub, onDl, controls, children }) {
  return (
    <div ref={refEl} style={css('background:#fff;border:1px solid #ebeced;border-radius:8px;padding:13px;')}>
      <div style={css('display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:5px;')}>
        <div>
          <div style={css('font-size:13px;font-weight:700;color:#003366;')}>{title}</div>
          {sub && <div style={css('font-size:10.5px;color:#929da9;')}>{sub}</div>}
        </div>
        <DlBtn onClick={onDl} />
      </div>
      {controls}
      {children}
    </div>
  );
}

function LegendLine({ aLabel, bLabel, aColor, bColor }) {
  return (
    <div style={css('display:flex;gap:14px;margin-bottom:6px;flex-wrap:wrap;')}>
      <div style={css('display:flex;align-items:center;gap:5px;font-size:10px;color:#17324d;max-width:160px;')}>
        <svg width="20" height="8" style={{ flex: 'none' }}>
          <line x1="0" y1="4" x2="20" y2="4" stroke={aColor} strokeWidth="2.5" />
        </svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aLabel}</span>
      </div>
      {bLabel && (
        <div style={css('display:flex;align-items:center;gap:5px;font-size:10px;color:#17324d;max-width:160px;')}>
          <svg width="20" height="8" style={{ flex: 'none' }}>
            <line x1="0" y1="4" x2="20" y2="4" stroke={bColor} strokeWidth="2.5" strokeDasharray="5,2" />
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Shared SVG axes ───────────────────────────────────────────────────────────
function Axes() {
  return (
    <>
      <line x1={ML} y1={MT} x2={ML} y2={MT + CH} stroke="#d9dadb" strokeWidth="1" />
      <line x1={ML} y1={MT + CH} x2={ML + CW} y2={MT + CH} stroke="#d9dadb" strokeWidth="1" />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CompareCharts({ charts, sectionTitle = 'Analisi comparativa' }) {
  const ref1 = useRef(null), ref2 = useRef(null), ref3 = useRef(null), ref4 = useRef(null);
  const dl1 = useDl(ref1, 'confronto_flussi');
  const dl2 = useDl(ref2, 'distribuzione_distanza');
  const dl3 = useDl(ref3, 'curva_cdf');
  const dl4 = useDl(ref4, 'smart_working');

  // Per-chart toggle state (direction + scale)
  const [scale1, setScale1] = useState('abs');
  const [dir2, setDir2] = useState('in'), [scale2, setScale2] = useState('abs');
  const [dir3, setDir3] = useState('in');
  const [dir4, setDir4] = useState('in');

  if (!charts) return null;

  const { aLabel, bLabel, aColor = '#cc7a00', bColor = '#089994', binCenters, binsIn, binsOut, co2, swLevels, totals } = charts;
  const hasB = !!bLabel;
  const dirLabel = (d) => (d === 'in' ? 'entrante' : 'uscente');

  // ── Chart 1: Grouped bar chart (flussi totali) ──────────────────────────────
  const baseGroups = [
    { label: 'Entrate', aVal: totals.aIn,    bVal: totals.bIn    },
    { label: 'Uscite',  aVal: totals.aOut,   bVal: totals.bOut   },
    { label: 'Interni', aVal: totals.aIntra, bVal: totals.bIntra },
  ].filter((g) => g.aVal > 0 || g.bVal > 0);

  const totA1 = (totals.aIn + totals.aOut + totals.aIntra) || 1;
  const totB1 = (totals.bIn + totals.bOut + totals.bIntra) || 1;
  const isProp1 = scale1 === 'prop';
  const barGroups = isProp1
    ? baseGroups.map((g) => ({ label: g.label, aVal: g.aVal / totA1 * 100, bVal: g.bVal / totB1 * 100 }))
    : baseGroups;
  const fmtBar = isProp1 ? fmtPct : fmtNum;

  const maxBar  = Math.max(...barGroups.flatMap((g) => [g.aVal, g.bVal]), 1);
  const nGroups = barGroups.length || 1;
  const gW      = BCW / nGroups;
  const barW    = Math.min(22, gW * 0.28);
  const barGap  = barW * 0.45;
  const pyB     = (v) => BMT + (1 - v / maxBar) * BCH;
  const bhB     = (v) => Math.max(1, (v / maxBar) * BCH);
  const yTicks1 = [0, 0.5, 1].map((t) => ({ y: BMT + (1 - t) * BCH, label: fmtBar(t * maxBar) }));

  // ── Chart 2: Flow by distance (direction + scale) ───────────────────────────
  const a2raw = smooth5(dir2 === 'in' ? binsIn.a : binsOut.a);
  const b2raw = hasB ? smooth5(dir2 === 'in' ? binsIn.b : binsOut.b) : null;
  const isProp2 = scale2 === 'prop';
  const a2tot = sumArr(a2raw) || 1, b2tot = b2raw ? (sumArr(b2raw) || 1) : 1;
  const aIn = isProp2 ? a2raw.map((v) => v / a2tot * 100) : a2raw;
  const bIn = b2raw ? (isProp2 ? b2raw.map((v) => v / b2tot * 100) : b2raw) : null;
  const fmt2 = isProp2 ? fmtPct : fmtNum;

  const maxIn  = Math.max(...aIn, ...(bIn || []), isProp2 ? 0.1 : 1);
  const yGrid2 = [0, maxIn * 0.5, maxIn].map((v) => ({ v, y: py(v, 0, maxIn), label: fmt2(v) }));
  const aInPts  = binCenters.map((d, i) => `${px(d, 0, 30).toFixed(1)},${py(aIn[i], 0, maxIn).toFixed(1)}`).join(' ');
  const bInPts  = bIn ? binCenters.map((d, i) => `${px(d, 0, 30).toFixed(1)},${py(bIn[i], 0, maxIn).toFixed(1)}`).join(' ') : null;
  const aInArea = `${px(binCenters[0], 0, 30).toFixed(1)},${py(0, 0, maxIn).toFixed(1)} ${aInPts} ${px(binCenters[binCenters.length - 1], 0, 30).toFixed(1)},${py(0, 0, maxIn).toFixed(1)}`;

  // ── Chart 3: CDF (direction + scale) ─────────────────────────────────────────
  const a3raw = dir3 === 'in' ? binsIn.a : binsOut.a;
  const b3raw = hasB ? (dir3 === 'in' ? binsIn.b : binsOut.b) : null;
  const isProp3 = false;
  const a3cum = cumsum(a3raw), a3tot = a3cum[a3cum.length - 1] || 1;
  const b3cum = b3raw ? cumsum(b3raw) : null, b3tot = b3cum ? (b3cum[b3cum.length - 1] || 1) : 1;
  const aCDF = isProp3 ? a3cum.map((v) => v / a3tot * 100) : a3cum;
  const bCDF = b3cum ? (isProp3 ? b3cum.map((v) => v / b3tot * 100) : b3cum) : null;
  const cdfMax = isProp3 ? 100 : Math.max(aCDF[aCDF.length - 1], bCDF ? bCDF[bCDF.length - 1] : 0, 1);
  const yTicks3 = isProp3
    ? [0, 25, 50, 75, 100].map((p) => ({ y: py(p, 0, 100), label: p + '%' }))
    : [0, 0.25, 0.5, 0.75, 1].map((t) => ({ y: py(t * cdfMax, 0, cdfMax), label: fmtNum(t * cdfMax) }));
  const aCDFPts = binCenters.map((d, i) => `${px(d, 0, 30).toFixed(1)},${py(aCDF[i], 0, cdfMax).toFixed(1)}`).join(' ');
  const bCDFPts = bCDF ? binCenters.map((d, i) => `${px(d, 0, 30).toFixed(1)},${py(bCDF[i], 0, cdfMax).toFixed(1)}`).join(' ') : null;

  // ── Chart 4: Smart working (direction + scale) ───────────────────────────────
  const co2A = (dir4 === 'in' ? co2.aIn : co2.aOut) / 1e6;  // t/g baseline
  const co2B = hasB ? (dir4 === 'in' ? co2.bIn : co2.bOut) / 1e6 : 0;
  const isProp4 = false;
  const aSwCo2 = swLevels.map((p) => (isProp4 ? (1 - p / 100) * 100 : co2A * (1 - p / 100)));
  const bSwCo2 = hasB ? swLevels.map((p) => (isProp4 ? (1 - p / 100) * 100 : co2B * (1 - p / 100))) : null;
  const fmt4 = isProp4 ? ((v) => v.toFixed(0) + '%') : fmtT;
  const maxSw  = isProp4 ? 100 : Math.max(...aSwCo2, ...(bSwCo2 || []), 0.01);
  const yGrid4 = [0, maxSw * 0.5, maxSw].map((v) => ({ v, y: py(v, 0, maxSw), label: fmt4(v) }));
  const aSwPts  = swLevels.map((p, i) => `${px(p, 0, 50).toFixed(1)},${py(aSwCo2[i], 0, maxSw).toFixed(1)}`).join(' ');
  const bSwPts  = bSwCo2 ? swLevels.map((p, i) => `${px(p, 0, 50).toFixed(1)},${py(bSwCo2[i], 0, maxSw).toFixed(1)}`).join(' ') : null;
  const aSwArea = `${px(0, 0, 50).toFixed(1)},${py(0, 0, maxSw).toFixed(1)} ${aSwPts} ${px(50, 0, 50).toFixed(1)},${py(0, 0, maxSw).toFixed(1)}`;

  const xKm = [0, 5, 10, 15, 20, 25, 30];

  return (
    <div style={css('padding:0 16px 24px;display:flex;flex-direction:column;gap:15px;')}>

      {/* section header */}
      <div style={css('border-top:1px solid #ebeced;padding-top:15px;')}>
        <div style={css('font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>
          {sectionTitle}
        </div>
      </div>

      {/* ── Chart 1: Totals bar ─────────────────────────────────────────────── */}
      <ChartCard
        refEl={ref1}
        title="Confronto flussi totali"
        sub={(isProp1 ? 'Quota % sul totale' : 'Viaggi/giorno') + (hasB ? ' · Area A vs B' : '')}
        onDl={dl1}
        controls={<ChartControls showDir={false} scale={scale1} setScale={setScale1} />}
      >
        {bLabel ? (
          <div style={css('display:flex;gap:14px;margin-bottom:6px;flex-wrap:wrap;')}>
            <div style={css('display:flex;align-items:center;gap:5px;font-size:10px;color:#17324d;')}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: aColor, flex: 'none' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{aLabel}</span>
            </div>
            <div style={css('display:flex;align-items:center;gap:5px;font-size:10px;color:#17324d;')}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: bColor, flex: 'none' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{bLabel}</span>
            </div>
          </div>
        ) : (
          <div style={css('font-size:10px;color:#17324d;margin-bottom:6px;display:flex;align-items:center;gap:5px;')}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: aColor, flex: 'none' }} />
            {aLabel}
          </div>
        )}
        <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block' }}>
          {/* Y grid */}
          {yTicks1.map((t, i) => (
            <g key={i}>
              <line x1={BML} y1={t.y} x2={VW - BMR} y2={t.y} stroke={i === 0 ? '#d9dadb' : '#ebeced'} strokeWidth="0.8" />
              <text x={BML - 4} y={t.y + 3} textAnchor="end" fontFamily="Titillium Web" fontSize="8" fill="#a3adb7">{t.label}</text>
            </g>
          ))}
          {/* Bars */}
          {barGroups.map((g, gi) => {
            const cx  = BML + (gi + 0.5) * gW;
            const ay  = pyB(g.aVal), ah = bhB(g.aVal);
            const by_ = pyB(g.bVal), bh = bhB(g.bVal);
            // Single area → one centred bar; two areas → side-by-side pair
            const aW  = bLabel ? barW : Math.min(28, gW * 0.42);
            const axc = bLabel ? cx - barGap / 2 - barW / 2 : cx;
            const bxc = cx + barGap / 2 + barW / 2;
            return (
              <g key={gi}>
                <rect x={axc - aW / 2} y={ay} width={aW} height={ah} rx="2" fill={aColor} opacity="0.85" />
                {bLabel && <rect x={bxc - barW / 2} y={by_} width={barW} height={bh} rx="2" fill={bColor} opacity="0.85" />}
                <text x={axc} y={ay - 3} textAnchor="middle" fontFamily="Titillium Web" fontSize="7" fill={aColor}>{fmtBar(g.aVal)}</text>
                {bLabel && <text x={bxc} y={by_ - 3} textAnchor="middle" fontFamily="Titillium Web" fontSize="7" fill={bColor}>{fmtBar(g.bVal)}</text>}
                <text x={cx} y={VH - BMB + 10} textAnchor="middle" fontFamily="Titillium Web" fontSize="9" fontWeight="700" fill="#17324d">{g.label}</text>
              </g>
            );
          })}
          {/* Axes */}
          <line x1={BML} y1={BMT} x2={BML} y2={BMT + BCH} stroke="#d9dadb" strokeWidth="1" />
          <line x1={BML} y1={BMT + BCH} x2={VW - BMR} y2={BMT + BCH} stroke="#d9dadb" strokeWidth="1" />
        </svg>
      </ChartCard>

      {/* ── Chart 2: Flow by distance ──────────────────────────────────────── */}
      <ChartCard
        refEl={ref2}
        title={`Flusso ${dirLabel(dir2)} per distanza`}
        sub={isProp2 ? 'Quota % per fascia di distanza' : 'Distribuzione per fascia · viaggi/g'}
        onDl={dl2}
        controls={<ChartControls dir={dir2} setDir={setDir2} scale={scale2} setScale={setScale2} />}
      >
        <LegendLine aLabel={aLabel} bLabel={bLabel} aColor={aColor} bColor={bColor} />
        <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block' }}>
          {yGrid2.map((g, i) => (
            <g key={i}>
              <line x1={ML} y1={g.y} x2={VW - MR} y2={g.y} stroke={i === 0 ? '#d9dadb' : '#ebeced'} strokeWidth="0.8" />
              <text x={ML - 4} y={g.y + 3} textAnchor="end" fontFamily="Titillium Web" fontSize="8" fill="#a3adb7">{g.label}</text>
            </g>
          ))}
          {xKm.map((d, i) => (
            <text key={i} x={px(d, 0, 30)} y={VH - 6} textAnchor="middle" fontFamily="Titillium Web" fontSize="8" fill="#a3adb7">{d}</text>
          ))}
          <text x={(ML + VW - MR) / 2} y={VH - 1} textAnchor="middle" fontFamily="Titillium Web" fontSize="7" fill="#c5c7c9">km</text>
          <polygon points={aInArea} fill={aColor} opacity="0.12" />
          <polyline points={aInPts} fill="none" stroke={aColor} strokeWidth="2" strokeLinejoin="round" />
          {bInPts && <polyline points={bInPts} fill="none" stroke={bColor} strokeWidth="2" strokeLinejoin="round" strokeDasharray="5,2" />}
          <Axes />
        </svg>
      </ChartCard>

      {/* ── Chart 3: CDF ───────────────────────────────────────────────────── */}
      <ChartCard
        refEl={ref3}
        title="Curva CDF · flusso cumulato"
        sub={isProp3 ? `% traffico ${dirLabel(dir3)} entro X km` : `Traffico ${dirLabel(dir3)} cumulato · viaggi/g`}
        onDl={dl3}
        controls={<ChartControls dir={dir3} setDir={setDir3} showScale={false} />}
      >
        <LegendLine aLabel={aLabel} bLabel={bLabel} aColor={aColor} bColor={bColor} />
        <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block' }}>
          {yTicks3.map((g, i) => (
            <g key={i}>
              <line x1={ML} y1={g.y} x2={VW - MR} y2={g.y} stroke="#ebeced" strokeWidth="0.8" />
              <text x={ML - 4} y={g.y + 3} textAnchor="end" fontFamily="Titillium Web" fontSize="8" fill="#a3adb7">{g.label}</text>
            </g>
          ))}
          {/* Reference lines at 50 / 80 / 90 % (proportion mode only) */}
          {isProp3 && [50, 80, 90].map((pct) => (
            <g key={pct}>
              <line x1={ML} y1={py(pct, 0, 100)} x2={VW - MR} y2={py(pct, 0, 100)} stroke="#c5c7c9" strokeWidth="0.8" strokeDasharray="3,2" />
              <text x={VW - MR - 2} y={py(pct, 0, 100) - 2} textAnchor="end" fontFamily="Titillium Web" fontSize="7.5" fill="#929da9">{pct}%</text>
            </g>
          ))}
          {xKm.map((d, i) => (
            <text key={i} x={px(d, 0, 30)} y={VH - 6} textAnchor="middle" fontFamily="Titillium Web" fontSize="8" fill="#a3adb7">{d}</text>
          ))}
          <text x={(ML + VW - MR) / 2} y={VH - 1} textAnchor="middle" fontFamily="Titillium Web" fontSize="7" fill="#c5c7c9">km</text>
          <polyline points={aCDFPts} fill="none" stroke={aColor} strokeWidth="2" strokeLinejoin="round" />
          {bCDFPts && <polyline points={bCDFPts} fill="none" stroke={bColor} strokeWidth="2" strokeLinejoin="round" strokeDasharray="5,2" />}
          <Axes />
        </svg>
      </ChartCard>

      {/* ── Chart 4: Smart working ──────────────────────────────────────────── */}
      <ChartCard
        refEl={ref4}
        title="Impatto smart working"
        sub={isProp4 ? `CO₂ ${dirLabel(dir4)} · % rispetto al baseline` : `CO₂ ${dirLabel(dir4)} t/g · al variare del tasso SW`}
        onDl={dl4}
        controls={<ChartControls dir={dir4} setDir={setDir4} showScale={false} />}
      >
        <LegendLine aLabel={aLabel} bLabel={bLabel} aColor={aColor} bColor={bColor} />
        <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block' }}>
          {yGrid4.map((g, i) => (
            <g key={i}>
              <line x1={ML} y1={g.y} x2={VW - MR} y2={g.y} stroke={i === 0 ? '#d9dadb' : '#ebeced'} strokeWidth="0.8" />
              <text x={ML - 4} y={g.y + 3} textAnchor="end" fontFamily="Titillium Web" fontSize="8" fill="#a3adb7">{g.label}</text>
            </g>
          ))}
          {swLevels.map((p, i) => (
            <text key={i} x={px(p, 0, 50)} y={VH - 6} textAnchor="middle" fontFamily="Titillium Web" fontSize="8" fill="#a3adb7">{p}%</text>
          ))}
          {/* 20% reference */}
          <line x1={px(20, 0, 50)} y1={MT} x2={px(20, 0, 50)} y2={MT + CH} stroke="#c5c7c9" strokeWidth="0.8" strokeDasharray="3,2" />
          <text x={px(20, 0, 50)} y={MT - 2} textAnchor="middle" fontFamily="Titillium Web" fontSize="7" fill="#929da9">20%</text>
          <polygon points={aSwArea} fill={aColor} opacity="0.12" />
          <polyline points={aSwPts} fill="none" stroke={aColor} strokeWidth="2" strokeLinejoin="round" />
          {bSwPts && <polyline points={bSwPts} fill="none" stroke={bColor} strokeWidth="2" strokeLinejoin="round" strokeDasharray="5,2" />}
          <Axes />
        </svg>
      </ChartCard>

    </div>
  );
}
