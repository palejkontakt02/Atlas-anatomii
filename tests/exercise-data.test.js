import fs from 'node:fs';
import { test, expect } from 'vitest';
import { parseExercise, sampleAngles, phaseAt, activationAt, musclesNow, validateExercise } from '../src/exercise/exercise-data.js';
import { parseStructures } from '../src/structures.js';

const T = (o) => ({ pl: o, en: o });
const EX = () => ({
  id: 't', name: T('Test'), summary: T(''), status: 'do_weryfikacji', duration: 5,
  phases: [
    { id: 'start', name: T('Start'), from: 0, to: 0.1, contraction: 'none' },
    { id: 'down', name: T('Zejście'), from: 0.1, to: 0.5, contraction: 'eccentric' },
    { id: 'bottom', name: T('Dół'), from: 0.5, to: 0.58, contraction: 'isometric' },
    { id: 'up', name: T('Wstawanie'), from: 0.58, to: 0.9, contraction: 'concentric' },
    { id: 'end', name: T('Koniec'), from: 0.9, to: 1, contraction: 'none' },
  ],
  angles: { knee: [[0, 0], [0.1, 0], [0.5, 120], [0.58, 120], [0.9, 0], [1, 0]] },
  muscles: [
    { ids: ['vastus_lateralis_muscle'], role: 'main', curve: [[0, 5], [0.5, 63], [1, 5]], range: '21–63%', estimate: false, note: T(''), sources: ['isear'] },
    { ids: ['gluteus_maximus_muscle'], role: 'synergist', curve: [[0, 2], [0.5, 20], [1, 2]], range: '6–8%', estimate: false, note: T(''), sources: ['isear'] },
    { ids: ['tibialis_anterior_muscle'], role: 'stabilizer', curve: null, range: null, estimate: true, note: T(''), sources: ['agarwal'] },
  ],
  sources: [{ id: 'isear', cite: 'Isear 1997', url: 'https://doi.org/10.1097/00005768-199704000-00016' }, { id: 'agarwal', cite: 'Agarwal 2021', url: 'https://x' }],
});

test('sampleAngles: zero at start, max at bottom, missing joints are 0', () => {
  const ex = parseExercise(EX());
  expect(sampleAngles(ex, 0)).toMatchObject({ knee: 0, hip: 0, ankle: 0 });
  expect(sampleAngles(ex, 0.54).knee).toBeCloseTo(120);
});
test('sampleAngles grows monotonically during descent', () => {
  const ex = parseExercise(EX());
  const ks = [0.1, 0.2, 0.3, 0.4, 0.5].map((t) => sampleAngles(ex, t).knee);
  for (let i = 1; i < ks.length; i++) expect(ks[i]).toBeGreaterThan(ks[i - 1]);
});
test('phaseAt gives contraction type', () => {
  const ex = parseExercise(EX());
  expect(phaseAt(ex, 0.3).contraction).toBe('eccentric');
  expect(phaseAt(ex, 0.54).contraction).toBe('isometric');
  expect(phaseAt(ex, 0.7).contraction).toBe('concentric');
  expect(phaseAt(ex, 1).id).toBe('end');
});
test('activationAt: number between points, estimate without number, null for others, sides ok', () => {
  const ex = parseExercise(EX());
  const vl = activationAt(ex, 'vastus_lateralis_muscle', 0.25);
  expect(vl.mvic).toBeGreaterThan(5); expect(vl.mvic).toBeLessThan(63);
  expect(vl).toMatchObject({ role: 'main', contraction: 'eccentric', estimate: false, range: '21–63%' });
  expect(activationAt(ex, 'tibialis_anterior_muscle', 0.3)).toMatchObject({ mvic: null, estimate: true, contraction: 'isometric' });
  expect(activationAt(ex, 'femur', 0.3)).toBeNull();
  expect(activationAt(ex, 'vastus_lateralis_muscle', 0.5).mvic).toBeCloseTo(63);
});
test('musclesNow: numbers descending, then estimates', () => {
  const ex = parseExercise(EX());
  expect(musclesNow(ex, 0.5).map((m) => m.ids[0])).toEqual(['vastus_lateralis_muscle', 'gluteus_maximus_muscle', 'tibialis_anterior_muscle']);
});
test('parseExercise rejects missing fields', () => {
  const bad = EX(); delete bad.phases;
  expect(() => parseExercise(bad)).toThrow('ćwiczenie: brak pola "phases"');
});
test('validateExercise reports unknown muscle, unknown source, non-increasing times', () => {
  const raw = EX();
  raw.muscles.push({ ids: ['nie_ma'], role: 'main', curve: null, range: null, estimate: true, note: T(''), sources: ['x'] });
  raw.angles.knee = [[0, 0], [0.6, 10], [0.5, 20]];
  const structures = new Map(['vastus_lateralis_muscle', 'gluteus_maximus_muscle', 'tibialis_anterior_muscle'].map((id) => [id, { id }]));
  expect(validateExercise(parseExercise(raw), structures)).toEqual([
    'angles.knee: czasy muszą rosnąć w zakresie 0–1',
    'mięsień "nie_ma": brak w structures.csv',
    'źródło "x" nie jest zdefiniowane',
  ]);
});
test('real przysiad.json is valid against structures.csv', () => {
  const structures = parseStructures(fs.readFileSync('data/structures.csv', 'utf8'));
  const ex = parseExercise(JSON.parse(fs.readFileSync('data/exercises/przysiad.json', 'utf8')));
  expect(validateExercise(ex, structures)).toEqual([]);
  expect(ex.muscles.every((m) => m.sources.length > 0)).toBe(true);
  expect(ex.muscles.filter((m) => m.curve === null).every((m) => m.estimate)).toBe(true);
  expect(sampleAngles(ex, 0.54)).toMatchObject({ knee: 120, hip: 115, ankle: 30, trunk: 34 });
});
