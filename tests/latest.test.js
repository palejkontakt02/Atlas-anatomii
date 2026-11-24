import { test, expect } from 'vitest';
import { latestOnly } from '../src/latest.js';

test('an older async pick finishing later is dropped', async () => {
  const done = [];
  let releaseSlow;
  const run = latestOnly(async (name, wait) => { await wait; return name; }, (name) => done.push(name));
  const slow = run('muscle', new Promise((r) => { releaseSlow = r; }));
  const fast = run('bone', Promise.resolve());
  await fast;
  releaseSlow();
  await slow;
  expect(done).toEqual(['bone']);
});
