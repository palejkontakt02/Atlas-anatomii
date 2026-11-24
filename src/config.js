export const SYSTEMS = [
  { key: 'bones', color: '#e8dcc4', label: { pl: 'Kości', en: 'Bones' } },
  { key: 'joints', color: '#b9c7cf', label: { pl: 'Stawy i więzadła', en: 'Joints & ligaments' } },
  { key: 'muscles', color: '#b5473f', label: { pl: 'Mięśnie', en: 'Muscles' } },
  { key: 'vessels', color: '#c0392b', label: { pl: 'Naczynia', en: 'Vessels' } },
  { key: 'nerves', color: '#e2c044', label: { pl: 'Układ nerwowy i narządy zmysłów', en: 'Nervous system & sense organs' } },
  { key: 'organs', color: '#c98b78', label: { pl: 'Narządy wewnętrzne', en: 'Internal organs' } },
];

export const DEFAULT_ON = ['bones'];
export const VEIN_COLOR = '#3d5fa8';
export const BRAIN_COLOR = '#d6b8b0';

export const TISSUE_COLORS = {
  cartilage: '#a9c4cc',
  ligament: '#d8cdb0',
  tendon: '#e9e6dc',
  'articular capsule': '#cdbfa3',
  bursa: '#9fb8c8',
  fascia: '#cfc6bd',
  peritoneum: '#d9b8a8',
  teeth: '#f3efe2',
  'teeth-roots': '#efe6cf',
  vein: VEIN_COLOR,
  'pulmonary vein': VEIN_COLOR,
};

/** Tissues hidden until the user turns on "Pokaż błony"; they cover what students look for. */
export const HIDDEN_TISSUES = ['fascia', 'peritoneum'];

const BRAIN_TISSUE = /^(brain|white matter|nucleus|cerebellum|.*lobe|insula|interlobar sulci|lcr)/;
const VEIN_NAME = /\b(vein|veins|venous|sinus|vena|venae)\b/i;

export function colorFor(system, tissue, name, part) {
  if (system === 'muscles' && part === 'belly') return SYSTEMS.find((s) => s.key === 'muscles').color;
  if (system === 'muscles' && part === 'tendon' && !TISSUE_COLORS[tissue]) return TISSUE_COLORS.tendon;
  if (TISSUE_COLORS[tissue]) return TISSUE_COLORS[tissue];
  const sys = SYSTEMS.find((s) => s.key === system);
  if (system === 'vessels' && VEIN_NAME.test(name || '')) return VEIN_COLOR;
  if (system === 'nerves' && BRAIN_TISSUE.test(tissue || '')) return BRAIN_COLOR;
  return sys ? sys.color : '#cccccc';
}

export const UI = {
  pl: {
    title: 'Atlas anatomii',
    search: 'Szukaj struktury (PL, ENG, łac.)…',
    layers: 'Warstwy',
    showMembranes: 'Pokaż błony (powięzie, otrzewna)',
    hide: 'Ukryj',
    isolate: 'Pokaż tylko to',
    showAll: 'Pokaż wszystko',
    unverified: 'do weryfikacji',
    unverifiedTip: 'Polska nazwa nie została jeszcze sprawdzona',
    loadError: 'Nie udało się wczytać, spróbuj ponownie',
    hint: 'Kliknij strukturę, aby zobaczyć jej nazwę',
    noResults: 'Brak wyników',
    close: 'Zamknij',
  },
  en: {
    title: 'Anatomy atlas',
    search: 'Search structure (PL, EN, Latin)…',
    layers: 'Layers',
    showMembranes: 'Show membranes (fascia, peritoneum)',
    hide: 'Hide',
    isolate: 'Show only this',
    showAll: 'Show all',
    unverified: 'unverified',
    unverifiedTip: 'The Polish name has not been checked yet',
    loadError: 'Failed to load, try again',
    hint: 'Click a structure to see its name',
    noResults: 'No results',
    close: 'Close',
  },
};
