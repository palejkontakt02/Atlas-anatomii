import { test, expect } from 'vitest';
import { createVisibility } from '../src/visibility.js';

const mesh = (name, tissue = '') => ({ name, visible: true, userData: { tissue } });
const vis = (ms) => Object.fromEntries(ms.map((m) => [m.name, m.visible]));

test('hide only target structure side', () => {
  const ms = [mesh('femur__l'), mesh('femur__r'), mesh('tibia__l')];
  const v = createVisibility();
  v.hide(ms, ms[0]);
  expect(vis(ms)).toEqual({ femur__l: false, femur__r: true, tibia__l: true });
});

test('isolate keeps both sides of structure', () => {
  const ms = [mesh('femur__l'), mesh('femur__r'), mesh('tibia__l')];
  const v = createVisibility();
  v.isolate(ms, ms[0]);
  expect(vis(ms)).toEqual({ femur__l: true, femur__r: true, tibia__l: false });
  expect(v.isolatedId()).toBe('femur');
});

test('isolate applies to later-loaded layer', () => {
  const ms = [mesh('femur__l')];
  const v = createVisibility();
  v.isolate(ms, ms[0]);
  const later = [mesh('gluteus_medius_muscle__l'), mesh('femur__r')];
  v.applyTo(later);
  expect(vis(later)).toEqual({ gluteus_medius_muscle__l: false, femur__r: true });
});

test('showAll restores and clears isolation', () => {
  const ms = [mesh('femur__l'), mesh('tibia__l'), mesh('heart')];
  const v = createVisibility();
  v.hide(ms, ms[2]);
  v.isolate(ms, ms[0]);
  v.showAll(ms);
  expect(vis(ms)).toEqual({ femur__l: true, tibia__l: true, heart: true });
  expect(v.isolatedId()).toBeNull();
});

test('hidden tissues start hidden and can be shown', () => {
  const ms = [mesh('fascia_lata__l', 'fascia'), mesh('femur__l', '')];
  const v = createVisibility({ hiddenTissues: ['fascia'] });
  v.applyTo(ms);
  expect(vis(ms)).toEqual({ fascia_lata__l: false, femur__l: true });
  v.setTissuesVisible(ms, true);
  expect(ms[0].visible).toBe(true);
  v.showAll(ms);
  expect(ms[0].visible).toBe(true); // showAll nie chowa ponownie powięzi włączonych przez użytkownika
});

test('reveal shows a searched structure hidden by user, isolation or tissue', () => {
  const ms = [mesh('femur__l'), mesh('tibia__l'), mesh('fascia_lata__l', 'fascia')];
  const v = createVisibility({ hiddenTissues: ['fascia'] });
  v.applyTo(ms);
  v.hide(ms, ms[0]);
  v.isolate(ms, ms[1]);
  v.reveal(ms, [ms[0]]);
  expect(vis(ms)).toEqual({ femur__l: true, tibia__l: true, fascia_lata__l: false });
  expect(v.isolatedId()).toBeNull();
  v.reveal(ms, [ms[2]]);
  expect(ms[2].visible).toBe(true);
});

test('reveal keeps isolation of the same structure', () => {
  const ms = [mesh('femur__l'), mesh('femur__r'), mesh('tibia__l')];
  const v = createVisibility();
  v.isolate(ms, ms[0]);
  v.reveal(ms, [ms[1]]);
  expect(v.isolatedId()).toBe('femur');
  expect(ms[2].visible).toBe(false);
});

test('hide works on the isolated structure', () => {
  const ms = [mesh('femur__l'), mesh('femur__r'), mesh('tibia__l')];
  const v = createVisibility();
  v.isolate(ms, ms[0]);
  v.hide(ms, ms[0]);
  expect(vis(ms)).toEqual({ femur__l: false, femur__r: true, tibia__l: false });
});
