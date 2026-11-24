import Papa from 'papaparse';
import { resolveMeshName } from '../src/structures.js';

const STATUSES = ['do_weryfikacji', 'zweryfikowane'];
const ID_RE = /^[a-z0-9]+(_[a-z0-9]+)*$/;

/** Ids that appear more than once in the raw CSV (parseStructures would silently keep the last). */
export function duplicateIds(csvText) {
  const { data } = Papa.parse(csvText.replace(/^﻿/, ''), { header: true, skipEmptyLines: true, delimitersToGuess: [',', ';', '\t'] });
  const seen = new Set();
  const dup = new Set();
  for (const r of data) {
    const id = (r.id || '').trim();
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return [...dup];
}

/** structures: Map from parseStructures; nodeNames: {system: [mesh node names]}; systems: allowed keys. */
export function validate(structures, nodeNames, systems) {
  const errors = [];
  const warnings = [];
  for (const s of structures.values()) {
    if (!STATUSES.includes(s.plStatus)) errors.push(`${s.id}: pl_status "${s.plStatus}" (dozwolone: ${STATUSES.join(', ')})`);
    if (!ID_RE.test(s.id)) errors.push(`${s.id}: id niezgodne z [a-z0-9_]`);
    if (!systems.includes(s.system)) errors.push(`${s.id}: nieznany system "${s.system}"`);
    for (const k of ['pl', 'en', 'la']) {
      if (s[k].includes('\ufffd')) errors.push(`${s.id}: znak \ufffd w kolumnie ${k} (plik nie był zapisany jako UTF-8?)`);
    }
  }
  for (const [system, names] of Object.entries(nodeNames)) {
    for (const n of names) {
      if (!structures.has(resolveMeshName(n).id)) errors.push(`${system}.glb: węzeł "${n}" nie ma wiersza w structures.csv`);
    }
  }
  for (const system of systems) {
    const rows = [...structures.values()].filter((s) => s.system === system);
    const noPl = rows.filter((s) => !s.pl).length;
    const noLa = rows.filter((s) => !s.la).length;
    if (noPl || noLa) warnings.push(`${system}: bez pl ${noPl}, bez łaciny ${noLa}`);
  }
  return { errors, warnings };
}
