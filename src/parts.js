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

/**
 * GLTFLoader turns a node with several primitives into a Group whose child meshes get suffixed names.
 * Give every mesh its structure's node name and extras, plus its own tissue (material) and part.
 * Returns all meshes under root.
 */
export function normalizeStructureMeshes(root) {
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    let holder = o;
    while (holder && !holder.userData?.name && holder.parent) holder = holder.parent;
    if (!holder?.userData?.name) holder = o;
    const tissue = ((o.material && o.material.name) || holder.userData.tissue || '').replace(/^atlas:/, '');
    o.name = holder.name;
    o.userData = { ...holder.userData, tissue, part: partOf(tissue) };
    meshes.push(o);
  });
  return meshes;
}
