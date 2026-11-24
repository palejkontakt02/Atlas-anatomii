// Ćwiczenie jako dane: fazy, kąty w stawach i aktywność mięśni (% MVIC) w czasie cyklu t ∈ [0, 1].
export const JOINTS = ['hip', 'knee', 'ankle', 'trunk', 'lumbar', 'shoulder', 'elbow'];
const REQUIRED = ['id', 'name', 'duration', 'phases', 'angles', 'muscles', 'sources'];

export function parseExercise(json) {
  for (const k of REQUIRED) if (json[k] === undefined) throw new Error(`ćwiczenie: brak pola "${k}"`);
  return {
    ...json,
    status: json.status || 'do_weryfikacji',
    muscles: json.muscles.map((m) => ({ ...m, sources: m.sources || [], estimate: m.curve ? !!m.estimate : true })),
  };
}

const smooth = (u) => u * u * (3 - 2 * u);

/** Value of a keyframe list [[t, v], ...] at t (smoothstep between points, clamped at the ends). */
export function sampleCurve(points, t) {
  if (!points || !points.length) return 0;
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t1, v1] = points[i];
    if (t <= t1) {
      const [t0, v0] = points[i - 1];
      return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0 || 1));
    }
  }
  return points[points.length - 1][1];
}

export function sampleAngles(ex, t) {
  return Object.fromEntries(JOINTS.map((j) => [j, sampleCurve(ex.angles[j], t)]));
}

export function phaseAt(ex, t) {
  return ex.phases.find((p) => t >= p.from && t < p.to) || ex.phases[ex.phases.length - 1];
}

/** Stabilizers hold the trunk/joint (isometric) whenever the body moves; others follow the phase. */
function contractionOf(muscle, phase) {
  if (phase.contraction === 'none') return 'none';
  return muscle.role === 'stabilizer' ? 'isometric' : phase.contraction;
}

function describeMuscle(ex, m, t) {
  const phase = phaseAt(ex, t);
  return {
    ids: m.ids, role: m.role, mvic: m.curve ? sampleCurve(m.curve, t) : null, estimate: m.estimate,
    contraction: contractionOf(m, phase), range: m.range ?? null, note: m.note, sources: m.sources,
  };
}

export function activationAt(ex, structureId, t) {
  const m = ex.muscles.find((x) => x.ids.includes(structureId));
  return m ? describeMuscle(ex, m, t) : null;
}

const ROLE_ORDER = { main: 0, synergist: 1, stabilizer: 2, antagonist: 3 };
export function musclesNow(ex, t) {
  return ex.muscles.map((m) => describeMuscle(ex, m, t)).sort((a, b) => {
    if ((a.mvic === null) !== (b.mvic === null)) return a.mvic === null ? 1 : -1;
    if (a.mvic !== null) return b.mvic - a.mvic;
    return ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
  });
}

const increasing = (pts) => pts.every(([t], i) => t >= 0 && t <= 1 && (i === 0 || t > pts[i - 1][0]));

/** Problems with an exercise file, as readable messages (empty = valid). */
export function validateExercise(ex, structures) {
  const errors = [];
  for (const [joint, pts] of Object.entries(ex.angles)) {
    if (!JOINTS.includes(joint)) errors.push(`angles.${joint}: nieznany staw`);
    else if (!increasing(pts)) errors.push(`angles.${joint}: czasy muszą rosnąć w zakresie 0–1`);
  }
  const ph = [...ex.phases].sort((a, b) => a.from - b.from);
  if (ph[0]?.from !== 0 || ph[ph.length - 1]?.to !== 1 || ph.some((p, i) => i > 0 && p.from !== ph[i - 1].to)) {
    errors.push('fazy muszą pokrywać 0–1 bez przerw');
  }
  const sourceIds = new Set(ex.sources.map((s) => s.id));
  const missingSources = new Set();
  for (const m of ex.muscles) {
    for (const id of m.ids) if (!structures.has(id)) errors.push(`mięsień "${id}": brak w structures.csv`);
    if (m.curve && !increasing(m.curve)) errors.push(`mięsień "${m.ids[0]}": krzywa: czasy muszą rosnąć w zakresie 0–1`);
    if (!m.curve && !m.estimate) errors.push(`mięsień "${m.ids[0]}": bez krzywej musi mieć estimate: true`);
    for (const s of m.sources) if (!sourceIds.has(s)) missingSources.add(s);
  }
  for (const s of missingSources) errors.push(`źródło "${s}" nie jest zdefiniowane`);
  return errors;
}
