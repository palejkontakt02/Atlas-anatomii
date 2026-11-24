// Automatyczny szkielet dla nieruchomego modelu Z-Anatomy: kości sztywno w odcinkach,
// mięśnie płynnie między odcinkami (wagi z odległości), reguły sprawdzone w próbie 2.
import * as THREE from 'three';

export const SEGMENTS = ['footl', 'shankl', 'thighl', 'pelvis', 'thorax', 'head', 'uarml', 'farml', 'uarmr', 'farmr', 'thighr', 'shankr', 'footr'];
const IDX = Object.fromEntries(SEGMENTS.map((s, i) => [s, i]));

/** Muscles that attach to the humerus, so their vertices may follow the upper arm. */
export const SHOULDER_CROSSING = /(pector|latissimus|deltoid|teres_m|subscapularis|supraspinatus|infraspinatus|coracobrach|biceps_brachii|triceps|brachialis|brachioradialis|subacromial|subdeltoid|intertubercular|coracohumeral|glenohumeral|coraco_acromial)/;
const LEG_X = 0.198; // |x| granica nogi (≤ 0,16 m) i przedramienia (≥ 0,20 m) w modelu
const ARM_MESH_X = 0.19;

// [regex, segment bez strony, warunek dodatkowy, czy bez strony (środek ciała)]
const RIGID = [
  [/^femur__/, 'thigh'],
  [/^(tibia|fibula|patella)__/, 'shank'],
  [/^(calcaneus|talus|navicular_bone|cuboid_bone|\w*cuneiform_bone|\w*metatarsal_bone|\w*_finger_of_foot|sesamoid_bones_of_foot)__/, 'foot'],
  [/^humerus__/, 'uarm'],
  [/^(radius|ulna|scaphoid_bone|lunate_bone|triquetrum_bone|pisiform_bone|trapezium_bone|trapezoid_bone|capitate_bone|hamate_bone|\w*metacarpal_bone|\w*_finger_of_hand)__/, 'farm'],
  [/^(hip_bone|sacrum|coccyx|vertebra_l[45])/, 'pelvis', true],
  [/^(occipital|parietal|frontal|temporal|sphenoid|ethmoid|nasal_bone|lacrimal|palatine|zygomatic|vomer|maxilla|mandible|inferior_nasal|\w*incisor|\w*canine|\w*premolar|\w*molar|malleus|incus|stapes|atlas_c1|axis_c2|\w*cells_of_ethmoid|sinus_of|arytenoid_cartilage|corniculate_cartilage|cricoid_cartilage|thyroid_cartilage|nasal_septal_cartilage|major_alar_cartilage|lateral_process_of_nasal)/, 'head', true],
];

/** Segment a bone mesh follows rigidly (default: thorax). */
export function rigidSegment(name, side) {
  for (const [re, seg, mid] of RIGID) {
    if (!re.test(name)) continue;
    if (mid) return seg;
    if (side) return seg + side;
  }
  return 'thorax';
}

const worldVerts = (m) => {
  const p = m.geometry.attributes.position, out = [];
  for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
  return out;
};
const centroid = (vs) => vs.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(vs.length || 1);

/** Joint centres from the bone meshes (names as in structures.csv, with __l/__r). */
export function findJoints(boneMeshes) {
  const byName = (n) => boneMeshes.filter((m) => m.name === n);
  const verts = (n) => byName(n).flatMap(worldVerts);
  const J = {};
  for (const s of ['l', 'r']) {
    const f = verts(`femur__${s}`), fy = f.map((p) => p.y), fHi = Math.max(...fy), fLo = Math.min(...fy);
    const top = f.filter((p) => p.y > fHi - 0.05);
    const medX = top.map((p) => Math.abs(p.x)).sort((a, b) => a - b)[Math.floor(top.length / 3)];
    J[`hip${s}`] = centroid(top.filter((p) => Math.abs(p.x) <= medX));
    J[`knee${s}`] = centroid(f.filter((p) => p.y < fLo + 0.03)).add(new THREE.Vector3(0, -0.01, 0));
    J[`ankle${s}`] = centroid(verts(`talus__${s}`));
    const h = verts(`humerus__${s}`), hy = h.map((p) => p.y), hHi = Math.max(...hy), hLo = Math.min(...hy);
    J[`shoulder${s}`] = centroid(h.filter((p) => p.y > hHi - 0.04));
    J[`elbow${s}`] = centroid(h.filter((p) => p.y < hLo + 0.03));
    const r = verts(`radius__${s}`), rLo = Math.min(...r.map((p) => p.y));
    J[`wrist${s}`] = centroid(r.filter((p) => p.y < rLo + 0.02));
  }
  J.l2 = centroid(verts('vertebra_l2'));
  J.l4 = centroid(verts('vertebra_l4'));
  J.c7 = centroid(verts('vertebra_c7'));
  J.c1 = centroid(verts('atlas_c1'));
  return J;
}

