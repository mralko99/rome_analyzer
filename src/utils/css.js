export const B = import.meta.env.BASE_URL;

export function css(str) {
  const o = {};
  str.split(';').forEach((d) => {
    d = d.trim();
    if (!d) return;
    const i = d.indexOf(':');
    const k = d.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    o[k] = d.slice(i + 1).trim();
  });
  return o;
}
