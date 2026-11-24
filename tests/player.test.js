import { test, expect } from 'vitest';
import { createPlayer } from '../src/exercise/player.js';

test('plays, pauses, seeks, speed and wraps', () => {
  const p = createPlayer({ duration: 5 });
  p.tick(1); expect(p.progress()).toBeCloseTo(0.2);
  p.pause(); p.tick(1); expect(p.progress()).toBeCloseTo(0.2);
  p.seek(0.5); expect(p.playing).toBe(false); expect(p.time).toBeCloseTo(2.5);
  p.setSpeed(0.5); p.play(); p.tick(1); expect(p.time).toBeCloseTo(3.0);
  p.tick(5); expect(p.time).toBeCloseTo(0.5);
  p.toggle(); expect(p.playing).toBe(false);
});
