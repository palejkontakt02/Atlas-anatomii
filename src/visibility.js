import { resolveMeshName } from './structures.js';

/**
 * Per-mesh visibility from three independent reasons: hidden by the user, a tissue
 * hidden by default (fascia…), and isolation of one structure (both sides).
 */
export function createVisibility({ hiddenTissues = [] } = {}) {
  let isolated = null;
  let tissuesShown = false;
  const tissueSet = new Set(hiddenTissues);

  const idOf = (m) => resolveMeshName(m.name).id;
  const refresh = (m) => {
    const tissueHidden = !tissuesShown && !m.userData.revealed && tissueSet.has(m.userData.tissue);
    const isoHidden = isolated !== null && idOf(m) !== isolated;
    const isTarget = isolated !== null && idOf(m) === isolated;
    m.visible = !m.userData.hiddenByUser && (isTarget || (!tissueHidden && !isoHidden));
  };

  return {
    isolatedId: () => isolated,
    applyTo(meshes) { meshes.forEach(refresh); },
    hide(meshes, target) {
      target.userData.hiddenByUser = true;
      meshes.forEach(refresh);
    },
    isolate(meshes, target) {
      isolated = idOf(target);
      meshes.forEach(refresh);
    },
    /** Make `targets` visible again (search result): undo user hiding, foreign isolation, hidden tissue. */
    reveal(meshes, targets) {
      for (const t of targets) {
        t.userData.hiddenByUser = false;
        t.userData.revealed = true;
        if (isolated !== null && idOf(t) !== isolated) isolated = null;
      }
      meshes.forEach(refresh);
    },
    showAll(meshes) {
      isolated = null;
      for (const m of meshes) {
        m.userData.hiddenByUser = false;
        m.userData.revealed = false;
      }
      meshes.forEach(refresh);
    },
    setTissuesVisible(meshes, shown) {
      tissuesShown = shown;
      meshes.forEach(refresh);
    },
  };
}
