import { Color } from 'three';

// Mapa ciepła aktywności (% MVIC): przygaszony mięsień → pomarańcz → żółć przy ≥ 70%.
const STOPS = [[0, '#5a2f2c'], [35, '#e8742a'], [70, '#ffd23f']];
export const ROLE_COLORS = { main: '#ff4a2e', synergist: '#ffae2e', stabilizer: '#4aa3ff', antagonist: '#b07aff' };
export const ESTIMATE_OPACITY = 0.55;

const a = new Color(), b = new Color();
export function heatColor(mvic) {
  const x = Math.min(Math.max(mvic, 0), STOPS[STOPS.length - 1][0]);
  for (let i = 1; i < STOPS.length; i++) {
    const [x1, c1] = STOPS[i];
    if (x <= x1) {
      const [x0, c0] = STOPS[i - 1];
      if (x === x1) return c1;
      if (x === x0) return c0;
      a.set(c0); b.set(c1);
      return `#${a.lerpHSL(b, (x - x0) / (x1 - x0)).getHexString()}`;
    }
  }
  return STOPS[STOPS.length - 1][1];
}
