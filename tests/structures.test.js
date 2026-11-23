import fs from 'node:fs';
import { test, expect } from 'vitest';
import { PropertyBinding } from 'three';
import { parseStructures, resolveMeshName, displayName } from '../src/structures.js';

const CSV = 'id,system,pl,en,la,pl_status\r\npalatine_bone,bones,Kość podniebienna,Palatine bone,Os palatinum,do_weryfikacji\r\n';

test('parses comma CSV with CRLF', () => {
  expect(parseStructures(CSV).get('palatine_bone')).toEqual({
    id: 'palatine_bone', system: 'bones', pl: 'Kość podniebienna', en: 'Palatine bone', la: 'Os palatinum', plStatus: 'do_weryfikacji',
  });
});

test('parses Excel PL: BOM + semicolons + quoted comma', () => {
  const t = '﻿id;system;pl;en;la;pl_status\n"a_b";joints;"Więzadło, przednie";A;;zweryfikowane\n';
  expect(parseStructures(t).get('a_b')).toEqual({ id: 'a_b', system: 'joints', pl: 'Więzadło, przednie', en: 'A', la: '', plStatus: 'zweryfikowane' });
});

test('skips empty lines and rows without id, trims headers', () => {
  const t = ' id , system ,pl,en,la,pl_status\n\n,bones,X,X,X,do_weryfikacji\nfemur,bones,Kość udowa,Femur,Femur,do_weryfikacji\n';
  const m = parseStructures(t);
  expect([...m.keys()]).toEqual(['femur']);
});

test('resolveMeshName', () => {
  expect(resolveMeshName('palatine_bone__l')).toEqual({ id: 'palatine_bone', side: 'l' });
  expect(resolveMeshName('palatine_bone__r')).toEqual({ id: 'palatine_bone', side: 'r' });
  expect(resolveMeshName('heart')).toEqual({ id: 'heart', side: null });
});

test('displayName with side and fallback', () => {
  const s = parseStructures(CSV).get('palatine_bone');
  expect(displayName(s, 'l', 'pl')).toBe('Kość podniebienna (strona lewa)');
  expect(displayName(s, 'r', 'pl')).toBe('Kość podniebienna (strona prawa)');
  expect(displayName(s, 'l', 'en')).toBe('Palatine bone (left)');
  expect(displayName(s, 'r', 'la')).toBe('Os palatinum (dext.)');
  expect(displayName(s, 'l', 'la')).toBe('Os palatinum (sin.)');
  expect(displayName({ ...s, pl: '' }, null, 'pl')).toBe('Palatine bone');
  expect(displayName({ ...s, la: '' }, null, 'la')).toBe('Palatine bone');
  expect(displayName(null, null, 'pl', 'Unknown thing')).toBe('Unknown thing');
});

test('every CSV id survives three.js node-name sanitizing', () => {
  const real = parseStructures(fs.readFileSync('data/structures.csv', 'utf8'));
  expect(real.size).toBeGreaterThan(1000);
  for (const id of real.keys()) expect(PropertyBinding.sanitizeNodeName(id)).toBe(id);
});
