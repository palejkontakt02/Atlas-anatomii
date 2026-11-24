import { test, expect } from 'vitest';
import { validate } from '../scripts/validate-data.js';
import { parseStructures } from '../src/structures.js';

const csv = (rows) => parseStructures(['id,system,pl,en,la,pl_status', ...rows].join('\n'));

test('valid data has no errors and reports empty-name counts', () => {
  const s = csv(['femur,bones,Kość udowa,Femur,Os femoris,do_weryfikacji', 'x,bones,,X,,zweryfikowane']);
  const r = validate(s, { bones: ['femur__l', 'femur__r', 'x'] }, ['bones']);
  expect(r.errors).toEqual([]);
  expect(r.warnings).toEqual(['bones: bez pl 1, bez łaciny 1']);
});

test('mesh without CSV row, bad status, unknown system, bad id are errors', () => {
  const s = csv(['femur,bones,A,A,A,sprawdzone', 'Bad-Id,bones,A,A,A,do_weryfikacji', 'k,kidneys,A,A,A,do_weryfikacji']);
  const r = validate(s, { bones: ['femur__l', 'tibia__l'] }, ['bones']);
  expect(r.errors).toEqual([
    'femur: pl_status "sprawdzone" (dozwolone: do_weryfikacji, zweryfikowane)',
    'Bad-Id: id niezgodne z [a-z0-9_]',
    'k: nieznany system "kidneys"',
    'bones.glb: węzeł "tibia__l" nie ma wiersza w structures.csv',
  ]);
});

test('duplicate ids in raw CSV text are errors', async () => {
  const { duplicateIds } = await import('../scripts/validate-data.js');
  expect(duplicateIds('id,system\na,bones\nb,bones\na,joints\n')).toEqual(['a']);
});
