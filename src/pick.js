/** Pointer down/up pair is a tap (select), not an orbit drag or a long press. */
export function isTap(down, up, maxMove = 6, maxMs = 500) {
  return Math.hypot(up.x - down.x, up.y - down.y) <= maxMove && up.t - down.t <= maxMs;
}

/** Raycast at (x, y); if nothing is hit, try 8 points on a ring and keep the nearest hit. */
export function pickWithTolerance(raycastAt, x, y, radius = 12) {
  const center = raycastAt(x, y);
  if (center) return center;
  let best = null;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const hit = raycastAt(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    if (hit && (!best || hit.distance < best.distance)) best = hit;
  }
  return best;
}
