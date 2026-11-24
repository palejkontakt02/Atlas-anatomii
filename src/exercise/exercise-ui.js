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

  const labelOf = (m) => {
    if (m.label) return m.label[lang === 'en' ? 'en' : 'pl'];
    return displayName(structures.get(m.ids[0]), null, nameLang(), m.ids[0]);
  };

  function renderList(muscles) {
    const list = $('ex-now');
    list.textContent = '';
    for (const m of muscles.slice(0, 10)) {
      const li = document.createElement('li');
      li.dataset.testid = 'ex-now-item';
      li.setAttribute('data-testid', 'ex-now-item');
      const btn = document.createElement('button');
      btn.type = 'button';
      const name = document.createElement('span');
      name.className = 'n';
      name.textContent = labelOf(m);
      const role = document.createElement('span');
      role.className = 'r';
      role.style.setProperty('--role', ROLE_COLORS[m.role]);
      role.textContent = t().roles[m.role];
      const bar = document.createElement('span');
      bar.className = 'bar';
      const val = document.createElement('span');
      val.className = 'v';
      if (m.mvic === null) {
        val.textContent = t().estimate;
        bar.classList.add('estimate');
      } else {
        val.textContent = `${round(m.mvic)}%`;
        const fill = document.createElement('i');
        fill.style.width = `${Math.min(m.mvic, 70) / 0.7}%`;
        fill.style.background = heatColor(m.mvic);
        bar.append(fill);
      }
      btn.append(name, role, bar, val);
      btn.addEventListener('click', () => {
        handlers.onPickMuscle(m.ids[0]);
        showCard(m.ids[0], null, m.ids[0]);
      });
      li.append(btn);
      list.append(li);
    }
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
    const src = $('ex-card-source');
    src.textContent = '';
    if (!a) {
      $('ex-card-role').textContent = '';
      $('ex-card-mvic').textContent = strings.notInvolved;
      $('ex-card-note').textContent = '';
      return;
    }
    $('ex-card-role').textContent = `${strings.roles[a.role]} · ${strings.contractionShort[a.contraction]}`;
    $('ex-card-mvic').textContent = a.mvic === null
      ? strings.estimateLong
      : `${round(a.mvic)}% MVIC ${strings.now}.${a.range ? ` ${strings.range}: ${a.range}` : ''}`;
    $('ex-card-note').textContent = a.note ? a.note[lang === 'en' ? 'en' : 'pl'] : '';
    const h = document.createElement('h4');
    h.textContent = strings.sources;
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
    renderCard();
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
    if (last) { lastListAt = 0; render(last); }
  }

  function setReady(ok) {
    $('ex-status').dataset.ready = String(ok);
    $('ex-status').textContent = ok ? t().exStatus : t().exError;
  }

  setLang(lang);
  return { render, showCard, hideCard, setLang, setReady };
}
