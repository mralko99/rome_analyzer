/**
 * Returns a human-readable name for a cell ID.
 * - If the cell is within a municipio (Rome), returns the municipio name.
 * - If it is a periurbano cell mapped to an external comune, returns the comune name.
 * - Otherwise returns 'Area periurbana'.
 *
 * @param {number} id - Cell ID
 * @param {Object} cells - Data cells object with .muni[] lookup
 * @param {Object} muniName - Map of municipio number → name
 * @param {Object} cellComune - Map of cell id → comune name (precomputed in loadData)
 * @returns {string}
 */
export function getLocationName(id, cells, muniName, cellComune) {
  if (cells.muni[id]) return muniName[cells.muni[id]] || 'Municipio ' + cells.muni[id];
  return cellComune[id] || 'Area periurbana';
}
