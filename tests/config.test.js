import { test, expect } from 'vitest';
import { colorFor, SYSTEMS } from '../src/config.js';

test('systems in plan order with files', () => {
  expect(SYSTEMS.map((s) => s.key)).toEqual(['bones', 'joints', 'muscles', 'vessels', 'nerves', 'organs']);
  expect(SYSTEMS[0].file).toBe('models/bones.glb');
});
test('vessel colors: veins blue, arteries red', () => {
  expect(colorFor('vessels', 'vein', 'Left renal vein')).toBe('#3d5fa8');
  expect(colorFor('vessels', 'pulmonary vein', 'X')).toBe('#3d5fa8');
  expect(colorFor('vessels', 'artery', 'Abdominal aorta')).toBe('#c0392b');
  expect(colorFor('vessels', '', 'Superior sagittal sinus')).toBe('#3d5fa8');
});
test('tissue overrides system color', () => {
  expect(colorFor('muscles', 'tendon', 'X')).toBe('#e9e6dc');
  expect(colorFor('bones', 'cartilage', 'X')).toBe('#a9c4cc');
  expect(colorFor('muscles', 'abductor', 'X')).toBe('#b5473f');
  expect(colorFor('bones', 'bone-3', 'X')).toBe('#e8dcc4');
});
test('nerves vs brain tissue', () => {
  expect(colorFor('nerves', 'nerve-5', 'X')).toBe('#e2c044');
  expect(colorFor('nerves', 'brain-inner', 'X')).toBe('#d6b8b0');
  expect(colorFor('nerves', 'white matter', 'X')).toBe('#d6b8b0');
});
