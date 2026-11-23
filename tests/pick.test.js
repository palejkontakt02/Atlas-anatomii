import { test, expect } from 'vitest';
import { isTap, pickWithTolerance } from '../src/pick.js';

test('tap vs drag', () => {
  expect(isTap({ x: 0, y: 0, t: 0 }, { x: 4, y: 3, t: 200 })).toBe(true);
  expect(isTap({ x: 0, y: 0, t: 0 }, { x: 30, y: 0, t: 200 })).toBe(false); // obrót
  expect(isTap({ x: 0, y: 0, t: 0 }, { x: 1, y: 0, t: 900 })).toBe(false); // przytrzymanie
  expect(isTap({ x: 0, y: 0, t: 0 }, { x: 6, y: 0, t: 500 })).toBe(true); // granica
});

test('tolerance finds thin nerve next to finger', () => {
  const hit = { distance: 5, object: 'n' };
  const raycastAt = (x, y) => (Math.round(x) === 112 && Math.round(y) === 100 ? hit : null);
  expect(pickWithTolerance(raycastAt, 100, 100)).toBe(hit);
  expect(pickWithTolerance(() => null, 100, 100)).toBeNull();
});

test('center hit wins without sampling', () => {
  let calls = 0;
  const hit = { distance: 9 };
  expect(pickWithTolerance(() => { calls++; return hit; }, 50, 50)).toBe(hit);
  expect(calls).toBe(1);
});

test('nearest of ring hits wins', () => {
  const near = { distance: 2 };
  const far = { distance: 8 };
  const raycastAt = (x, y) => (x > 100 ? far : y > 100 ? near : null);
  expect(pickWithTolerance(raycastAt, 100, 100)).toBe(near);
});
