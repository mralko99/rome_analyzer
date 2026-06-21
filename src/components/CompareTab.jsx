import React from 'react';
import { css } from '../utils/css.js';
import CompareCharts from './CompareCharts.jsx';
import AreaSelector from './AreaSelector.jsx';

export default function CompareTab({ s, v, onSetCompareLevel, onSetCompareMuni, onSetCompareZone, onSetCompareFraz, onSetCompareComuneEsterno, onSetCompareRadius }) {
  const areaALabel = v.hasCatchment ? v.selName : null;
  const areaAKind  = v.hasCatchment ? v.selKind  : null;
  const areaASub   = v.hasCatchment ? v.selSub   : null;

  return (
    <>
    <div style={css('padding:16px;display:flex;flex-direction:column;gap:18px;')}>

      {/* description */}
      <div style={css('font-size:12.5px;color:#5c6f82;line-height:1.45;')}>
        Confronta i flussi pendolari di due aree geografiche <b style={{ color: '#17324d' }}>fianco a fianco</b>.
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
        ) : (
          <div style={css('border:1px dashed #f6e4c8;border-radius:6px;padding:11px 13px;background:#fffaf4;display:flex;gap:9px;align-items:flex-start;')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cc7a00" strokeWidth="2" style={{ flex: 'none', marginTop: '1px' }}><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="4"/></svg>
            <span style={css('font-size:12px;color:#cc7a00;line-height:1.4;')}>
              Seleziona un bacino nel tab <b>Selezione</b> per impostare l'Area A.
            </span>
          </div>
        )}
      </div>

      {/* ── Area B ── */}
      <div>
        <div style={css('font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#089994;margin-bottom:8px;')}>
          Area B · confronto
        </div>
        <div style={css('border:1px solid #b2e8e6;border-radius:6px;padding:13px;background:#f2fffe;')}>
          <AreaSelector
            level={s.compareLevel}
            muni={s.compareMuni}
            zone={s.compareZone}
            frazId={s.compareFrazId ?? -1}
            comuneId={s.compareComuneEsternoId ?? -1}
            radiusKm={s.compareRadiusKm ?? 0.6}
            municipiOptions={v.municipiOptions}
            zoneOptions={v.compareZoneOptions}
            frazOptions={v.frazOptions}
            comuniOptions={v.comuniEsterniOptions || []}
            levels={['capitale', 'municipio', 'zona', 'frazione', 'punto', 'comune_esterno']}
            accentColor="#089994"
            placeholder="Scegli un livello per configurare l'Area B."
            onSetLevel={onSetCompareLevel}
            onSetMuni={onSetCompareMuni}
            onSetZone={onSetCompareZone}
            onSetFraz={onSetCompareFraz}
            onSetRadius={onSetCompareRadius}
            onSetComune={onSetCompareComuneEsterno}
          />
        </div>
      </div>
      {/* ready state */}
      {areaALabel && s.compareLevel && (
        s.compareLevel === 'capitale' ||
        (s.compareLevel === 'municipio' && s.compareMuni) ||
        (s.compareLevel === 'zona' && s.compareZone >= 0) ||
        (s.compareLevel === 'frazione' && (s.compareFrazId ?? -1) >= 0) ||
        (s.compareLevel === 'punto' && s.compareHasPoint) ||
        (s.compareLevel === 'comune_esterno' && (s.compareComuneEsternoId ?? -1) !== -1)
      )}
    </div>
    <CompareCharts charts={v.compareCharts} />
    </>
  );
}
