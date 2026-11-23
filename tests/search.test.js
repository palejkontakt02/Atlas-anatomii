import { test, expect } from 'vitest';
import { normalize, searchStructures } from '../src/search.js';

const S = [
  { id: 'gluteus_medius_muscle', system: 'muscles', pl: 'Mięsień pośladkowy średni', en: 'Gluteus medius muscle', la: 'Musculus gluteus medius', plStatus: 'do_weryfikacji' },
  { id: 'gluteus_maximus_muscle', system: 'muscles', pl: 'Mięsień pośladkowy wielki', en: 'Gluteus maximus muscle', la: 'Musculus gluteus maximus', plStatus: 'do_weryfikacji' },
  { id: 'clavicle', system: 'bones', pl: 'Obojczyk', en: 'Clavicle', la: 'Clavicula', plStatus: 'do_weryfikacji' },
];

test.each(['pośladkowy średni', 'posladkowy sredni', 'GLUTEUS MEDIUS', 'glutaeus medius', 'medius'])(
  'finds gluteus medius for %s', (q) => expect(searchStructures(S, q)[0].id).toBe('gluteus_medius_muscle'));

test('multi-word AND', () => expect(searchStructures(S, 'pośladkowy wielki').map((s) => s.id)).toEqual(['gluteus_maximus_muscle']));
test('prefix ranks first', () => expect(searchStructures(S, 'obo')[0].id).toBe('clavicle'));
test('short query empty', () => expect(searchStructures(S, 'o')).toEqual([]));
test('no match empty', () => expect(searchStructures(S, 'zzzz')).toEqual([]));
test('limit respected', () => expect(searchStructures(S, 'mus', 1)).toHaveLength(1));
test('works on Map values iterable', () => expect(searchStructures(new Map(S.map((s) => [s.id, s])).values(), 'clav')[0].id).toBe('clavicle'));
test('normalize', () => {
  expect(normalize('  Łokieć  ')).toBe('lokiec');
  expect(normalize('Glutæus')).toBe('gluteus');
  expect(normalize('Oesophagus')).toBe('esophagus');
});
