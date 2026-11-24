import { DEFAULT_ON, UI } from './config.js';
import { latestOnly } from './latest.js';
import { LayerManager } from './layers.js';
import { searchStructures } from './search.js';
import { parseStructures } from './structures.js';
import { createUI } from './ui.js';
import { createViewer } from './viewer.js';
import { parseExercise } from './exercise/exercise-data.js';
import { createExerciseUI } from './exercise/exercise-ui.js';
import { createExerciseView } from './exercise/exercise-view.js';

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
    exUI?.setLang(lang);
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

window.__atlas = { viewer, layers, exerciseLoads: 0 }; // do testów e2e i debugowania w konsoli

// ---- zakładka „Ćwiczenia” ----
let exUI = null;
let exView = null;
let exLoading = null;
let exWasPlaying = true;
let exPlaying = true;

function ensureExercise() {
  if (exLoading) return exLoading;
  window.__atlas.exerciseLoads++;
  exLoading = (async () => {
    const res = await fetch('data/exercises/przysiad.json');
    if (!res.ok) throw new Error(`przysiad.json: ${res.status}`);
    const exercise = parseExercise(await res.json());
    exUI = createExerciseUI({
      exercise,
      structures: { get: (id) => structures.get(id) },
      handlers: {
        onToggle: () => exView.toggle(),
        onSeek: (t01) => exView.seek(t01),
        onSpeed: (sp) => exView.setSpeed(sp),
        onColorMode: (mode) => exView.setColorMode(mode),
        onPickMuscle: (id) => exView.select(id),
      },
    });
    exUI.setLang(ui.getLang());
    exView = createExerciseView(document.getElementById('ex-scene'), {
      exercise,
      onFrame: (f) => { exPlaying = f.playing; exUI.render(f); },
      onSelect: (sel) => (sel ? exUI.showCard(sel.id, sel.side, sel.fallbackEn) : exUI.hideCard()),
    });
    window.__atlas.exercise = exView;
    // użytkownik mógł wyjść z zakładki, zanim widok powstał: nie animujemy w tle
    if (document.body.dataset.mode !== 'exercise') { exWasPlaying = true; exView.pause(); }
    await exView.ready;
    exUI.setReady(true);
  })().catch((e) => {
    console.warn('Ćwiczenie:', e.message);
    const status = document.getElementById('ex-status');
    status.dataset.ready = 'false';
    status.textContent = UI[ui.getLang() === 'en' ? 'en' : 'pl'].exError;
    if (!exView) exLoading = null; // plik ćwiczenia nie doszedł: spróbujemy przy następnym wejściu
  });
  return exLoading;
}

function setMode(mode) {
  const exercise = mode === 'exercise';
  document.body.dataset.mode = mode;
  document.getElementById('exercise').hidden = !exercise;
  for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  if (exercise) {
    ensureExercise();
    if (exView && exWasPlaying) exView.play();
  } else if (exView) {
    exWasPlaying = exPlaying; // nie liczymy klatek w tle
    exView.pause();
  }
}
const modeFromHash = () => (location.hash === '#cwiczenia' ? 'exercise' : 'atlas');
for (const b of document.querySelectorAll('.tabs button')) {
  b.addEventListener('click', () => {
    if (b.dataset.mode === 'exercise') location.hash = 'cwiczenia';
    else history.replaceState(null, '', location.pathname + location.search);
    setMode(b.dataset.mode);
  });
}
addEventListener('hashchange', () => setMode(modeFromHash()));
setMode(modeFromHash());

for (const system of DEFAULT_ON) layers.setVisible(system, true);
