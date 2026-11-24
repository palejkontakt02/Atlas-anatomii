import { DEFAULT_ON } from './config.js';
import { latestOnly } from './latest.js';
import { LayerManager } from './layers.js';
import { searchStructures } from './search.js';
import { parseStructures } from './structures.js';
import { createUI } from './ui.js';
import { createViewer } from './viewer.js';

const LANG_KEY = 'atlas.lang';
const readLang = () => {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return ['pl', 'en', 'la'].includes(v) ? v : 'pl';
  } catch {
    return 'pl';
  }
};
const saveLang = (v) => {
  try {
    localStorage.setItem(LANG_KEY, v);
  } catch {
    /* prywatne okno: język tylko na tę wizytę */
  }
};

let structures = new Map();

const viewer = createViewer(document.getElementById('scene'), {
  onSelect(sel) {
    if (!sel) return ui.hideInfo();
    ui.showInfo(structures.get(sel.id) || null, sel.side, sel.fallbackEn);
  },
});

const layers = new LayerManager((system) => viewer.loadLayer(system), (system, state) => ui.renderLayerState(system, state));

// Wybór z wyszukiwarki: liczy się tylko ostatni, nawet jeśli wcześniejszy czekał dłużej na warstwę.
const pick = latestOnly(
  async (s) => {
    try {
      await layers.ensureLoaded(s.system);
      return true;
    } catch {
      return false; // stan błędu widać przy warstwie
    }
  },
  (loaded, s) => {
    if (!loaded) return;
    const sel = viewer.select(s.id);
    ui.showInfo(s, null, sel?.fallbackEn || s.en);
  },
);

const ui = createUI({
  onLayerToggle: (system, on) => layers.setVisible(system, on).then(() => viewer.requestRender()),
  onRetry: (system) => layers.retry(system),
  onMembranes: (on) => viewer.setTissueVisible(on),
  onSearch: (q) => searchStructures(structures.values(), q),
  onPick: (s) => pick(s),
  onLang(lang) {
    saveLang(lang);
    ui.setLang(lang);
  },
  onHide() {
    viewer.hideSelected();
    ui.hideInfo();
  },
  onIsolate: () => viewer.isolateSelected(),
  onShowAll: () => viewer.showAll(),
  onClose() {
    viewer.clearSelection();
    ui.hideInfo();
  },
});

ui.setLang(readLang());

fetch('data/structures.csv')
  .then((r) => {
    if (!r.ok) throw new Error(`structures.csv: ${r.status}`);
    return r.text();
  })
  .then((text) => {
    structures = parseStructures(text);
  })
  .catch((e) => console.warn('Brak nazw struktur:', e.message));

window.__atlas = { viewer, layers }; // do testów e2e i debugowania w konsoli

for (const system of DEFAULT_ON) layers.setVisible(system, true);
