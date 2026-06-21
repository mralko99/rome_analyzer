const fmt = (n) => Math.round(n).toLocaleString('it-IT');
const fmtCo2 = (g) => (g / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' t/g';

const row = (label, value, muted) =>
  `<tr><td style="color:${muted ? '#9fb9dc' : '#cce0ff'};padding-right:10px;white-space:nowrap;font-size:11px">${label}</td><td style="text-align:right;font-weight:600">${value}</td></tr>`;

const ttl = (text) =>
  `<div style="font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.18);padding-bottom:4px">${text}</div>`;

export const ttStyle = {
  background: '#002850',
  color: '#e8f0fb',
  padding: '10px 14px',
  borderRadius: '6px',
  fontSize: '12px',
  lineHeight: '1.5',
  fontFamily: "'Titillium Web', sans-serif",
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  maxWidth: '260px',
  pointerEvents: 'none',
};

export function hexTooltipHtml({ locationName, out, inc, internal, co2 }) {
  return (
    `<div>` +
    ttl(locationName) +
    `<table style="border-collapse:collapse;width:100%">` +
    row('USCENTI', fmt(out || 0)) +
    row('ENTRANTI', fmt(inc || 0)) +
    row('INTERNI', fmt(internal || 0)) +
    row('CO₂', fmtCo2(co2 || 0)) +
    `</table></div>`
  );
}

export function connTooltipHtml({ locationName, inFlow, outFlow, co2g }) {
  const both = inFlow > 0 && outFlow > 0;
  return (
    `<div>` +
    ttl(locationName) +
    `<table style="border-collapse:collapse;width:100%">` +
    (inFlow > 0 ? row('ENTRANTI', fmt(inFlow)) : '') +
    (outFlow > 0 ? row('USCENTI', fmt(outFlow)) : '') +
    (both ? row('TOTALE', fmt(inFlow + outFlow)) : '') +
    row('CO₂ stima', fmtCo2(co2g || 0)) +
    `</table></div>`
  );
}

export function internalTooltipHtml({ locationName, internalTrips }) {
  return (
    `<div>` +
    ttl(locationName) +
    `<div style="display:inline-block;background:#004080;color:#cce8ff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;margin-bottom:5px">NEL BACINO</div>` +
    `<table style="border-collapse:collapse;width:100%">` +
    row('INTERNI', fmt(internalTrips)) +
    `</table></div>`
  );
}

export function nevralgicTooltipHtml({ tipologia, nome, noteTxt, raggio }) {
  const tipoLabel = tipologia ? tipologia.charAt(0).toUpperCase() + tipologia.slice(1) : 'Punto';
  return (
    `<div>` +
    `<div style="font-size:10px;color:#9fb9dc;margin-bottom:2px">${tipoLabel}</div>` +
    ttl(nome) +
    (noteTxt ? `<div style="font-size:11px;color:#b8cfe8;margin-bottom:4px">${noteTxt}</div>` : '') +
    `<div style="font-size:11px;color:#9fb9dc">Raggio: ${raggio ? raggio.toFixed(1) + ' km' : '—'}</div>` +
    `</div>`
  );
}

export function comuneTooltipHtml({ name, istat, popolazione, selectable }) {
  return (
    `<div>` +
    ttl(name || 'Comune') +
    (istat ? `<div style="font-size:10px;color:#9fb9dc;margin-bottom:3px">ISTAT: ${istat}</div>` : '') +
    (popolazione ? `<div style="font-size:11px">Pop.: ${fmt(popolazione)}</div>` : '') +
    (selectable ? `<div style="margin-top:5px;font-size:10px;color:#7dc4c4;font-style:italic">Clicca per selezionare</div>` : '') +
    `</div>`
  );
}
