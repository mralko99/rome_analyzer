import React from 'react';
import { css } from '../utils/css.js';
import RankList from './RankList.jsx';

export default function StatsTab({ v, s, onClearPoint }) {
  const kpi = (label, val, color) => (
    <div style={css('background:#fff;padding:13px 14px;')}>
      <div style={css('font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#768594;')}>{label}</div>
      <div style={{ fontFamily: "'Lora',serif", fontSize: '24px', fontWeight: 600, color, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
    </div>
  );

  return (
    <div>
      {v.hasCatchment ? (
        <div style={css('padding:14px 16px;border-bottom:1px solid #ebeced;display:flex;flex-direction:column;gap:14px;')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;')}>
            <div>
              <div style={css('font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#089994;')}>{v.selKind}</div>
              <div style={css('font-size:14px;font-weight:700;color:#003366;')}>{v.selName}</div>
              <div style={css("font-size:11px;color:#929da9;font-family:'Roboto Mono',monospace;")}>{v.selSub}</div>
            </div>
            <button onClick={onClearPoint} style={css('height:28px;padding:0 11px;border:1px solid #ebeced;background:#fff;border-radius:4px;cursor:pointer;color:#5c6f82;font-family:inherit;font-size:12.5px;font-weight:600;')}>Azzera</button>
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

      <div style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
        <div style={css('font-size:15px;font-weight:700;color:#003366;')}>CO₂ per municipio</div>
        <div style={css('font-size:11.5px;color:#929da9;margin-bottom:11px;')}>Tonnellate/giorno · stima dai flussi pendolari</div>
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

      <div style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
        <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Ripartizione modale</div>
        <div style={css('font-size:11.5px;color:#929da9;margin-bottom:9px;')}>Media città · pesata per popolazione</div>
        <div style={css('display:flex;align-items:center;gap:18px;')}>
          <svg width="116" height="116" viewBox="0 0 140 140" style={{ flex: 'none' }}>
            <circle cx="70" cy="70" r="50" fill="none" stroke="#ebeced" strokeWidth="18" />
            <g transform="rotate(-90 70 70)">
              {v.modalSegs.map((sg, i) => <circle key={i} cx="70" cy="70" r="50" fill="none" stroke={sg.color} strokeWidth="18" strokeDasharray={sg.dash} strokeDashoffset={sg.off} />)}
            </g>
            <text x="70" y="66" textAnchor="middle" fontFamily="Lora" fontSize="26" fontWeight="600" fill="#003366">{v.modalAuto}%</text>
            <text x="70" y="82" textAnchor="middle" fontFamily="Titillium Web" fontSize="10" fontWeight="600" fill="#768594">AUTO</text>
          </svg>
          <div style={css('flex:1;display:flex;flex-direction:column;gap:9px;')}>
            {v.modalLegend.map((m, i) => (
              <div key={i} style={css('display:flex;align-items:center;gap:8px;')}>
                <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: m.color, flex: 'none' }} />
                <div style={css('flex:1;font-size:13px;color:#17324d;')}>{m.label}</div>
                <div style={css('font-size:14px;font-weight:700;color:#003366;font-variant-numeric:tabular-nums;')}>{m.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={css('padding:15px 16px;border-bottom:1px solid #ebeced;')}>
        <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Scenari di intervento</div>
        <div style={css('font-size:11.5px;color:#929da9;margin-bottom:9px;')}>CO₂ t/g e riduzione vs baseline</div>
        <div style={css('display:flex;flex-direction:column;gap:9px;')}>
          {v.scenari.map((sc, i) => (
            <div key={i}>
              <div style={css('display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;')}>
                <span style={css('font-size:12.5px;color:#17324d;font-weight:600;')}>{sc.name}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: sc.ridColor, fontVariantNumeric: 'tabular-nums' }}>{sc.rid}</span>
              </div>
              <div style={css('height:14px;background:#ebeced;border-radius:3px;overflow:hidden;position:relative;')}>
                <div style={{ height: '100%', borderRadius: '3px', background: sc.color, width: sc.w + '%' }} />
                <span style={css('position:absolute;right:6px;top:0;line-height:14px;font-size:10.5px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums;')}>{sc.co2}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={css('padding:15px 16px 24px;')}>
        <div style={css('font-size:15px;font-weight:700;color:#003366;')}>Impatto smart working</div>
        <div style={css('font-size:11.5px;color:#929da9;margin-bottom:9px;')}>CO₂ t/g al variare dell'adozione</div>
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
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
