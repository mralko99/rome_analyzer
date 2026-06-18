import React from 'react';
import { css } from '../utils/css.js';

export default function AppHeader({ onExport }) {
  return (
    <header style={css('flex:none;height:56px;background:#003366;display:flex;align-items:center;padding:0 20px;gap:16px;color:#fff;z-index:30;box-shadow:0 4px 4px rgba(0,0,0,.05);')}>
      <div style={css('width:30px;height:30px;border:2px solid rgba(255,255,255,.85);border-radius:4px;display:flex;align-items:center;justify-content:center;flex:none;')}>
        <div style={{ width: '13px', height: '15px', background: 'rgba(255,255,255,.9)', clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)' }} />
      </div>
      <div style={css('display:flex;flex-direction:column;line-height:1.15;')}>
        <span style={css('font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.65);font-weight:600;')}>Roma Capitale · Mobilità urbana</span>
        <span style={css('font-size:18px;font-weight:700;letter-spacing:-.2px;')}>Atlante dei flussi · griglia H3</span>
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={onExport} style={css('display:flex;align-items:center;gap:7px;height:34px;padding:0 15px;background:#fff;color:#003366;border:none;border-radius:4px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 11l5 4 5-4M4 19h16" /></svg>
        Esporta PNG
      </button>
    </header>
  );
}
