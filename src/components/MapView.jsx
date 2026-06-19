import React from 'react';
import { css } from '../utils/css.js';

export default function MapView({ mapRef, legendBarRef, loading, loadMsg, errorMsg, panelOpen, showClickHint, cursorMode, legendTitle, legendMin, legendMax, legendUnit, onOpenPanel }) {
  return (
    <div style={css('flex:1;position:relative;min-width:0;background:#e8eaed;')} className={cursorMode === 'radius' ? 'map-cursor-crosshair' : ''}>
      <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

      {!panelOpen && (
        <button onClick={onOpenPanel} style={css('position:absolute;top:14px;left:14px;z-index:12;display:flex;align-items:center;gap:7px;height:36px;padding:0 14px;background:#003366;color:#fff;border:none;border-radius:4px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 16px rgba(0,0,0,.10);')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></svg>
          Pannello dati
        </button>
      )}

      {showClickHint && (
        <div style={css('position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:8;background:#003366;color:#fff;border-radius:40px;padding:7px 16px;font-size:12.5px;font-weight:600;box-shadow:0 8px 16px rgba(0,0,0,.15);display:flex;align-items:center;gap:8px;')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="4" /></svg>
          Clicca un punto qualsiasi per analizzare il suo bacino di mobilità
        </div>
      )}

      <div style={css('position:absolute;bottom:14px;left:14px;z-index:6;background:rgba(255,255,255,.94);border-radius:4px;padding:9px 12px;box-shadow:0 4px 4px rgba(0,0,0,.06);min-width:200px;')}>
        <div style={css('font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5c6f82;margin-bottom:6px;')}>{legendTitle}</div>
        <div ref={legendBarRef} style={css('height:9px;border-radius:2px;background:#ebeced;')} />
        <div style={css('display:flex;justify-content:space-between;margin-top:3px;')}>
          <span style={css('font-size:10px;color:#929da9;')}>{legendMin}</span>
          <span style={css('font-size:10px;color:#5c6f82;font-weight:600;')}>{legendMax} <span style={css('color:#929da9;font-weight:400;')}>{legendUnit}</span></span>
        </div>
      </div>

      {loading && (
        <div style={css('position:absolute;inset:0;background:rgba(245,245,245,.96);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;')}>
          <div style={{ width: '38px', height: '38px', border: '3px solid #d9dadb', borderTopColor: '#003366', borderRadius: '50%', animation: 'amspin .9s linear infinite' }} />
          <div style={css('font-size:14px;color:#5c6f82;font-weight:600;')}>{loadMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div style={css('position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:21;background:#fbeff1;border:1px solid #cc334d;border-radius:4px;padding:16px 20px;max-width:340px;color:#7a1f2e;font-size:14px;')}>{errorMsg}</div>
      )}
    </div>
  );
}
