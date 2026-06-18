export const segStyle = (a) => ({
  flex: '1', height: '32px', border: 'none', borderRadius: '4px',
  fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer',
  background: a ? '#003366' : '#f5f5f5', color: a ? '#fff' : '#5c6f82',
});

export const rowStyle = () => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', height: '34px', padding: '0 11px',
  border: '1px solid #ebeced', borderRadius: '4px', background: '#fff',
  fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', color: '#17324d', cursor: 'pointer',
});

export const pill = (on) => ({
  fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '40px',
  background: on ? '#003366' : '#ebeced', color: on ? '#fff' : '#768594',
});

export const co2Pill = (on) => ({
  height: '24px', padding: '0 11px', borderRadius: '40px', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: '700',
  background: on ? '#cc7a00' : '#ebeced', color: on ? '#fff' : '#768594',
});

export const tabStyle = (a) => ({
  flex: '1', height: '32px', border: 'none', borderRadius: '4px',
  fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  background: a ? '#003366' : '#f5f5f5', color: a ? '#fff' : '#5c6f82',
});

export const swatchStyle = (hex, sel) => ({
  width: '26px', height: '26px', borderRadius: '4px', background: hex, cursor: 'pointer',
  padding: '0', border: sel ? '2px solid #003366' : '1px solid #c5c7c9',
  boxShadow: sel ? '0 0 0 2px #fff inset' : 'none',
});

export const autoChip = (sel) => ({
  height: '28px', padding: '0 12px', borderRadius: '4px',
  fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer',
  border: sel ? 'none' : '1px solid #c5c7c9', background: sel ? '#003366' : '#fff',
  color: sel ? '#fff' : '#5c6f82',
});
