// Spójność danych: każdy węzeł w public/models/*.glb ma wiersz w CSV, statusy i id są poprawne.
//   node scripts/check-data.mjs [--csv ścieżka]
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { SYSTEMS } from '../src/config.js';
import { parseStructures } from '../src/structures.js';
import { duplicateIds, validate } from './validate-data.js';

const MAX_BYTES = 95 * 1024 * 1024;
const i = process.argv.indexOf('--csv');
const csvPath = i > 0 ? process.argv[i + 1] : 'data/structures.csv';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const csvText = fs.readFileSync(csvPath, 'utf8');
const structures = parseStructures(csvText);
const nodeNames = {};
const errors = duplicateIds(csvText).map((id) => `${id}: zduplikowane id w CSV`);
for (const { key } of SYSTEMS) {
  const file = `public/models/${key}.glb`;
  if (!fs.existsSync(file)) {
    errors.push(`${file}: brak pliku`);
    continue;
  }
  const size = fs.statSync(file).size;
  if (size > MAX_BYTES) errors.push(`${file}: ${(size / 1e6).toFixed(1)} MB > 95 MB`);
  const doc = await io.read(file);
  nodeNames[key] = doc.getRoot().listNodes().filter((n) => n.getMesh()).map((n) => n.getName());
}
const r = validate(structures, nodeNames, SYSTEMS.map((s) => s.key));
errors.push(...r.errors);
for (const w of r.warnings) console.warn(`uwaga: ${w}`);
const meshes = Object.values(nodeNames).reduce((a, n) => a + n.length, 0);
if (errors.length) {
  for (const e of errors) console.error(`BŁĄD: ${e}`);
  process.exit(1);
}
console.log(`OK: ${structures.size} struktur, ${meshes} węzłów w ${Object.keys(nodeNames).length} plikach`);
