import { test, expect } from 'vitest';
import { partOf } from '../src/parts.js';

test.each([
  ['tendon', 'tendon'], ['ligament', 'tendon'], ['articular capsule', 'tendon'], ['bursa', 'tendon'], ['cartilage', 'tendon'],
  ['abductor', 'belly'], ['flexion fingers', 'belly'], ['orbicularis/constrictor', 'belly'], ['internal rotator', 'belly'],
  ['external rotation', 'belly'], ['extension hand/foot', 'belly'], ['trapezius', 'belly'], ['diaphragm', 'belly'], ['muscle', 'belly'],
  ['bone', 'other'], ['fascia', 'other'], ['', 'other'], [undefined, 'other'],
])('partOf(%s) = %s', (name, part) => expect(partOf(name)).toBe(part));
