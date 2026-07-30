export class SimulationClient {
  constructor() {
    this.worker = null;
    this.positions = new Map();
    this.sleeping = false;
    this.temperature = 1;
    this.nodeCount = 0;
    this.edgeCount = 0;
    this._listeners = new Set();
    this._spawn();
  }

  _spawn() {
    this.worker = new Worker(
      new URL('../physics.worker.js', import.meta.url),
      { type: 'classic' }
    );
    this.worker.onmessage = (e) => this._handle(e.data);
    this.worker.onerror = (e) => {
      console.error('[sim] worker error:', e);
      this._emit({ type: 'error', error: e.message || 'worker error' });
    };
  }

  _handle(msg) {
    switch (msg.type) {
      case 'ready':
        this._emit({ type: 'ready' });
        break;

      case 'positions':
        this.positions.clear();
        for (const [id, p] of Object.entries(msg.positions)) {
          this.positions.set(Number(id), p);
        }
        this.sleeping = msg.sleeping;
        this.temperature = msg.temperature;
        this.nodeCount = msg.nodeCount;
        this.edgeCount = msg.edgeCount;
        this._emit({ type: 'tick' });
        break;

      case 'added':
      case 'removed':
      case 'cleared':
        this.sleeping = false;
        break;

      case 'state':
        this._emit({ type: 'state', nodes: msg.nodes, edges: msg.edges });
        break;
    }
  }

  _emit(evt) {
    for (const fn of this._listeners) fn(evt);
  }

  on(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _post(msg) {
    this.worker.postMessage(msg);
  }

  init(W, H, nodes, edges) {
    this._post({
      type: 'init',
      data: {
        W, H,
        nodes: nodes.map((n) => ({ id: n.id, mass: this._massFor(n) })),
        edges,
      },
    });
    this.sleeping = false;
  }

  add(nodes, edges) {
    this._post({
      type: 'addNodes',
      data: {
        nodes: nodes.map((n) => ({ id: n.id, mass: this._massFor(n) })),
        edges,
      },
    });
    this.sleeping = false;
  }

  remove(id) {
    this._post({ type: 'removeNode', data: { id } });
    this.sleeping = false;
  }

  pin(id, x, y) {
    this._post({ type: 'pinNode', data: { id, x, y } });
    this.sleeping = false;
  }

  unpin(id) {
    this._post({ type: 'unpinNode', data: { id } });
    this.sleeping = false;
  }

  reheat(temperature = 0.6) {
    this._post({ type: 'reheat', data: { temperature } });
    this.sleeping = false;
  }

  resize(W, H) {
    this._post({ type: 'resize', data: { W, H } });
  }

  clear() {
    this._post({ type: 'clear' });
    this.positions.clear();
    this.sleeping = false;
  }

  step() {
    if (!this.sleeping) this._post({ type: 'step' });
  }

  forceStep() {
    this._post({ type: 'step' });
  }

  _massFor(node) {
    return node.mass || 1;
  }

  destroy() {
    if (this.worker) this.worker.terminate();
    this.worker = null;
    this.positions.clear();
  }
}