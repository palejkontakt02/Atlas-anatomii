/**
 * Wrap an async action so that only the most recent call's result is applied:
 * a slow earlier call (e.g. a search pick waiting for a 10 MB layer) cannot override a newer one.
 */
export function latestOnly(fn, onResult) {
  let seq = 0;
  return async (...args) => {
    const mine = ++seq;
    const result = await fn(...args);
    if (mine === seq) onResult(result, ...args);
    return result;
  };
}
