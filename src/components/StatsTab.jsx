import React, { useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { css } from '../utils/css.js';
import RankList from './RankList.jsx';

export default function StatsTab({ v, s, onClearPoint }) {
  const catchmentRef = useRef(null);
  const co2BarsRef = useRef(null);
  const modalRef = useRef(null);
  const scenariRef = useRef(null);
  const smartRef = useRef(null);
  const downloadChart = useCallback((ref, filename) => {
    if (!ref.current) return;
    html2canvas(ref.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true }).then((canvas) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename + '.png'; a.click();
        URL.revokeObjectURL(url);
      });
    });
  }, []);
  const dlBtn = (ref, filename) => (
    <button onClick={() => downloadChart(ref, filename)} title="Scarica PNG" style={css('border:none;background:none;cursor:pointer;padding:3px;color:#a3adb7;display:flex;align-items:center;border-radius:4px;')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </button>
  );
  const kpi = (label, val, color) => (
    <div style={css('background:#fff;padding:13px 14px;')}>
      <div style={css('font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#768594;')}>{label}</div>
      <div style={{ fontFamily: "'Lora',serif", fontSize: '24px', fontWeight: 600, color, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
    </div>
  );

  return (
    <div>
      {v.hasCatchment ? (
        <div ref={catchmentRef} style={css('padding:14px 16px;border-bottom:1px solid #ebeced;display:flex;flex-direction:column;gap:14px;')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;')}>
            <div>
              <div style={css('font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#089994;')}>{v.selKind}</div>
              <div style={css('font-size:14px;font-weight:700;color:#003366;')}>{v.selName}</div>
              <div style={css("font-size:11px;color:#929da9;font-family:'Roboto Mono',monospace;")}>{v.selSub}</div>
              {v.muniRank && <div style={css('display:inline-block;margin-top:5px;padding:2px 8px;border-radius:12px;background:#fff3e0;font-size:10.5px;font-weight:700;color:#cc7a00;')}>{v.muniRank}° su {v.muniRankOf} per emissioni CO₂</div>}
            </div>
            <div style={css('display:flex;align-items:center;gap:6px;')}>
              {dlBtn(catchmentRef, 'bacino_' + (v.selName || 'area').toLowerCase().replace(/\s+/g, '_'))}
              <button onClick={onClearPoint} style={css('height:28px;padding:0 11px;border:1px solid #ebeced;background:#fff;border-radius:4px;cursor:pointer;color:#5c6f82;font-family:inherit;font-size:12.5px;font-weight:600;')}>Azzera</button>
            </div>
          </div>
          <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;')}>
            <div style={css('background:#f6e4c8;border-radius:4px;padding:8px 10px;')}>
              <div style={css('font-size:9px;color:#995c00;font-weight:600;letter-spacing:.03em;')}>{v.inLabel}</div>
              <div style={css("font-family:'Lora',serif;font-size:18px;font-weight:600;color:#995c00;font-variant-numeric:tabular-nums;")}>{v.totIn}</div>
            </div>
            <div style={css('background:#ccfffd;border-radius:4px;padding:8px 10px;')}>
              <div style={css('font-size:9px;color:#077f7b;font-weight:600;letter-spacing:.03em;')}>{v.outLabel}</div>
              <div style={css("font-family:'Lora',serif;font-size:18px;font-weight:600;color:#05615e;font-variant-numeric:tabular-nums;")}>{v.totOut}</div>
            </div>
            <div style={css('background:#e8f7f1;border-radius:4px;padding:8px 10px;')}>
              <div style={css('font-size:9px;color:#005c35;font-weight:600;letter-spacing:.03em;')}>INTERNI</div>
              <div style={css("font-family:'Lora',serif;font-size:18px;font-weight:600;color:#005c35;font-variant-numeric:tabular-nums;")}>{v.totIntra}</div>
            </div>
          </div>
          {s && s.catchCo2 && <div style={css('font-size:11px;color:#a3adb7;margin-top:-4px;line-height:1.35;')}>{v.intraNote}</div>}
          <RankList title="Da dove arrivano" sub="origine" rows={v.topOrigins} color="#cc7a00" />
          <RankList title="Dove vanno" sub="destinazione" rows={v.topDests} color="#089994" />
        </div>
      ) : (
        <div style={css('padding:14px 16px;border-bottom:1px solid #ebeced;display:flex;gap:10px;align-items:flex-start;color:#5c6f82;')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5c6f82" strokeWidth="2" style={{ flex: 'none', marginTop: '1px' }}><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="4" /></svg>
          <span style={css('font-size:12.5px;line-height:1.4;')}>Seleziona un bacino nel tab Area per vedere le statistiche di flusso.</span>
        </div>
      )}
      <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:#ebeced;border-bottom:1px solid #ebeced;')}>
        {kpi('Spostamenti/g', v.kpiTrips, '#003366')}
        {kpi('CO₂ t/g', v.kpiCo2, '#cc7a00')}
        {kpi('Celle H3', v.kpiCells, '#17324d')}
      </div>

      <div ref={co2BarsRef} style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;')}>
          <div>
            <div style={css('font-size:15px;font-weight:700;color:#003366;')}>CO₂ per municipio</div>
            <div style={css('font-size:11.5px;color:#929da9;')}>Tonnellate/giorno · stima dai flussi pendolari</div>
          </div>
          {dlBtn(co2BarsRef, 'co2_municipio')}
        </div>
        <div style={css('display:flex;flex-direction:column;gap:7px;')}>
          {v.co2Bars.map((b, i) => (
            <div key={i} style={css('display:flex;align-items:center;gap:9px;')}>
              <span style={css('width:58px;flex:none;font-size:12px;font-weight:600;color:#17324d;')}>{b.name}</span>
              <div style={css('flex:1;height:13px;background:#ebeced;border-radius:3px;overflow:hidden;')}>
                <div style={{ height: '100%', borderRadius: '3px', background: b.color, width: b.pct + '%' }} />
              </div>
              <span style={css("width:44px;flex:none;text-align:right;font-family:'Lora',serif;font-size:13px;font-weight:600;color:#17324d;font-variant-numeric:tabular-nums;")}>{b.co2Label}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={modalRef} style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;')}>
          <div>
            <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Ripartizione modale</div>
            <div style={css('font-size:11.5px;color:#929da9;')}>Media città · pesata per popolazione</div>
          </div>
          {dlBtn(modalRef, 'ripartizione_modale')}
        </div>
        <div style={css('display:flex;align-items:center;gap:18px;')}>
          <svg width="116" height="116" viewBox="0 0 140 140" style={{ flex: 'none' }}>
            <circle cx="70" cy="70" r="50" fill="none" stroke="#ebeced" strokeWidth="18" />
            <g transform="rotate(-90 70 70)">
              {v.modalSegs.map((sg, i) => <circle key={i} cx="70" cy="70" r="50" fill="none" stroke={sg.color} strokeWidth="18" strokeDasharray={sg.dash} strokeDashoffset={sg.off} />)}
            </g>
            {v.modalSegs.map((sg, i) => (
              <text key={i} x={sg.labelX} y={sg.labelY} textAnchor="middle" dominantBaseline="middle" fontFamily="Titillium Web" fontSize="9" fontWeight="700" fill="#ffffff">{sg.pct}%</text>
            ))}
            <text x="70" y="66" textAnchor="middle" fontFamily="Lora" fontSize="26" fontWeight="600" fill="#003366">{v.modalAuto}%</text>
            <text x="70" y="82" textAnchor="middle" fontFamily="Titillium Web" fontSize="10" fontWeight="600" fill="#768594">AUTO</text>
          </svg>
          <div style={css('flex:1;display:flex;flex-direction:column;gap:9px;')}>
            {v.modalLegend.map((m, i) => (
              <div key={i} style={css('display:flex;align-items:center;gap:8px;')}>
                <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: m.color, flex: 'none' }} />
                <div style={css('flex:1;font-size:13px;color:#17324d;')}>{m.label}</div>
                <div style={css('text-align:right;')}>
                  <div style={css('font-size:14px;font-weight:700;color:#003366;font-variant-numeric:tabular-nums;')}>{m.pct}%</div>
                  {v.modalTrips && v.modalTrips[i] && <div style={css('font-size:10px;color:#929da9;font-variant-numeric:tabular-nums;')}>{v.modalTrips[i].trips_fmt}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={scenariRef} style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;')}>
          <div>
            <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Scenari di intervento</div>
            <div style={css('font-size:11.5px;color:#929da9;')}>CO₂ t/g e riduzione vs baseline</div>
          </div>
          {dlBtn(scenariRef, 'scenari_intervento')}
        </div>
        <svg width="100%" viewBox="0 0 300 140" style={{ display: 'block' }}>
          <line x1="10" y1="6" x2="290" y2="6" stroke="#ebeced" strokeWidth="1" strokeDasharray="3,2" />
          <line x1="10" y1="96" x2="290" y2="96" stroke="#d9dadb" strokeWidth="1" />
          {v.scenari.map((sc, i) => {
            const cx = 33 + i * 46;
            const bh = Math.max(1, sc.w / 100 * 90);
            const by = 96 - bh;
            return (
              <g key={i}>
                <rect x={cx - 16} y={by} width="32" height={bh} rx="2" fill={sc.color} />
                <text x={cx} y="104" textAnchor="middle" fontFamily="Titillium Web" fontSize="8.5" fontWeight="700" fill="#17324d">{sc.shortName}</text>
                <text x={cx} y="113" textAnchor="middle" fontFamily="Lora" fontSize="7.5" fill="#929da9">{sc.co2}</text>
                <text x={cx} y="122" textAnchor="middle" fontFamily="Titillium Web" fontSize="8" fontWeight="700" fill={sc.ridColor}>{sc.rid}</text>
                {sc.ridT && <text x={cx} y="131" textAnchor="middle" fontFamily="Titillium Web" fontSize="7.5" fill="#008055">−{sc.ridT} t</text>}
              </g>
            );
          })}
        </svg>
      </div>

      <div ref={smartRef} style={css('padding:15px 16px 24px;')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;')}>
          <div>
            <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Impatto smart working</div>
            <div style={css('font-size:11.5px;color:#929da9;')}>CO₂ t/g al variare dell’adozione</div>
          </div>
          {dlBtn(smartRef, 'smart_working')}
        </div>
        <svg width="100%" viewBox="0 0 300 150" style={{ display: 'block' }}>
          <line x1="34" y1="120" x2="290" y2="120" stroke="#d9dadb" strokeWidth="1" />
          <line x1="34" y1="14" x2="34" y2="120" stroke="#d9dadb" strokeWidth="1" />
          {v.smartGrid.map((g, i) => <text key={i} x="30" y={g.y} textAnchor="end" fontFamily="Titillium Web" fontSize="9" fill="#a3adb7">{g.label}</text>)}
          <polygon points={v.smartArea} fill="#089994" opacity="0.08" />
          <polyline points={v.smartPts} fill="none" stroke="#089994" strokeWidth="2.5" strokeLinejoin="round" />
          {v.smartDots.map((d, i) => (
            <g key={i}>
              <circle cx={d.cx} cy={d.cy} r="3" fill="#fff" stroke="#089994" strokeWidth="2" />
              <text x={d.cx} y="135" textAnchor="middle" fontFamily="Titillium Web" fontSize="9" fill="#768594">{d.lab}</text>
              <text x={d.cx} y={d.above ? +d.cy - 7 : +d.cy + 12} textAnchor="middle" fontFamily="Titillium Web" fontSize="7.5" fill="#089994">{d.lab2}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
