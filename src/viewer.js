import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SYSTEMS, HIDDEN_TISSUES, colorFor } from './config.js';
import { isTap, pickWithTolerance } from './pick.js';
import { createVisibility } from './visibility.js';
import { resolveMeshName } from './structures.js';

const BACKGROUND = '#14171c';

/**
 * 3D scene: on-demand layers, tap-to-select with tolerance, highlight, hide/isolate.
 * onSelect({id, side, fallbackEn, system}) or onSelect(null) for a tap on empty space.
 */
export function createViewer(canvas, { onSelect = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  camera.position.set(0, 1, 4);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3340, 1.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(0.5, 0.6, 1);
  camera.add(keyLight);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.screenSpacePanning = true;
  controls.target.set(0, 1, 0);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const materials = new Map();
  const highlight = new THREE.MeshStandardMaterial({
    color: '#45e0c2', emissive: '#0f6b5c', emissiveIntensity: 0.9, roughness: 0.5, side: THREE.DoubleSide,
  });
  const meshes = [];
  const visibility = createVisibility({ hiddenTissues: HIDDEN_TISSUES });
  let selected = [];
  let framed = false;
  const bodyCenter = new THREE.Vector3(0, 1, 0);

  // ---- rendering on demand ----
  let frameRequested = false;
  function render() {
    frameRequested = false;
    const moving = controls.update();
    renderer.render(scene, camera);
    if (moving) requestRender();
  }
  function requestRender() {
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(render);
    }
  }
  controls.addEventListener('change', requestRender);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function materialFor(color) {
    let m = materials.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
      materials.set(color, m);
    }
    return m;
  }

  function isShown(obj) {
    for (let o = obj; o; o = o.parent) if (!o.visible) return false;
    return true;
  }

  /** Fit `objects` in view; with fromOutside, look from the side of the body the objects are on. */
  function frame(objects, { fromOutside = false } = {}) {
    const box = new THREE.Box3();
    for (const o of [].concat(objects)) box.expandByObject(o);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.02);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const dist = (radius / Math.sin(fov / 2)) * (camera.aspect < 1 ? 1.25 / camera.aspect : 1.05);
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (!framed) dir.set(0, 0, 1);
    if (fromOutside) {
      const out = center.clone().sub(bodyCenter);
      out.y = 0;
      if (out.length() > 0.02) dir.copy(out.normalize()).setY(0.15).normalize();
    }
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(dir, Math.min(dist, 12));
    controls.update();
    requestRender();
  }

  async function loadLayer(system) {
    const def = SYSTEMS.find((s) => s.key === system);
    const gltf = await loader.loadAsync(def.file);
    const root = gltf.scene;
    root.name = `layer:${system}`;
    const added = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.system = system;
      o.userData.tissue = o.userData.tissue || '';
      o.material = materialFor(colorFor(system, o.userData.tissue, o.userData.name));
      o.userData.baseMaterial = o.material;
      added.push(o);
    });
    meshes.push(...added);
    visibility.applyTo(added);
    scene.add(root);
    if (!framed) {
      new THREE.Box3().setFromObject(root).getCenter(bodyCenter);
      frame(root);
      framed = true;
    }
    requestRender();
    return root;
  }

  function setHighlight(list) {
    for (const m of selected) m.material = m.userData.baseMaterial;
    selected = list;
    for (const m of selected) m.material = highlight;
    requestRender();
  }

  function meshesOf(id, side = null) {
    return meshes.filter((m) => {
      const r = resolveMeshName(m.name);
      return r.id === id && (!side || r.side === side);
    });
  }

  function describe(mesh) {
    const { id, side } = resolveMeshName(mesh.name);
    return { id, side, fallbackEn: mesh.userData.name || id, system: mesh.userData.system };
  }

  // ---- picking ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function raycastAt(x, y) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(meshes.filter(isShown), false);
    return hits[0] || null;
  }

  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !e.isPrimary) return;
    const up = { x: e.clientX, y: e.clientY, t: performance.now() };
    const start = down;
    down = null;
    if (!isTap(start, up)) return;
    const radius = e.pointerType === 'touch' ? 18 : 8;
    const hit = pickWithTolerance(raycastAt, up.x, up.y, radius);
    if (!hit) {
      setHighlight([]);
      onSelect(null);
      return;
    }
    const info = describe(hit.object);
    setHighlight([hit.object]);
    onSelect(info);
  });

  return {
    loadLayer,
    requestRender,
    /** Select a structure by id (both sides unless `side`), make it visible and frame it. */
    select(id, side = null, { focus = true } = {}) {
      const list = meshesOf(id, side);
      if (!list.length) return null;
      visibility.reveal(meshes, list);
      setHighlight(list);
      if (focus) frame(list, { fromOutside: true });
      return describe(list[0]);
    },
    clearSelection() {
      setHighlight([]);
    },
    hideSelected() {
      for (const m of selected) visibility.hide(meshes, m);
      setHighlight([]);
    },
    isolateSelected() {
      if (selected.length) visibility.isolate(meshes, selected[0]);
      requestRender();
    },
    showAll() {
      visibility.showAll(meshes);
      requestRender();
    },
    setTissueVisible(shown) {
      visibility.setTissuesVisible(meshes, shown);
      requestRender();
    },
    frame,
    cameraState: () => ({ position: camera.position.toArray(), target: controls.target.toArray() }),
    stats: () => ({ meshes: meshes.length, selected: selected.map((m) => m.name) }),
  };
}
