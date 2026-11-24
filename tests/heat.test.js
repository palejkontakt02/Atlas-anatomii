import { test, expect } from 'vitest';
import { heatColor, ROLE_COLORS } from '../src/exercise/heat.js';

test('heat map ends and clamp', () => {
  expect(heatColor(0)).toBe('#5a2f2c');
  expect(heatColor(70)).toBe('#ffd23f');
  expect(heatColor(100)).toBe('#ffd23f');
  expect(heatColor(-5)).toBe('#5a2f2c');
});
test('middle differs from both ends and grows warmer', () => {
  const mid = heatColor(35);
  expect(mid).not.toBe(heatColor(0));
  expect(mid).not.toBe(heatColor(70));
  expect(heatColor(35)).toBe('#e8742a');
});
test('role colours', () => {
  expect(ROLE_COLORS).toEqual({ main: '#ff4a2e', synergist: '#ffae2e', stabilizer: '#4aa3ff', antagonist: '#b07aff' });
});
