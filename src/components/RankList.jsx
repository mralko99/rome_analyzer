import React from 'react';
import { css } from '../utils/css.js';

export default function RankList({ title, sub, rows, color }) {
  return (
    <div>
      <div style={css('font-size:13px;font-weight:700;color:#003366;margin-bottom:9px;')}>
        {title} <span style={css('font-weight:400;color:#929da9;')}>· {sub}</span>
      </div>
      <div style={css('display:flex;flex-direction:column;gap:7px;')}>
        {rows.map((r, i) => (
          <div key={i} style={css('display:flex;align-items:center;gap:9px;')}>
            <span style={css('width:118px;flex:none;font-size:12px;font-weight:600;color:#17324d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;')}>{r.name}</span>
            <div style={css('flex:1;height:12px;background:#ebeced;border-radius:3px;overflow:hidden;')}>
              <div style={{ height: '100%', borderRadius: '3px', background: color, width: r.pct + '%' }} />
            </div>
            <span style={css('width:52px;flex:none;text-align:right;font-size:12px;font-weight:600;color:#5c6f82;font-variant-numeric:tabular-nums;')}>{r.flux}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
