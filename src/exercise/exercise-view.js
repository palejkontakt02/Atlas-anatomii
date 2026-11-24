// Widok 3D ćwiczenia: kości i mięśnie z atlasu w ruchu, kolor mięśni z danych ćwiczenia.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { fetchModel } from '../model-file.js';
import { normalizeStructureMeshes } from '../parts.js';
import { resolveMeshName } from '../structures.js';
import { HIDDEN_TISSUES } from '../config.js';
import { isTap, pickWithTolerance } from '../pick.js';
import { sampleAngles, phaseAt, musclesNow } from './exercise-data.js';
import { createPlayer } from './player.js';
import { findJoints, buildSkeleton, segmentLines, skinWeights, applyPose, worldVerts } from './rig.js';
import { heatColor, ROLE_COLORS, ESTIMATE_OPACITY } from './heat.js';

const ACCENT = '#45e0c2';
const FASCIA_ID = /(^fascia_|_fascia(_|$))/;

/**
 * onFrame({t, playing, speed, phase, angles, muscles}) every rendered frame;
 * onSelect({id, side, fallbackEn} | null) on tap.
 */
export function createExerciseView(canvas, { exercise, onSelect = () => {}, onFrame = () => {} }) {
  const fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = fine;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#14171c');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  camera.position.set(1.9, 1.0, 2.1);
  const sun = new THREE.DirectionalLight(0xfff4e8, 2.2);
  sun.position.set(1.2, 3, 2);
  sun.castShadow = fine;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1, right: 1, top: 2, bottom: -0.2, near: 0.5, far: 6 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, new THREE.HemisphereLight(0xdfe8ff, 0x302820, 0.6));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.MeshStandardMaterial({ color: '#1c2129', roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0.75, 0.05);

  const player = createPlayer({ duration: exercise.duration });
  let colorMode = 'activity';
  let dirty = 3;
  const markDirty = () => { dirty = 2; };
  controls.addEventListener('change', markDirty);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    markDirty();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---- materiały ----
  const mat = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.58, side: THREE.DoubleSide, ...extra });
  const boneMat = mat('#d9ccb2', { roughness: 0.55, clearcoat: 0.15 });
  const tendonMat = mat('#cfc5b2', { roughness: 0.38, clearcoat: 0.5 });
  const restMuscleMats = ['#5e2723', '#66302a', '#582420'].map((c) => mat(c, { sheen: 0.5, sheenColor: '#c86a5c' }));
  const highlight = mat(ACCENT, { emissive: ACCENT, emissiveIntensity: 0.6 });
  const entryMats = new Map(); // wpis mięśnia ćwiczenia → materiał (kolor co klatkę)
  const entryOf = new Map(); // id struktury → wpis
  for (const m of exercise.muscles) {
    const em = mat('#888888', { sheen: 0.4, sheenColor: '#ffd0c0', emissive: '#000000' });
    entryMats.set(m, em);
    for (const id of m.ids) entryOf.set(id, m);
  }

  const meshes = [];
  let bones = null;
  let selected = [];

  async function load() {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const roots = await Promise.all(['bones', 'muscles'].map(async (k) => (await loader.parseAsync(await fetchModel(k), '')).scene));
    roots.forEach((r) => scene.add(r));
    scene.updateMatrixWorld(true);
    const boneMeshes = normalizeStructureMeshes(roots[0]);
    const muscleMeshes = normalizeStructureMeshes(roots[1]);
    const J = findJoints(boneMeshes);
    const rig = buildSkeleton(J);
    bones = rig.bones;
    scene.add(rig.root);
    const lines = segmentLines(J);
    const hipY = (J.hipl.y + J.hipr.y) / 2;
    const skin = (mesh, isBone) => {
      const { id, side } = resolveMeshName(mesh.name);
      const { indices, weights } = skinWeights(worldVerts(mesh), { name: mesh.name, side, isBone, lines, hipY });
      mesh.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
      mesh.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
      const sm = new THREE.SkinnedMesh(mesh.geometry, mesh.material);
      sm.name = mesh.name;
      sm.userData = { ...mesh.userData, id, side };
      sm.position.copy(mesh.position); sm.quaternion.copy(mesh.quaternion); sm.scale.copy(mesh.scale);
      sm.castShadow = fine; sm.receiveShadow = fine;
      sm.frustumCulled = false;
      mesh.parent.add(sm);
      mesh.parent.remove(mesh);
      sm.updateMatrixWorld(true);
      sm.bind(rig.skeleton, sm.matrixWorld.clone());
      meshes.push(sm);
      return sm;
    };
    for (const m of boneMeshes) { m.material = boneMat; skin(m, true); }
    let i = 0;
    for (const m of muscleMeshes) {
      const { id } = resolveMeshName(m.name);
      const hidden = HIDDEN_TISSUES.includes(m.userData.tissue) || FASCIA_ID.test(id);
      const entry = entryOf.get(id);
      m.material = m.userData.part === 'tendon' ? tendonMat
        : entry ? entryMats.get(entry)
          : restMuscleMats[i++ % restMuscleMats.length];
      const sm = skin(m, false);
      sm.visible = !hidden;
    }
    markDirty();
  }

  function paint(muscles) {
    for (const m of muscles) {
      const entry = exercise.muscles.find((x) => x.ids === m.ids);
      const em = entryMats.get(entry);
      const role = ROLE_COLORS[m.role];
      if (colorMode === 'activity') {
        if (m.mvic === null) {
          em.color.set(role); em.emissive.set('#000000');
          em.transparent = true; em.opacity = ESTIMATE_OPACITY;
        } else {
          const c = heatColor(m.mvic);
          em.color.set(c); em.emissive.set(c); em.emissiveIntensity = 0.15 + (0.45 * Math.min(m.mvic, 70)) / 70;
          em.transparent = false; em.opacity = 1;
        }
      } else {
        em.color.set(role); em.emissive.set(role);
        em.emissiveIntensity = m.mvic === null ? 0.1 : 0.1 + (0.4 * Math.min(m.mvic, 70)) / 70;
        em.transparent = m.mvic === null; em.opacity = m.mvic === null ? ESTIMATE_OPACITY : 1;
      }
    }
  }

  function setHighlight(list) {
    for (const m of selected) m.material = m.userData.baseMaterial;
    selected = list;
    for (const m of selected) { m.userData.baseMaterial = m.material; m.material = highlight; }
    markDirty();
  }

  // ---- klik ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  function raycastAt(x, y) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(meshes.filter(shown), false)[0] || null;
  }
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !e.isPrimary || e.button !== 0) return;
    const up = { x: e.clientX, y: e.clientY, t: performance.now() };
    const start = down; down = null;
    if (!isTap(start, up)) return;
    const hit = pickWithTolerance(raycastAt, up.x, up.y, e.pointerType === 'touch' ? 18 : 8);
    if (!hit) { setHighlight([]); onSelect(null); return; }
    const { id, side } = hit.object.userData;
    setHighlight(meshes.filter((m) => m.userData.id === id && m.userData.side === side));
    onSelect({ id, side, fallbackEn: hit.object.userData.name || id });
  });

  // ---- pętla ----
  let last = performance.now(), running = true;
  const ready = load();
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    controls.update();
    if (!bones) return;
    if (!player.playing && dirty <= 0) return;
    dirty--;
    player.tick(dt);
    const t = player.progress();
    const angles = sampleAngles(exercise, t);
    applyPose(bones, angles);
    const muscles = musclesNow(exercise, t);
    paint(muscles);
    renderer.render(scene, camera);
    onFrame({ t, playing: player.playing, speed: player.speed, phase: phaseAt(exercise, t), angles, muscles });
  }
  requestAnimationFrame(frame);

  return {
    ready,
    play() { player.play(); markDirty(); },
    pause() { player.pause(); markDirty(); },
    toggle() { player.toggle(); markDirty(); },
    seek(t01) { player.seek(t01); markDirty(); },
    setSpeed(s) { player.setSpeed(s); markDirty(); },
    setColorMode(mode) { colorMode = mode; markDirty(); },
    select(id) {
      setHighlight(id ? meshes.filter((m) => m.userData.id === id) : []);
    },
    cameraState: () => ({ position: camera.position.toArray(), target: controls.target.toArray(), t: player.progress() }),
    dispose() { running = false; renderer.dispose(); },
  };
}
