/**
 * SimulationClient.js — main-thread wrapper around the physics worker.
 *
 * Responsibilities:
 *   • Spawn the worker (classic worker, loaded as a separate file — works on
 *     GitHub Pages without bundling).
 *   • Always send messages directly to the worker. The browser queues them
 *     internally until the worker script has loaded, so there's no need for
 *     a pending-queue / ready handshake.
 *   • Track the latest computed positions in a Map for the renderer.
 *   • Expose a clean async-ish API to the rest of the app.
 *
 * Why no "ready" handshake:
 *   The original code queued messages until the worker posted `ready`, but
 *   `ready` was only sent by the worker *in response to `init`* — which was
 *   itself stuck in the queue. Result: deadlock, no simulation ever ran.
 *   postMessage() on a just-constructed Worker is safe; the browser buffers
 *   messages until the worker is ready to receive them.
 */

export class SimulationClient {
  constructor() {
    this.worker = null;
    this.positions = new Map();    // id -> {x, y}
    this.sleeping = false;         // start awake so the renderer's first step kicks the sim
    this.temperature = 1;
    this.nodeCount = 0;
    this.edgeCount = 0;
    this._listeners = new Set();
    this._spawn();
  }

  _spawn() {
    // Classic worker — broader browser support than module workers.
    this.worker = new Worker(
      new URL('./physics.worker.js', import.meta.url),
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
        // The worker has finished processing `init`. Nothing to do here —
        // we've already been sending step requests that the browser queued.
        this._emit({ type: 'ready' });
        break;

      case 'positions':
        // Replace the positions map.
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
        // Just acknowledgements; the renderer already has the new graph.
        // Optimistically wake so the next step request goes out.
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

  /** Subscribe to simulation events. Returns an unsubscribe fn. */
  on(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** Send a message to the worker. The browser queues internally. */
  _post(msg) {
    this.worker.postMessage(msg);
  }

  /** Initialize the simulation with the current graph. */
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

  /** Add nodes + edges incrementally. */
  add(nodes, edges) {
    this._post({
      type: 'addNodes',
      data: {
        nodes: nodes.map((n) => ({ id: n.id, mass: this._massFor(n) })),
        edges,
      },
    });
    this.sleeping = false;  // optimistically wake; worker will confirm
  }

  /** Remove a node + its incident edges. */
  remove(id) {
    this._post({ type: 'removeNode', data: { id } });
    this.sleeping = false;
  }

  /** Pin a node at a position (while dragging). */
  pin(id, x, y) {
    this._post({ type: 'pinNode', data: { id, x, y } });
    this.sleeping = false;
  }

  /** Release a pinned node. */
  unpin(id) {
    this._post({ type: 'unpinNode', data: { id } });
    this.sleeping = false;
  }

  /** Re-heat the simulation. */
  reheat(temperature = 0.6) {
    this._post({ type: 'reheat', data: { temperature } });
    this.sleeping = false;
  }

  /** Resize the simulation viewport. */
  resize(W, H) {
    this._post({ type: 'resize', data: { W, H } });
  }

  /** Clear everything. */
  clear() {
    this._post({ type: 'clear' });
    this.positions.clear();
    this.sleeping = false;
  }

  /** Request a single step. The renderer calls this every frame. */
  step() {
    if (!this.sleeping) this._post({ type: 'step' });
  }

  /** Force a step even if sleeping (used after structural changes). */
  forceStep() {
    this._post({ type: 'step' });
  }

  /** Node mass proxy — caller can pass degree-weighted mass via node.mass. */
  _massFor(node) {
    return node.mass || 1;
  }

  /** Wipe state + worker. */
  destroy() {
    if (this.worker) this.worker.terminate();
    this.worker = null;
    this.positions.clear();
  }
}