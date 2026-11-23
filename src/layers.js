/**
 * On-demand layer loading. `loadFn(system)` returns a Promise<Object3D>; each layer
 * loads at most once at a time, and its visibility follows the latest request.
 */
export class LayerManager {
  constructor(loadFn, onChange = () => {}) {
    this.loadFn = loadFn;
    this.onChange = onChange;
    this.states = new Map();
    this.roots = new Map();
    this.pending = new Map();
  }

  getState(system) {
    return this.states.get(system) || { visible: false, status: 'idle' };
  }

  getRoot(system) {
    return this.roots.get(system) || null;
  }

  _set(system, patch) {
    const next = { ...this.getState(system), ...patch };
    if (next.status !== 'error') delete next.error;
    this.states.set(system, next);
    this.onChange(system, next);
  }

  setVisible(system, visible) {
    const st = this.getState(system);
    if (st.status === 'ready') {
      this.roots.get(system).visible = visible;
      this._set(system, { visible });
      return Promise.resolve();
    }
    if (st.status === 'loading') {
      this.states.set(system, { ...st, visible });
      this.onChange(system, this.getState(system));
      return this.pending.get(system);
    }
    if (!visible) {
      if (st.visible) this._set(system, { visible: false });
      return Promise.resolve();
    }
    this._set(system, { visible: true, status: 'loading' });
    const p = this.loadFn(system).then(
      (root) => {
        this.roots.set(system, root);
        root.visible = this.getState(system).visible;
        this._set(system, { status: 'ready' });
      },
      (err) => {
        this._set(system, { visible: false, status: 'error', error: err?.message || String(err) });
      },
    ).finally(() => this.pending.delete(system));
    this.pending.set(system, p);
    return p;
  }

  retry(system) {
    return this.setVisible(system, true);
  }

  async ensureLoaded(system) {
    await this.setVisible(system, true);
    const st = this.getState(system);
    if (st.status === 'error') throw new Error(st.error);
    if (!st.visible) return this.ensureLoaded(system);
    return this.roots.get(system);
  }
}
