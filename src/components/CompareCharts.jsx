import React, { useRef, useCallback } from 'react';
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

function ChartCard({ refEl, title, sub, onDl, children }) {
  return (
    <div ref={refEl} style={css('background:#fff;border:1px solid #ebeced;border-radius:8px;padding:13px;')}>
      <div style={css('display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:5px;')}>
        <div>
          <div style={css('font-size:13px;font-weight:700;color:#003366;')}>{title}</div>
          {sub && <div style={css('font-size:10.5px;color:#929da9;')}>{sub}</div>}
        </div>
        <DlBtn onClick={onDl} />
      </div>
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
export default function CompareCharts({ charts }) {
  const ref1 = useRef(null), ref2 = useRef(null), ref3 = useRef(null), ref4 = useRef(null);
  const dl1 = useDl(ref1, 'confronto_flussi');
  const dl2 = useDl(ref2, 'distribuzione_distanza');
  const dl3 = useDl(ref3, 'curva_cdf');
  const dl4 = useDl(ref4, 'smart_working');

  if (!charts) return null;

  const { aLabel, bLabel, aColor = '#cc7a00', bColor = '#089994', binCenters, aIn, bIn, aCDF, bCDF, swLevels, aSwCo2, bSwCo2, totals } = charts;

  // ── Chart 1: Grouped bar chart (flussi totali) ──────────────────────────────
  const barGroups = [
    { label: 'Entrate', aVal: totals.aIn,    bVal: totals.bIn    },
    { label: 'Uscite',  aVal: totals.aOut,   bVal: totals.bOut   },
    { label: 'Interni', aVal: totals.aIntra, bVal: totals.bIntra },
  ].filter(g => g.aVal > 0 || g.bVal > 0);

  const maxBar  = Math.max(...barGroups.flatMap(g => [g.aVal, g.bVal]), 1);
  const nGroups = barGroups.length || 1;
  const gW      = BCW / nGroups;
  const barW    = Math.min(22, gW * 0.28);
  const barGap  = barW * 0.45;
  const pyB     = (v) => BMT + (1 - v / maxBar) * BCH;
  const bhB     = (v) => Math.max(1, (v / maxBar) * BCH);
  const yTicks1 = [0, 0.5, 1].map(t => ({ y: BMT + (1 - t) * BCH, label: fmtNum(t * maxBar) }));

  // ── Chart 2: Inflow by distance ─────────────────────────────────────────────
  const maxIn  = Math.max(...aIn, ...(bIn || []), 1);
  const yGrid2 = [0, maxIn * 0.5, maxIn].map(v => ({ v, y: py(v, 0, maxIn), label: fmtNum(v) }));
  const aInPts  = binCenters.map((d, i) => `${px(d, 0, 30).toFixed(1)},${py(aIn[i], 0, maxIn).toFixed(1)}`).join(' ');
  const bInPts  = bIn  ? binCenters.map((d, i) => `${px(d, 0, 30).toFixed(1)},${py(bIn[i],  0, maxIn).toFixed(1)}`).join(' ') : null;
  const aInArea = `${px(binCenters[0], 0, 30).toFixed(1)},${py(0, 0, maxIn).toFixed(1)} ${aInPts} ${px(binCenters[binCenters.length - 1], 0, 30).toFixed(1)},${py(0, 0, maxIn).toFixed(1)}`;

  // ── Chart 3: CDF ─────────────────────────────────────────────────────────────
  const aCDFPts = binCenters.map((d, i) => `${px(d, 0, 30).toFixed(1)},${py(aCDF[i], 0, 100).toFixed(1)}`).join(' ');
  const bCDFPts = bCDF ? binCenters.map((d, i) => `${px(d, 0, 30).toFixed(1)},${py(bCDF[i], 0, 100).toFixed(1)}`).join(' ') : null;

  // ── Chart 4: Smart working ────────────────────────────────────────────────────
  const maxSw  = Math.max(...aSwCo2, ...(bSwCo2 || []), 0.01);
  const yGrid4 = [0, maxSw * 0.5, maxSw].map(v => ({ v, y: py(v, 0, maxSw), label: fmtT(v) }));
  const aSwPts  = swLevels.map((p, i) => `${px(p, 0, 50).toFixed(1)},${py(aSwCo2[i], 0, maxSw).toFixed(1)}`).join(' ');
  const bSwPts  = bSwCo2 ? swLevels.map((p, i) => `${px(p, 0, 50).toFixed(1)},${py(bSwCo2[i], 0, maxSw).toFixed(1)}`).join(' ') : null;
  const aSwArea = `${px(0, 0, 50).toFixed(1)},${py(0, 0, maxSw).toFixed(1)} ${aSwPts} ${px(50, 0, 50).toFixed(1)},${py(0, 0, maxSw).toFixed(1)}`;

  const xKm = [0, 5, 10, 15, 20, 25, 30];

  return (
    <div style={css('padding:0 16px 24px;display:flex;flex-direction:column;gap:15px;')}>

      {/* section header */}
      <div style={css('border-top:1px solid #ebeced;padding-top:15px;')}>
        <div style={css('font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#5c6f82;')}>
          Analisi comparativa
        </div>
      </div>

      {/* ── Chart 1: Totals bar ─────────────────────────────────────────────── */}
      <ChartCard refEl={ref1} title="Confronto flussi totali" sub="Viaggi/giorno · Area A vs B" onDl={dl1}>
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
            const axc = cx - barGap / 2 - barW / 2;
            const bxc = cx + barGap / 2 + barW / 2;
            return (
              <g key={gi}>
                <rect x={axc - barW / 2} y={ay} width={barW} height={ah} rx="2" fill={aColor} opacity="0.85" />
                {bLabel && <rect x={bxc - barW / 2} y={by_} width={barW} height={bh} rx="2" fill={bColor} opacity="0.85" />}
                <text x={axc} y={ay - 3} textAnchor="middle" fontFamily="Titillium Web" fontSize="7" fill={aColor}>{fmtNum(g.aVal)}</text>
                {bLabel && <text x={bxc} y={by_ - 3} textAnchor="middle" fontFamily="Titillium Web" fontSize="7" fill={bColor}>{fmtNum(g.bVal)}</text>}
                <text x={cx} y={VH - BMB + 10} textAnchor="middle" fontFamily="Titillium Web" fontSize="9" fontWeight="700" fill="#17324d">{g.label}</text>
              </g>
            );
          })}
          {/* Axes */}
          <line x1={BML} y1={BMT} x2={BML} y2={BMT + BCH} stroke="#d9dadb" strokeWidth="1" />
          <line x1={BML} y1={BMT + BCH} x2={VW - BMR} y2={BMT + BCH} stroke="#d9dadb" strokeWidth="1" />
        </svg>
      </ChartCard>

      {/* ── Chart 2: Inflow by distance ────────────────────────────────────── */}
      <ChartCard refEl={ref2} title="Flusso entrante per distanza" sub="Distribuzione per fascia · viaggi/g" onDl={dl2}>
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
      <ChartCard refEl={ref3} title="Curva CDF · flusso cumulato" sub="% traffico entrante catturato entro X km" onDl={dl3}>
        <LegendLine aLabel={aLabel} bLabel={bLabel} aColor={aColor} bColor={bColor} />
        <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block' }}>
          {[0, 25, 50, 75, 100].map((pct, i) => (
            <g key={i}>
              <line x1={ML} y1={py(pct, 0, 100)} x2={VW - MR} y2={py(pct, 0, 100)} stroke="#ebeced" strokeWidth="0.8" />
              <text x={ML - 4} y={py(pct, 0, 100) + 3} textAnchor="end" fontFamily="Titillium Web" fontSize="8" fill="#a3adb7">{pct}%</text>
            </g>
          ))}
          {/* Reference lines at 50 / 80 / 90 % */}
          {[50, 80, 90].map(pct => (
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
      <ChartCard refEl={ref4} title="Impatto smart working" sub="CO₂ entrante t/g · al variare del tasso SW" onDl={dl4}>
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
