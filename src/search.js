const FIELDS = ['pl', 'en', 'la'];
const cache = new WeakMap();

/** Lowercase, strip diacritics (ł too), collapse whitespace; keeps Latin ae/oe as typed. */
function plain(text) {
  return (text || '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const collapse = (t) => t.replace(/ae/g, 'e').replace(/oe/g, 'e');

/** plain() plus unified Latin spelling (glutaeus = gluteus, oesophagus = esophagus). */
export function normalize(text) {
  return collapse(plain(text));
}

// A short collapsed fragment ("cae" -> "ce") would match unrelated words.
const MIN_COLLAPSED = 4;

function fieldsOf(s) {
  let f = cache.get(s);
  if (!f) {
    f = FIELDS.map((k) => plain(s[k])).filter(Boolean).map((t) => {
      const c = collapse(t);
      return { text: t, coll: c, words: t.split(/[\s(),/-]+/), collWords: c.split(/[\s(),/-]+/) };
    });
    cache.set(s, f);
  }
  return f;
}

function useColl(w) {
  return collapse(w) !== w && collapse(w).length >= MIN_COLLAPSED;
}
const contains = (field, w) => field.text.includes(w) || (useColl(w) && field.coll.includes(collapse(w)));
const startsWord = (field, w) => field.words.some((fw) => fw.startsWith(w))
  || (useColl(w) && field.collWords.some((fw) => fw.startsWith(collapse(w))));

function scoreField(field, q, words) {
  if (!words.every((w) => contains(field, w))) return 0;
  if (field.text.startsWith(q) || (useColl(q) && field.coll.startsWith(collapse(q)))) return 3;
  if (words.every((w) => startsWord(field, w))) return 2;
  return 1;
}

/** Structures whose pl/en/la contains every word of `query`, best first. */
export function searchStructures(structures, query, limit = 20) {
  const q = plain(query);
  if (q.length < 2) return [];
  const words = q.split(' ');
  const hits = [];
  for (const s of structures) {
    let best = 0;
    let len = Infinity;
    for (const f of fieldsOf(s)) {
      const sc = scoreField(f, q, words);
      if (sc > best || (sc === best && sc > 0 && f.text.length < len)) {
        best = sc;
        len = f.text.length;
      }
    }
    if (best > 0) hits.push({ s, best, len });
  }
  hits.sort((a, b) => b.best - a.best || a.len - b.len);
  return hits.slice(0, limit).map((h) => h.s);
}
