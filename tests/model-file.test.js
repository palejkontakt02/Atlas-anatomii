import { test, expect } from 'vitest';
import { modelUrl, decodeModel } from '../src/model-file.js';

test('model url per format', () => {
  expect(modelUrl('bones', 'glb')).toBe('models/bones.glb');
  expect(modelUrl('bones', 'b64')).toBe('models/bones.txt');
});

test('glb passes through, base64 text decodes to the same bytes', () => {
  const bytes = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 255]);
  expect(new Uint8Array(decodeModel(bytes.buffer, 'glb'))).toEqual(bytes);
  const b64 = Buffer.from(bytes).toString('base64');
  expect(new Uint8Array(decodeModel(b64 + '\n', 'b64'))).toEqual(bytes);
});
