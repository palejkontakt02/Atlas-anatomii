const FIELDS = ['pl', 'en', 'la'];
const cache = new WeakMap();

/** Lowercase, strip diacritics (ł too), unify Latin ae/oe spellings, collapse whitespace. */
export function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'e')
    .replace(/oe/g, 'e')
    .replace(/\s+/g, ' ')
    .trim();
}

function fieldsOf(s) {
  let f = cache.get(s);
  if (!f) {
    f = FIELDS.map((k) => normalize(s[k])).filter(Boolean).map((t) => ({ text: t, words: t.split(/[\s(),/-]+/) }));
    cache.set(s, f);
  }
  return f;
}

function scoreField(field, q, words) {
  if (!words.every((w) => field.text.includes(w))) return 0;
  if (field.text.startsWith(q)) return 3;
  if (words.every((w) => field.words.some((fw) => fw.startsWith(w)))) return 2;
  return 1;
}

/** Structures whose pl/en/la contains every word of `query`, best first. */
export function searchStructures(structures, query, limit = 20) {
  const q = normalize(query);
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
