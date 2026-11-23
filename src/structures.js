import Papa from 'papaparse';

const SIDE_LABELS = {
  pl: { l: ' (strona lewa)', r: ' (strona prawa)' },
  en: { l: ' (left)', r: ' (right)' },
  la: { l: ' (sin.)', r: ' (dext.)' },
};

/** Parse data/structures.csv (comma or semicolon, optional BOM) into Map<id, Structure>. */
export function parseStructures(csvText) {
  const text = csvText.replace(/^﻿/, '');
  const { data } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [',', ';', '\t'],
    transformHeader: (h) => h.replace(/^﻿/, '').trim(),
  });
  const out = new Map();
  for (const r of data) {
    const id = (r.id || '').trim();
    if (!id) continue;
    out.set(id, {
      id,
      system: (r.system || '').trim(),
      pl: (r.pl || '').trim(),
      en: (r.en || '').trim(),
      la: (r.la || '').trim(),
      plStatus: (r.pl_status || '').trim(),
    });
  }
  return out;
}

/** 'femur__l' → {id: 'femur', side: 'l'}; 'heart' → {id: 'heart', side: null}. */
export function resolveMeshName(name) {
  const m = /^(.*)__([lr])$/.exec(name);
  return m ? { id: m[1], side: m[2] } : { id: name, side: null };
}

/** Name in `lang`, falling back to en → la → fallbackEn, with the side appended. */
export function displayName(s, side, lang, fallbackEn = '') {
  const base = (s && (s[lang] || s.en || s.la)) || fallbackEn;
  const suffix = side ? SIDE_LABELS[lang][side] : '';
  return base + suffix;
}
