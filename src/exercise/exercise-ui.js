// Interfejs zakładki „Ćwiczenia”: pasek odtwarzania z fazami, kąty, „Teraz pracują”, karta mięśnia.
import { UI } from '../config.js';
import { displayName } from '../structures.js';
import { activationAt } from './exercise-data.js';
import { ROLE_COLORS, heatColor } from './heat.js';

const $ = (id) => document.getElementById(id);
const PHASE_COLORS = { none: '#3a424d', eccentric: '#e8742a', isometric: '#45e0c2', concentric: '#ff4a2e' };
const round = (x) => Math.round(x);

/**
 * handlers: onToggle(), onSeek(t01), onSpeed(s), onColorMode(mode), onPickMuscle(id|null)
 * Returns { render(frame), showCard(id, side, fallbackEn), hideCard(), setLang(lang), setReady(ok) }.
 */
export function createExerciseUI({ exercise, structures, handlers }) {
  let lang = 'pl';
  let last = null; // ostatnia klatka z widoku
  let card = null; // {id, side, fallbackEn}
  let lastListAt = 0;
  const t = () => UI[lang === 'en' ? 'en' : 'pl'];
  const nameLang = () => (lang === 'en' ? 'en' : lang === 'la' ? 'la' : 'pl');

  // pasek faz pod suwakiem
  $('ex-phases').innerHTML = exercise.phases
    .map((p) => `<span style="left:${Number(p.from) * 100}%;width:${(Number(p.to) - Number(p.from)) * 100}%;background:${PHASE_COLORS[p.contraction] || PHASE_COLORS.none}"></span>`)
    .join('');

  const seek = $('ex-seek');
  seek.addEventListener('input', () => handlers.onSeek(seek.value / 1000));
  $('ex-play').addEventListener('click', () => handlers.onToggle());
  $('ex-speed').addEventListener('click', () => {
    const next = $('ex-speed').textContent.startsWith('1') ? 0.5 : 1;
    $('ex-speed').textContent = next === 1 ? '1×' : '0,5×';
    handlers.onSpeed(next);
  });
  for (const b of document.querySelectorAll('[data-testid="ex-colormode"] button')) {
    b.addEventListener('click', () => {
      for (const o of document.querySelectorAll('[data-testid="ex-colormode"] button')) o.setAttribute('aria-pressed', String(o === b));
      handlers.onColorMode(b.dataset.color);
    });
  }
  $('ex-card-close').addEventListener('click', () => { hideCard(); handlers.onPickMuscle(null); });
  $('ex-panel-toggle').addEventListener('click', () => {
    const collapsed = $('ex-panel').classList.toggle('collapsed');
    $('ex-panel-toggle').setAttribute('aria-expanded', String(!collapsed));
  });

  const labelOf = (m) => {
    if (m.label) return m.label[lang === 'en' ? 'en' : 'pl'];
    return displayName(structures.get(m.ids[0]), null, nameLang(), m.ids[0]);
  };

  // Jeden wiersz na wpis mięśnia, tworzony raz: przy odtwarzaniu zmieniamy tylko tekst, pasek i kolejność,
  // żeby stuknięcie w wiersz (albo link) nie trafiało w element, który właśnie zniknął.
  const rows = new Map();
  for (const entry of exercise.muscles) {
    const li = document.createElement('li');
    li.setAttribute('data-testid', 'ex-now-item');
    const btn = document.createElement('button');
    btn.type = 'button';
    const name = document.createElement('span'); name.className = 'n';
    const role = document.createElement('span'); role.className = 'r';
    const bar = document.createElement('span'); bar.className = 'bar';
    const fill = document.createElement('i');
    bar.append(fill);
    const val = document.createElement('span'); val.className = 'v';
    btn.append(name, role, bar, val);
    btn.addEventListener('click', () => {
      handlers.onPickMuscle(entry.ids[0]);
      showCard(entry.ids[0], null, entry.ids[0]);
    });
    li.append(btn);
    rows.set(entry.ids, { li, name, role, bar, fill, val });
  }
  const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };

  function renderList(muscles) {
    const list = $('ex-now');
    const strings = t();
    muscles.forEach((m, i) => {
      const r = rows.get(m.ids);
      if (!r) return;
      r.li.hidden = i >= 10;
      setText(r.name, labelOf(m));
      r.role.style.setProperty('--role', ROLE_COLORS[m.role]);
      setText(r.role, strings.roles[m.role]);
      r.bar.classList.toggle('estimate', m.mvic === null);
      if (m.mvic === null) {
        setText(r.val, strings.estimate);
        r.fill.style.width = '0';
      } else {
        setText(r.val, `${round(m.mvic)}%`);
        r.fill.style.width = `${Math.min(m.mvic, 70) / 0.7}%`;
        r.fill.style.background = heatColor(m.mvic);
      }
      if (list.children[i] !== r.li) list.insertBefore(r.li, list.children[i] || null);
    });
  }

  function renderCardSources(a) {
    const src = $('ex-card-source');
    src.textContent = '';
    if (!a) return;
    const h = document.createElement('h4');
    h.textContent = t().sources;
    const ul = document.createElement('ul');
    for (const id of a.sources) {
      const source = exercise.sources.find((x) => x.id === id);
      if (!source) continue;
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source.cite;
      li.append(link);
      ul.append(li);
    }
    src.append(h, ul);
  }

  function renderCard() {
    if (!card || !last) return;
    const s = structures.get(card.id) || null;
    const strings = t();
    $('ex-card-main').textContent = displayName(s, card.side, lang, card.fallbackEn);
    const line = (f) => (s && s[f] ? displayName(s, card.side, f) : f === 'en' ? card.fallbackEn : '—');
    $('ex-card-pl').textContent = line('pl');
    $('ex-card-en').textContent = line('en');
    $('ex-card-la').textContent = line('la');
    const a = activationAt(exercise, card.id, last.t);
    if (!a) {
      setText($('ex-card-role'), '');
      setText($('ex-card-mvic'), strings.notInvolved);
      setText($('ex-card-note'), '');
      return a;
    }
    setText($('ex-card-role'), `${strings.roles[a.role]} · ${strings.contractionShort[a.contraction]}`);
    setText($('ex-card-mvic'), a.mvic === null
      ? strings.estimateLong
      : `${round(a.mvic)}% MVIC ${strings.now}.${a.range ? ` ${strings.range}: ${a.range}` : ''}`);
    setText($('ex-card-note'), a.note ? a.note[lang === 'en' ? 'en' : 'pl'] : '');
    return a;
  }

  function render(frame) {
    last = frame;
    const strings = t();
    const phaseName = frame.phase.name[lang === 'en' ? 'en' : 'pl'];
    const kind = strings.contraction[frame.phase.contraction];
    $('ex-phase').textContent = kind ? `${phaseName}: ${kind}` : phaseName;
    $('ex-phase').style.setProperty('--phase', PHASE_COLORS[frame.phase.contraction]);
    const A = frame.angles;
    $('ex-angles').innerHTML = ['hip', 'knee', 'ankle', 'trunk']
      .map((k) => `<span>${strings.angles[k]} ${round(A[k])}°</span>`).join('');
    if (document.activeElement !== seek) seek.value = String(round(frame.t * 1000));
    const playBtn = $('ex-play');
    playBtn.setAttribute('aria-pressed', String(frame.playing));
    playBtn.textContent = frame.playing ? '⏸' : '▶';
    playBtn.setAttribute('aria-label', frame.playing ? strings.pause : strings.play);
    const now = performance.now();
    if (!frame.playing || now - lastListAt > 120) { // lista co ~8 Hz, żeby nie przeciążać DOM
      lastListAt = now;
      renderList(frame.muscles);
      renderCard();
    }
  }

  function showCard(id, side, fallbackEn) {
    card = { id, side, fallbackEn };
    $('ex-card').hidden = false;
    renderCardSources(renderCard());
  }
  function hideCard() {
    card = null;
    $('ex-card').hidden = true;
  }

  function setLang(next) {
    lang = next;
    $('ex-title').textContent = exercise.name[lang === 'en' ? 'en' : 'pl'];
    $('ex-status').textContent = $('ex-status').dataset.ready === 'true' ? t().exStatus : t().exLoading;
    seek.setAttribute('aria-label', t().seek);
    $('ex-card-close').setAttribute('aria-label', t().close);
    if (last) { lastListAt = 0; render(last); }
    if (card) renderCardSources(renderCard());
  }

  function setReady(ok) {
    $('ex-status').dataset.ready = String(ok);
    $('ex-status').textContent = ok ? t().exStatus : t().exError;
  }

  setLang(lang);
  return { render, showCard, hideCard, setLang, setReady };
}
