import { test, expect } from 'vitest';
import { partOf } from '../src/parts.js';

test.each([
  ['tendon', 'tendon'], ['ligament', 'tendon'], ['articular capsule', 'tendon'], ['bursa', 'tendon'], ['cartilage', 'tendon'],
  ['abductor', 'belly'], ['flexion fingers', 'belly'], ['orbicularis/constrictor', 'belly'], ['internal rotator', 'belly'],
  ['external rotation', 'belly'], ['extension hand/foot', 'belly'], ['trapezius', 'belly'], ['diaphragm', 'belly'], ['muscle', 'belly'],
  ['bone', 'other'], ['fascia', 'other'], ['', 'other'], [undefined, 'other'],
])('partOf(%s) = %s', (name, part) => expect(partOf(name)).toBe(part));

import { Group, Mesh, BufferGeometry, MeshStandardMaterial } from 'three';
import { normalizeStructureMeshes } from '../src/parts.js';

function part(matName, meshName) {
  const m = new Mesh(new BufferGeometry(), new MeshStandardMaterial());
  m.material.name = matName; m.name = meshName; return m;
}

test('multi-part node: children take the structure name and their own tissue/part', () => {
  const root = new Group();
  const g = new Group(); g.name = 'latissimus_dorsi_muscle__l'; g.userData = { name: 'Latissimus dorsi muscle', tissue: 'adductor' };
  g.add(part('atlas:adductor', 'latissimus_dorsi_muscle__l'), part('atlas:tendon', 'latissimus_dorsi_muscle__l_1'));
  const single = part('atlas:extension', 'gluteus_maximus_muscle__r'); single.userData = { name: 'Gluteus maximus muscle', tissue: 'extension' };
  root.add(g, single);
  const meshes = normalizeStructureMeshes(root);
  expect(meshes.map((m) => [m.name, m.userData.tissue, m.userData.part, m.userData.name])).toEqual([
    ['latissimus_dorsi_muscle__l', 'adductor', 'belly', 'Latissimus dorsi muscle'],
    ['latissimus_dorsi_muscle__l', 'tendon', 'tendon', 'Latissimus dorsi muscle'],
    ['gluteus_maximus_muscle__r', 'extension', 'belly', 'Gluteus maximus muscle'],
  ]);
});
