import React from 'react';
import { css } from '../utils/css.js';
import CompareCharts from './CompareCharts.jsx';

export default function CompareTab({ s, v }) {
  const areaALabel = v.hasCatchment ? v.selName : null;
  const areaAKind  = v.hasCatchment ? v.selKind  : null;
  const areaASub   = v.hasCatchment ? v.selSub   : null;

  const areaBLabel = v.hasCatchmentB ? v.bLabel : null;
  const areaBKind  = v.hasCatchmentB ? v.bKind  : null;
  const areaBSub   = v.hasCatchmentB ? v.bSub   : null;

  const missingHint = (text) => (
    <div style={css('border:1px dashed #d4d9de;border-radius:6px;padding:11px 13px;background:#fafbfc;display:flex;gap:9px;align-items:flex-start;')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#768594" strokeWidth="2" style={{ flex: 'none', marginTop: '1px' }}><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="4" /></svg>
      <span style={css('font-size:12px;color:#768594;line-height:1.4;')}>{text}</span>
    </div>
  );

  return (
    <>
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:18px;')}>

      {/* description */}
      <div style={css('font-size:12.5px;color:#5c6f82;line-height:1.45;')}>
        Confronta i flussi pendolari di due aree geografiche <b style={{ color: '#17324d' }}>fianco a fianco</b>.
        Imposta le aree nel tab <b>Selezione</b> scegliendo <b>Area A</b> o <b>Area B</b>.
      </div>

      {/* ── Area A ── */}
      <div>
        <div style={css('font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#cc7a00;margin-bottom:8px;')}>
          Area A · principale
        </div>
        {areaALabel ? (
          <div style={css('border:1px solid #f6e4c8;border-radius:6px;padding:11px 13px;background:#fffaf4;')}>
            <div style={css('font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#cc7a00;margin-bottom:2px;')}>{areaAKind}</div>
            <div style={css('font-size:14px;font-weight:700;color:#003366;')}>{areaALabel}</div>
            {areaASub && <div style={css("font-size:11px;color:#929da9;font-family:'Roboto Mono',monospace;margin-top:2px;")}>{areaASub}</div>}
          </div>
        ) : missingHint(<>Seleziona un&apos;Area A nel tab <b>Selezione</b>.</>)}
      </div>

      {/* ── Area B ── */}
      <div>
        <div style={css('font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#089994;margin-bottom:8px;')}>
          Area B · confronto
        </div>
        {areaBLabel ? (
          <div style={css('border:1px solid #b2e8e6;border-radius:6px;padding:11px 13px;background:#f2fffe;')}>
            <div style={css('font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#089994;margin-bottom:2px;')}>{areaBKind}</div>
            <div style={css('font-size:14px;font-weight:700;color:#003366;')}>{areaBLabel}</div>
            {areaBSub && <div style={css("font-size:11px;color:#929da9;font-family:'Roboto Mono',monospace;margin-top:2px;")}>{areaBSub}</div>}
          </div>
        ) : missingHint(<>Seleziona un&apos;Area B nel tab <b>Selezione</b> (pulsante <b>Area B · confronto</b>).</>)}
      </div>
    </div>
    <CompareCharts charts={v.compareCharts} />
    </>
  );
}
