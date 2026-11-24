import { test, expect } from 'vitest';
import { Vector3, Quaternion, MathUtils } from 'three';
import { SEGMENTS, segmentLines, skinWeights, rigidSegment, buildSkeleton, applyPose } from '../src/exercise/rig.js';

const v = (x, y, z) => new Vector3(x, y, z);
const J = {
  hipl: v(0.09, 0.9, 0), hipr: v(-0.09, 0.9, 0), kneel: v(0.09, 0.5, 0.01), kneer: v(-0.09, 0.5, 0.01),
  anklel: v(0.09, 0.08, -0.02), ankler: v(-0.09, 0.08, -0.02),
  shoulderl: v(0.19, 1.4, -0.02), shoulderr: v(-0.19, 1.4, -0.02), elbowl: v(0.22, 1.1, -0.03), elbowr: v(-0.22, 1.1, -0.03),
  wristl: v(0.25, 0.85, 0), wristr: v(-0.25, 0.85, 0), l2: v(0, 1.05, -0.08), l4: v(0, 0.97, -0.07), c7: v(0, 1.45, -0.06), c1: v(0, 1.58, -0.02),
};
const lines = segmentLines(J);
const ctx = (name, isBone = false) => ({ name, side: name.endsWith('__l') ? 'l' : name.endsWith('__r') ? 'r' : null, isBone, lines, hipY: 0.9 });
const w = (res, i, seg) => { let s = 0; for (let j = 0; j < 4; j++) if (res.indices[i * 4 + j] === SEGMENTS.indexOf(seg)) s += res.weights[i * 4 + j]; return s; };
const used = (res) => { const out = new Set(); for (let i = 0; i < res.weights.length; i++) if (res.weights[i] > 0.001) out.add(SEGMENTS[res.indices[i]]); return out; };

test('vertex in the middle of the thigh follows the thigh', () => {
  const r = skinWeights([v(0.09, 0.7, 0.03), v(0.09, 0.3, 0.0)], ctx('vastus_lateralis_muscle__l'));
  expect(w(r, 0, 'thighl')).toBeGreaterThan(0.95);
});
test('vertex at the knee blends thigh and shank', () => {
  const r = skinWeights([v(0.09, 0.5, 0.05), v(0.09, 0.3, 0)], ctx('vastus_lateralis_muscle__l'));
  expect(w(r, 0, 'thighl')).toBeGreaterThan(0.3);
  expect(w(r, 0, 'shankl')).toBeGreaterThan(0.3);
});
test('weights sum to 1', () => {
  const r = skinWeights([v(0.05, 0.8, 0.1), v(0, 1.2, 0.1)], ctx('gluteus_maximus_muscle__l'));
  for (let i = 0; i < 2; i++) expect(r.weights.slice(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
});
test('abdominal muscle above the hips never follows a leg', () => {
  const verts = [v(0.05, 0.92, 0.1), v(0.05, 1.1, 0.12), v(0.08, 0.95, 0.09), v(0.06, 1.3, 0.1)];
  const legs = [...used(skinWeights(verts, ctx('rectus_abdominis_muscle__l')))].filter((s) => /thigh|shank|foot/.test(s));
  expect(legs).toEqual([]);
});
test('forearm muscle (centroid |x| > 0.19) uses only arm and trunk segments', () => {
  const verts = [v(0.21, 0.95, 0.0), v(0.24, 1.0, 0.0), v(0.26, 0.9, 0.0), v(0.25, 1.05, 0.0)];
  for (const s of used(skinWeights(verts, ctx('flexor_carpi_radialis__l')))) expect(['uarml', 'farml', 'pelvis', 'thorax', 'head']).toContain(s);
});
test('trunk muscle not crossing the shoulder never follows the arm', () => {
  const verts = [v(0.15, 1.3, -0.05), v(0.12, 1.2, -0.08), v(0.18, 1.35, -0.06)];
  for (const s of used(skinWeights(verts, ctx('serratus_posterior_superior_muscle__l')))) expect(s).not.toMatch(/arm/);
});
test('bones are rigid by name', () => {
  expect(rigidSegment('femur__l', 'l')).toBe('thighl');
  expect(rigidSegment('tibia__r', 'r')).toBe('shankr');
  expect(rigidSegment('vertebra_t5', null)).toBe('thorax');
  expect(rigidSegment('hip_bone__l', 'l')).toBe('pelvis');
  expect(rigidSegment('humerus__r', 'r')).toBe('uarmr');
  expect(rigidSegment('capitate_bone__l', 'l')).toBe('farml');
  expect(rigidSegment('talus__l', 'l')).toBe('footl');
  expect(rigidSegment('mandible', null)).toBe('head');
});
test('posed squat keeps the right foot flat on the ground next to the left', () => {
  const { bones, root } = buildSkeleton(J);
  applyPose(bones, { ankle: 30, knee: 120, hip: 115, lumbar: 10, trunk: 34, shoulder: 90, elbow: 10 });
  root.updateMatrixWorld(true);
  const pl = bones.footl.getWorldPosition(new Vector3()), pr = bones.footr.getWorldPosition(new Vector3());
  expect(Math.abs(pl.y - pr.y)).toBeLessThan(0.001);
  expect(Math.abs(pl.z - pr.z)).toBeLessThan(0.001);
  const q = bones.footr.getWorldQuaternion(new Quaternion());
  expect(MathUtils.radToDeg(q.angleTo(new Quaternion()))).toBeLessThan(0.5);
  // ramiona w poziomie: przedramię lewe kieruje się do przodu (+z)
  const e = bones.farml.getWorldPosition(new Vector3()), s = bones.uarml.getWorldPosition(new Vector3());
  expect(e.z - s.z).toBeGreaterThan(0.25);
});
