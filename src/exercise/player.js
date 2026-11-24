/** Playback clock for one exercise cycle: starts playing, wraps at the end, seek pauses. */
export function createPlayer({ duration }) {
  const p = {
    time: 0, playing: true, speed: 1,
    tick(dt) { if (p.playing) p.time = (p.time + dt * p.speed) % duration; },
    play() { p.playing = true; },
    pause() { p.playing = false; },
    toggle() { p.playing = !p.playing; },
    seek(t01) { p.playing = false; p.time = Math.min(Math.max(t01, 0), 1) * duration; },
    setSpeed(s) { p.speed = s; },
    progress() { return p.time / duration; },
  };
  return p;
}
