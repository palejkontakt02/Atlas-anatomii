import { SYSTEMS, UI } from './config.js';
import { displayName } from './structures.js';

const $ = (id) => document.getElementById(id);

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * DOM side of the atlas. All behavior comes in through `handlers`:
 * onLayerToggle(system, on), onRetry(system), onMembranes(on), onSearch(query) -> Structure[],
 * onPick(structure), onLang(lang), onHide(), onIsolate(), onShowAll(), onClose().
 */
export function createUI(handlers) {
  let lang = 'pl';
  let current = null; // {structure, side, fallbackEn}
  const t = () => UI[lang === 'en' ? 'en' : 'pl'];

  // ---- layers ----
  const list = $('layer-list');
  for (const s of SYSTEMS) {
    const li = document.createElement('li');
    li.dataset.testid = `layer-${s.key}`;
    li.setAttribute('data-testid', `layer-${s.key}`);
    li.dataset.status = 'idle';
    li.innerHTML = `<label><input type="checkbox" data-system="${s.key}">
      <span class="swatch${s.key === 'vessels' ? ' split' : ''}" style="background:${s.color}"></span>
      <span class="layer-name"></span><span class="layer-status" role="status"></span></label>`;
    li.querySelector('input').addEventListener('change', (e) => handlers.onLayerToggle(s.key, e.target.checked));
    li.querySelector('.layer-status').addEventListener('click', (e) => {
      if (li.dataset.status === 'error') {
        e.preventDefault();
        handlers.onRetry(s.key);
      }
    });
    list.appendChild(li);
  }
  $('membranes').addEventListener('change', (e) => handlers.onMembranes(e.target.checked));
  const layersPanel = $('layers');
  $('layers-toggle').addEventListener('click', () => {
    const open = layersPanel.classList.toggle('open');
    $('layers-toggle').setAttribute('aria-expanded', String(open));
  });

  function renderLayerState(system, state) {
    const li = list.querySelector(`[data-testid="layer-${system}"]`);
    li.dataset.status = state.status;
    li.querySelector('input').checked = state.visible;
    li.querySelector('.layer-status').textContent = state.status === 'error' ? t().loadError : '';
  }

  // ---- search ----
  const input = $('search');
  const results = $('results');
  let hits = [];
  let timer = 0;
  function secondary(s) {
    if (lang === 'pl') return s.la ? `<i>${esc(s.la)}</i>` : esc(s.en);
    return esc(s.pl || s.en);
  }
  function renderResults() {
    const q = input.value;
    hits = handlers.onSearch(q);
    if (q.trim().length < 2) {
      results.hidden = true;
      return;
    }
    const sysName = (k) => SYSTEMS.find((s) => s.key === k)?.label[lang === 'en' ? 'en' : 'pl'] || k;
    results.innerHTML = hits.length
      ? hits.map((s, i) => `<li role="option"><button type="button" data-i="${i}" data-testid="search-result">
          <span class="r-main">${esc(displayName(s, null, lang))}</span>
          <span class="r-sub">${secondary(s)} · ${esc(sysName(s.system))}</span></button></li>`).join('')
      : `<li class="empty">${t().noResults}</li>`;
    results.hidden = false;
  }
  function choose(i) {
    const s = hits[i];
    if (!s) return;
    results.hidden = true;
    input.blur();
    handlers.onPick(s);
  }
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(renderResults, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(timer);
      renderResults();
      choose(0);
    } else if (e.key === 'Escape') {
      results.hidden = true;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      results.querySelector('button')?.focus();
    }
  });
  input.addEventListener('focus', () => input.value.trim().length >= 2 && renderResults());
  results.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (b) choose(Number(b.dataset.i));
  });
  results.addEventListener('keydown', (e) => {
    const b = document.activeElement.closest('li');
    if (e.key === 'ArrowDown') { e.preventDefault(); b?.nextElementSibling?.querySelector('button')?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (b?.previousElementSibling?.querySelector('button') || input).focus(); }
    if (e.key === 'Escape') { results.hidden = true; input.focus(); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.search')) results.hidden = true;
  });

  // ---- info panel ----
  const info = $('info');
  function renderInfo() {
    if (!current) return;
    const { structure: s, side, fallbackEn } = current;
    $('info-main').textContent = displayName(s, side, lang, fallbackEn);
    const line = (field) => (s && s[field] ? displayName(s, side, field) : field === 'en' && fallbackEn ? fallbackEn : '—');
    const pl = $('info-pl');
    pl.textContent = line('pl');
    if (s && s.pl && s.plStatus !== 'zweryfikowane') {
      const b = document.createElement('span');
      b.className = 'badge';
      b.dataset.testid = 'badge-unverified';
      b.setAttribute('data-testid', 'badge-unverified');
      b.textContent = t().unverified;
      b.title = t().unverifiedTip;
      pl.appendChild(b);
    }
    $('info-en').textContent = line('en');
    $('info-la').textContent = line('la');
  }
  function showInfo(structure, side, fallbackEn) {
    current = { structure, side, fallbackEn };
    renderInfo();
    info.hidden = false;
    $('hint').hidden = true;
  }
  function hideInfo() {
    current = null;
    info.hidden = true;
  }
  $('info-close').addEventListener('click', () => handlers.onClose());
  $('btn-hide').addEventListener('click', () => handlers.onHide());
  $('btn-isolate').addEventListener('click', () => handlers.onIsolate());
  $('btn-show-all').addEventListener('click', () => handlers.onShowAll());

  // ---- language ----
  function applyTexts() {
    const strings = t();
    document.documentElement.lang = lang === 'en' ? 'en' : 'pl';
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = strings[el.dataset.i18n];
    input.placeholder = strings.search;
    $('info-close').setAttribute('aria-label', strings.close);
    for (const s of SYSTEMS) {
      list.querySelector(`[data-testid="layer-${s.key}"] .layer-name`).textContent = s.label[lang === 'en' ? 'en' : 'pl'];
    }
    for (const b of document.querySelectorAll('.lang button')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  }
  function setLang(next) {
    lang = next;
    applyTexts();
    renderInfo();
    if (!results.hidden) renderResults();
  }
  for (const b of document.querySelectorAll('.lang button')) {
    b.addEventListener('click', () => handlers.onLang(b.dataset.lang));
  }
  applyTexts();

  return { renderLayerState, showInfo, hideInfo, setLang, getLang: () => lang };
}
