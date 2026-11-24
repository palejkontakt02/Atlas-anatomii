// Z-Anatomy names muscle materials by function (abductor, flexion…) and connective tissue by tissue (tendon…).
const TENDON = /tendon|aponeuros|ligament|articular capsule|bursa|cartilage/;
const BELLY = /muscle|abduct|adduct|flexion|flexor|extension|extensor|levator|depressor|rotat|orbicularis|constrictor|superficial|biarticular|ingestion|phonation|masticator|trapezius|diaphragm/;

/** Which part of a structure a material slot represents: muscle belly, tendon-like tissue, or anything else. */
export function partOf(materialName) {
  const n = (materialName || '').toLowerCase();
  if (TENDON.test(n)) return 'tendon';
  if (BELLY.test(n)) return 'belly';
  return 'other';
}
