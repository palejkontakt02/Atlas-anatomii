import { test, expect } from 'vitest';
import { Group } from 'three';
import { LayerManager } from '../src/layers.js';

function deferredLoader() {
  const calls = [];
  const loadFn = (system) => new Promise((resolve, reject) => calls.push({ system, resolve, reject }));
  return { calls, loadFn };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('loads once when toggled on twice quickly', async () => {
  const { calls, loadFn } = deferredLoader();
  const lm = new LayerManager(loadFn, () => {});
  const a = lm.setVisible('bones', true);
  const b = lm.setVisible('bones', true);
  calls[0].resolve(new Group());
  await Promise.all([a, b]);
  expect(calls).toHaveLength(1);
  expect(lm.getRoot('bones').visible).toBe(true);
});

test('on→off during load ends hidden', async () => {
  const { calls, loadFn } = deferredLoader();
  const lm = new LayerManager(loadFn, () => {});
  const a = lm.setVisible('bones', true);
  const b = lm.setVisible('bones', false);
  calls[0].resolve(new Group());
  await Promise.all([a, b]);
  expect(lm.getRoot('bones').visible).toBe(false);
  expect(lm.getState('bones')).toMatchObject({ visible: false, status: 'ready' });
});

test('off before ever loading does not load', async () => {
  const { calls, loadFn } = deferredLoader();
  const lm = new LayerManager(loadFn, () => {});
  await lm.setVisible('bones', false);
  expect(calls).toHaveLength(0);
  expect(lm.getState('bones')).toEqual({ visible: false, status: 'idle' });
});

test('ensureLoaded for search result loads and shows', async () => {
  const { calls, loadFn } = deferredLoader();
  const lm = new LayerManager(loadFn, () => {});
  const p = lm.ensureLoaded('nerves');
  calls[0].resolve(new Group());
  const root = await p;
  expect(root.visible).toBe(true);
  expect(lm.getState('nerves')).toMatchObject({ visible: true, status: 'ready' });
});

test('error then retry succeeds', async () => {
  const { calls, loadFn } = deferredLoader();
  const lm = new LayerManager(loadFn, () => {});
  const a = lm.setVisible('bones', true);
  calls[0].reject(new Error('404'));
  await a;
  expect(lm.getState('bones')).toMatchObject({ visible: false, status: 'error', error: '404' });
  const b = lm.retry('bones');
  await tick();
  calls[1].resolve(new Group());
  await b;
  expect(calls).toHaveLength(2);
  expect(lm.getState('bones')).toMatchObject({ visible: true, status: 'ready' });
});

test('ensureLoaded rejects when load fails', async () => {
  const { calls, loadFn } = deferredLoader();
  const lm = new LayerManager(loadFn, () => {});
  const p = lm.ensureLoaded('organs');
  calls[0].reject(new Error('net'));
  await expect(p).rejects.toThrow('net');
});

test('onChange reports loading then ready', async () => {
  const { calls, loadFn } = deferredLoader();
  const seen = [];
  const lm = new LayerManager(loadFn, (system, st) => seen.push(`${system}:${st.status}:${st.visible}`));
  const a = lm.setVisible('bones', true);
  calls[0].resolve(new Group());
  await a;
  expect(seen).toEqual(['bones:loading:true', 'bones:ready:true']);
});
