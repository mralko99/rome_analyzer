import React from 'react';
import { css } from '../utils/css.js';
import { tabStyle } from '../utils/styles.js';
import SettingsTab from './SettingsTab.jsx';
import CatchmentTab from './CatchmentTab.jsx';
import StatsTab from './StatsTab.jsx';

export default function SidePanel({
  sidePanelRef, drawerRef, s, v,
  SWATCHES, bothGradStr, colorPreviewRef,
  onClosePanel,
  onSetTab,
  onMetric, onToggle, onSetHeatColor, onSetAuto, onBasemap, onFilter,
  onToggleTime, onHourStart, onHourEnd,
  onSetCatchMode, onSetAreaLevel, onSetAreaMuni, onSetAreaZone, onSetFraz,
  onSetRadius, onSetDir, onToggleCo2, onClearPoint, onPreset, onNevralgico,
}) {
  return (
    <div ref={sidePanelRef} style={css('flex:none;width:404px;overflow:hidden;background:#fafafa;')}>
      <div ref={drawerRef} style={css('height:100%;display:flex;flex-direction:column;border-left:1px solid #ebeced;background:#fafafa;')}>
        <div style={css('flex:none;display:flex;align-items:center;justify-content:space-between;padding:11px 16px;background:#fff;border-bottom:1px solid #ebeced;')}>
          <span style={css('font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#003366;')}>Dati e grafici</span>
          <button onClick={onClosePanel} title="Chiudi pannello" style={css('display:flex;align-items:center;gap:6px;height:28px;padding:0 11px;border:1px solid #ebeced;background:#fff;border-radius:4px;cursor:pointer;color:#5c6f82;font-family:inherit;font-size:12.5px;font-weight:600;')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m13 5 7 7-7 7M20 12H4" /></svg>
            Chiudi
          </button>
        </div>

        <div style={css('flex:none;display:flex;gap:3px;padding:9px 12px;background:#fff;border-bottom:1px solid #ebeced;')}>
          <button onClick={() => onSetTab('settings')} style={tabStyle(s.tab === 'settings')}>Impostazioni</button>
          <button onClick={() => onSetTab('catchment')} style={tabStyle(s.tab === 'catchment')}>Bacino</button>
          <button onClick={() => onSetTab('stats')} style={tabStyle(s.tab === 'stats')}>Statistiche</button>
        </div>

        <div style={css('flex:1;overflow-y:auto;')}>
          {s.tab === 'settings' && (
            <SettingsTab
              s={s} v={v} SWATCHES={SWATCHES} colorPreviewRef={colorPreviewRef}
              onMetric={onMetric} onToggle={onToggle}
              onSetHeatColor={onSetHeatColor} onSetAuto={onSetAuto}
              onBasemap={onBasemap} onFilter={onFilter}
              onToggleTime={onToggleTime} onHourStart={onHourStart} onHourEnd={onHourEnd}
            />
          )}
          {s.tab === 'catchment' && (
            <CatchmentTab
              s={s} v={v} bothGradStr={bothGradStr}
              onSetCatchMode={onSetCatchMode} onSetAreaLevel={onSetAreaLevel}
              onSetAreaMuni={onSetAreaMuni} onSetAreaZone={onSetAreaZone}
              onSetFraz={onSetFraz} onSetRadius={onSetRadius}
              onSetDir={onSetDir} onToggleCo2={onToggleCo2}
              onClearPoint={onClearPoint} onPreset={onPreset} onNevralgico={onNevralgico}
            />
          )}
          {s.tab === 'stats' && <StatsTab v={v} />}
        </div>
      </div>
    </div>
  );
}