/** Line segments used to weight soft tissue, in rest pose. */
export function segmentLines(J) {
  const hipMid = J.hipl.clone().add(J.hipr).multiplyScalar(0.5);
  const toe = (a) => a.clone().add(new THREE.Vector3(0, 0, 0.14)).setY(0.02);
  const hand = (s) => J[`wrist${s}`].clone().add(J[`wrist${s}`].clone().sub(J[`elbow${s}`]).multiplyScalar(0.7));
  return {
    pelvis: [hipMid, J.l4], thorax: [J.l2, J.c7], head: [J.c1, J.c1.clone().add(new THREE.Vector3(0, 0.16, 0.02))],
    thighl: [J.hipl, J.kneel], shankl: [J.kneel, J.anklel], footl: [J.anklel, toe(J.anklel)],
    thighr: [J.hipr, J.kneer], shankr: [J.kneer, J.ankler], footr: [J.ankler, toe(J.ankler)],
    uarml: [J.shoulderl, J.elbowl], farml: [J.elbowl, hand('l')], uarmr: [J.shoulderr, J.elbowr], farmr: [J.elbowr, hand('r')],
  };
}

const line3 = new THREE.Line3(), tmp = new THREE.Vector3();
const dist = (v, [a, b]) => { line3.set(a, b); line3.closestPointToPoint(v, true, tmp); return tmp.distanceTo(v); };

/**
 * Skin indices/weights (4 per vertex, indices into SEGMENTS) for one mesh in rest pose.
 * ctx: {name, side, isBone, lines, hipY}
 */
export function skinWeights(vertices, ctx) {
  const n = vertices.length, indices = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
  if (ctx.isBone) {
    const seg = IDX[rigidSegment(ctx.name, ctx.side)];
    for (let i = 0; i < n; i++) { indices[i * 4] = seg; weights[i * 4] = 1; }
    return { indices, weights };
  }
  const reachesThigh = Math.min(...vertices.map((p) => p.y)) < ctx.hipY - 0.06;
  const armMesh = Math.abs(centroid(vertices.map((p) => p.clone())).x) > ARM_MESH_X;
  const crossesShoulder = SHOULDER_CROSSING.test(ctx.name);
  vertices.forEach((v, i) => {
    const s = ctx.side || (v.x >= 0 ? 'l' : 'r');
    const legOk = !armMesh && reachesThigh && Math.abs(v.x) < LEG_X;
    const armOk = armMesh || crossesShoulder;
    const cand = ['pelvis', 'thorax', 'head', `thigh${s}`, `shank${s}`, `foot${s}`, `uarm${s}`, `farm${s}`]
      .filter((k) => (/^(thigh|shank|foot)/.test(k) ? legOk : /arm/.test(k) ? armOk : true))
      .map((k) => ({ k, w: 1 / (dist(v, ctx.lines[k]) + 0.006) ** 4 }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 3);
    const tot = cand.reduce((a, c) => a + c.w, 0);
    cand.forEach((c, j) => { indices[i * 4 + j] = IDX[c.k]; weights[i * 4 + j] = c.w / tot; });
  });
  return { indices, weights };
}

/** Bone chain rooted at the left ankle (foot on the ground): foot → shank → thigh → pelvis → {thorax → head, arms; right leg}. */
export function buildSkeleton(J) {
  const bones = {};
  const mk = (name, parent, at, parentAt) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.copy(at.clone().sub(parentAt));
    parent.add(b);
    bones[name] = b;
    return b;
  };
  const root = new THREE.Bone();
  root.name = 'footl';
  root.position.copy(J.anklel);
  bones.footl = root;
  mk('shankl', root, J.anklel, J.anklel);
  mk('thighl', bones.shankl, J.kneel, J.anklel);
  mk('pelvis', bones.thighl, J.hipl, J.kneel);
  mk('thorax', bones.pelvis, J.l2, J.hipl);
  mk('head', bones.thorax, J.c1, J.l2);
  mk('uarml', bones.thorax, J.shoulderl, J.l2);
  mk('farml', bones.uarml, J.elbowl, J.shoulderl);
  mk('uarmr', bones.thorax, J.shoulderr, J.l2);
  mk('farmr', bones.uarmr, J.elbowr, J.shoulderr);
  mk('thighr', bones.pelvis, J.hipr, J.hipl);
  mk('shankr', bones.thighr, J.kneer, J.hipr);
  mk('footr', bones.shankr, J.ankler, J.kneer);
  root.updateMatrixWorld(true);
  return { skeleton: new THREE.Skeleton(SEGMENTS.map((s) => bones[s])), bones, root };
}

/** Pose from joint angles in degrees (sampleAngles); "shoulder" is the arm's elevation in the world (90 = horizontal). */
export function applyPose(bones, angles) {
  const r = THREE.MathUtils.degToRad;
  const a = r(angles.ankle || 0), k = r(angles.knee || 0), h = r(angles.hip || 0), lum = r(angles.lumbar || 0);
  bones.shankl.rotation.x = a;
  bones.thighl.rotation.x = -k;
  bones.pelvis.rotation.x = h;
  bones.thorax.rotation.x = lum;
  bones.thighr.rotation.x = -h;
  bones.shankr.rotation.x = k;
  bones.footr.rotation.x = -a;
  const trunkWorld = a - k + h + lum;
  bones.head.rotation.x = -trunkWorld * 0.55; // wzrok przed siebie
  const arm = -(r(angles.shoulder || 0) + trunkWorld);
  bones.uarml.rotation.x = arm;
  bones.uarmr.rotation.x = arm;
  bones.farml.rotation.x = -r(angles.elbow || 0);
  bones.farmr.rotation.x = -r(angles.elbow || 0);
}

export { worldVerts };
