export function nevralgicoColor(tipologia) {
  if (/Attrattore Centrale/i.test(tipologia)) return [204, 80, 55];
  if (/Polo Direzionale/i.test(tipologia)) return [7, 127, 123];
  if (/Filtro/i.test(tipologia)) return [0, 128, 85];
  if (/Periferia/i.test(tipologia)) return [204, 51, 77];
  if (/Macro-Polo/i.test(tipologia)) return [0, 77, 153];
  return [100, 100, 140];
}

const PUNTI_NEVRALGICI = [
  { id: 'hub_termini', nome: 'Roma Termini', tipologia: 'Grande Attrattore Centrale', latitudine: 41.9014, longitudine: 12.5005, raggio_cattura_km: 0.8, note: 'Cuore intermodale. Picco assoluto di flussi in entrata con distanze altamente eterogenee.' },
  { id: 'hub_eur', nome: 'EUR – Palasport', tipologia: 'Polo Direzionale', latitudine: 41.8315, longitudine: 12.4654, raggio_cattura_km: 1.0, note: 'Centro lavorativo quadrante sud. Alta dipendenza da gomma tramite Cristoforo Colombo e Pontina.' },
  { id: 'hub_anagnina', nome: 'Nodo Anagnina', tipologia: 'Filtro Sud-Est (Park & Ride)', latitudine: 41.8428, longitudine: 12.5860, raggio_cattura_km: 0.6, note: 'Capolinea Metro A e scambio Cotral. Alta conversione da flussi in auto a trasporto pubblico.' },
  { id: 'hub_ponte_mammolo', nome: 'Ponte Mammolo / Rebibbia', tipologia: 'Filtro Est', latitudine: 41.9216, longitudine: 12.5653, raggio_cattura_km: 0.5, note: "Snodo vitale per i flussi in entrata dall'hinterland est lungo l'asse Tiburtina." },
  { id: 'hub_saxa_rubra', nome: 'Saxa Rubra', tipologia: 'Polo Direzionale e di Scambio Nord', latitudine: 41.974638, longitudine: 12.493280, raggio_cattura_km: 0.6, note: 'Polo lavorativo e interscambio periferico. Distanze medie percorse molto elevate.' },
  { id: 'hub_ostia_centro', nome: 'Ostia Lido (Centro)', tipologia: 'Macro-Polo Periferico Costiero', latitudine: 41.7303, longitudine: 12.2825, raggio_cattura_km: 1.2, note: "Flussi di uscita massicci verso l'EUR e il centro tramite Via del Mare e ferrovia Roma-Lido." },
  { id: 'hub_tor_vergata', nome: 'Policlinico / Campus Tor Vergata', tipologia: 'Attrattore Periferico Estremo', latitudine: 41.8587, longitudine: 12.6300, raggio_cattura_km: 1.5, note: 'Cittadella molto dispersa. Raggio di cattura più ampio necessario per coprire facoltà e ospedale.' },
  { id: 'hub_ponte_di_nona', nome: 'Ponte di Nona / Roma Est', tipologia: 'Periferia Residenziale Est', latitudine: 41.9168, longitudine: 12.6648, raggio_cattura_km: 1.0, note: 'Emblema dello sprawl urbano. Altissimo tasso di motorizzazione privata e densità emissiva.' },
  { id: 'hub_casalotti', nome: 'Casalotti / Boccea', tipologia: 'Periferia Residenziale Nord-Ovest', latitudine: 41.9366, longitudine: 12.3855, raggio_cattura_km: 0.8, note: 'Quartiere isolato dalle direttrici su ferro. Forti flussi in uscita dipendenti dalla viabilità ordinaria.' },
  { id: 'hub_tuscolana', nome: 'Stazione Tuscolana', tipologia: 'Nodo di Scambio Intermedio Est', latitudine: 41.8767, longitudine: 12.5222, raggio_cattura_km: 0.6, note: 'Interscambio vitale tra anello ferroviario (FL1/FL3/FL5) e Metro A (Ponte Lungo). Assorbe flussi pendolari alleggerendo Termini.' },
  { id: 'hub_ostiense', nome: 'Stazione Ostiense', tipologia: 'Hub Intermodale Sud', latitudine: 41.8732, longitudine: 12.4827, raggio_cattura_km: 0.8, note: 'Connessione strategica tra ferrovie, Metro B (Piramide) e ferrovia Roma-Lido. Alta densità di flussi di attraversamento e direzionali.' },
  { id: 'hub_trastevere', nome: 'Stazione Trastevere', tipologia: 'Snodo Ferroviario Sud-Ovest', latitudine: 41.8722, longitudine: 12.4666, raggio_cattura_km: 0.6, note: 'Convergenza nevralgica per i flussi tirrenici e aeroportuali (FL1) verso l\'anello ferroviario. Raccoglie utenza residenziale ad alta densità.' },
  { id: 'hub_venezia', nome: 'Piazza Venezia', tipologia: 'Nodo Urbano Centrale', latitudine: 41.8958, longitudine: 12.4825, raggio_cattura_km: 0.5, note: 'Epicentro del traffico su gomma nel centro storico e hub capolinea bus. Fondamentale per mappare l\'ultimo miglio e l\'accessibilità turistico-amministrativa.' }
];

export default PUNTI_NEVRALGICI;
