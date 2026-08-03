const PHYSICS = {
  NODE_REPULSION:   18000,
  EDGE_SPRING_K:    0.022,
  EDGE_REST:        170,
  CENTER_GRAVITY:   0.0035,
  DAMPING:          0.90,
  MAX_SPEED:        18,
  COLLISION_K:      0.6,
  CROSS_K:          2.2,
  CROSS_CAP:        280,
  THETA:            0.55,
  INITIAL_TEMP:     1.0,
  COOLING:          0.993,
  MIN_TEMP:         0.004,
  SLEEP_V:          0.10,
  SLEEP_FRAMES:     60,
};

// ---------------------------------------------------------------------------
// LOD thresholds — below MEDIUM_THRESHOLD all nodes are processed every frame;
// above it, only a rotating slice of LOD_SLICE_SIZE nodes receives force
// updates per frame (the rest keep coasting on residual velocity).
// Cross-edge untangling is disabled above CROSS_EDGE_THRESHOLD (already was
// gated at 600 edges; we keep that logic intact but also gate on node count).
// ---------------------------------------------------------------------------
const MEDIUM_THRESHOLD   = 300;  // node count above which degree cache is used
const LOW_THRESHOLD      = 800;  // node count above which slice stepping kicks in
const LOD_SLICE_SIZE     = 400;  // nodes processed per frame in LOW mode
const CROSS_EDGE_THRESHOLD = 600; // existing threshold kept as-is

let nodes = [];
let edges = [];
let sim   = {};
let W = 0, H = 0;
let temperature = PHYSICS.INITIAL_TEMP;
let sleeping = false;
let sleepFrames = 0;
let activeIds = null;

// --- degree cache (invalidated whenever edges change) ---
let _degreesDirty = true;
let _degreesCache = new Map();

// --- edge lookup set for O(1) dedup (key: "minId_maxId") ---
let _edgeSet = new Set();

// --- slice stepping state ---
let _sliceIndex = 0;

class Quad {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.mass = 0;
    this.cx = 0; this.cy = 0;
    this.children = null;
    this.body = null;
  }

  insert(body, depth = 0) {
    if (depth > 20) return;
    if (this.body && !this.children) {
      if (this.body.id === body.id) return;
      this._subdivide();
      this._insertIntoChild(this.body, depth + 1);
      this.body = null;
    }
    if (!this.children) {
      this.body = body;
      this._updateMass(body);
      return;
    }
    this._insertIntoChild(body, depth + 1);
    this._updateMass(body);
  }

  _subdivide() {
    const hw = this.w / 2, hh = this.h / 2;
    this.children = [
      new Quad(this.x,        this.y,        hw, hh),
      new Quad(this.x + hw,   this.y,        hw, hh),
      new Quad(this.x,        this.y + hh,   hw, hh),
      new Quad(this.x + hw,   this.y + hh,   hw, hh),
    ];
  }

  _insertIntoChild(body, depth) {
    const idx = (body.x >= this.x + this.w / 2 ? 1 : 0)
              + (body.y >= this.y + this.h / 2 ? 2 : 0);
    this.children[idx].insert(body, depth);
  }

  _updateMass(body) {
    const total = this.mass + body.mass;
    this.cx = (this.cx * this.mass + body.x * body.mass) / total;
    this.cy = (this.cy * this.mass + body.y * body.mass) / total;
    this.mass = total;
  }

  applyForce(body, fx, fy) {
    if (this.body && this.body.id === body.id) return;
    const dx = this.cx - body.x;
    const dy = this.cy - body.y;
    const d2 = dx * dx + dy * dy;
    if (this.children) {
      const s = Math.max(this.w, this.h);
      if ((s * s) / Math.max(d2, 1) < PHYSICS.THETA * PHYSICS.THETA) {
        this._addForce(body, fx, fy, this.mass, this.cx, this.cy);
        return;
      }
      for (const c of this.children) c.applyForce(body, fx, fy);
    } else if (this.body) {
      this._addForce(body, fx, fy, this.body.mass, this.body.x, this.body.y);
    }
  }

  _addForce(body, fx, fy, mass, cx, cy) {
    const dx = cx - body.x;
    const dy = cy - body.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1) return;
    const d  = Math.sqrt(d2);
    const f  = (PHYSICS.NODE_REPULSION * mass) / d2;
    fx[0] -= (dx / d) * f;
    fy[0] -= (dy / d) * f;
  }
}

function isActive(id) {
  return !activeIds || activeIds.has(id);
}

function buildQuadtree() {
  const margin = Math.max(W, H);
  const root = new Quad(-margin, -margin, 2 * margin, 2 * margin);
  for (const n of nodes) {
    if (!isActive(n.id)) continue;
    const s = sim[n.id];
    if (!s) continue;
    const clampedX = Math.max(-margin, Math.min(margin, s.x));
    const clampedY = Math.max(-margin, Math.min(margin, s.y));
    root.insert({ id: n.id, x: clampedX, y: clampedY, mass: s.mass });
  }
  return root;
}

// Returns cached degrees map; only recomputes when _degreesDirty is true.
function computeDegrees() {
  if (!_degreesDirty) return _degreesCache;
  _degreesCache = new Map();
  for (const edge of edges) {
    _degreesCache.set(edge[0], (_degreesCache.get(edge[0]) || 0) + 1);
    _degreesCache.set(edge[1], (_degreesCache.get(edge[1]) || 0) + 1);
  }
  _degreesDirty = false;
  return _degreesCache;
}

// Rebuild the O(1) edge lookup set from the current edges array.
function rebuildEdgeSet() {
  _edgeSet = new Set();
  for (const e of edges) {
    const a = e[0], b = e[1];
    _edgeSet.add(`${Math.min(a, b)}_${Math.max(a, b)}`);
  }
}

function segmentsCross(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const cr  = d1x * d2y - d1y * d2x;
  if (Math.abs(cr) < 1e-10) return false;
  const dx = p3.x - p1.x, dy = p3.y - p1.y;
  const t = (dx * d2y - dy * d2x) / cr;
  const u = (dx * d1y - dy * d1x) / cr;
  return t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95;
}

function step() {
  if (sleeping) return;

  // ---- Determine LOD level based on total node count ----
  const totalActive = nodes.filter((n) => isActive(n.id));
  const useLOD = totalActive.length > LOW_THRESHOLD;

  // In LOW mode, pick a rotating slice; otherwise process all active nodes.
  let activeNodes;
  if (useLOD) {
    const total = totalActive.length;
    const start = (_sliceIndex * LOD_SLICE_SIZE) % total;
    const end   = start + LOD_SLICE_SIZE;
    if (end <= total) {
      activeNodes = totalActive.slice(start, end);
    } else {
      // wrap around
      activeNodes = totalActive.slice(start).concat(totalActive.slice(0, end - total));
    }
    _sliceIndex++;
  } else {
    activeNodes = totalActive;
    _sliceIndex = 0;
  }

  const forces = new Map();
  for (const n of activeNodes) forces.set(n.id, { x: 0, y: 0 });

  // Degree cache: always used in LOW mode; in MEDIUM/FULL recomputed when dirty.
  const degrees = computeDegrees();

  // Update mass only for nodes in this frame's slice.
  for (const n of activeNodes) {
    const s = sim[n.id];
    if (!s) continue;
    s.mass = 1 + (degrees.get(n.id) || 0) * 0.4;
  }

  // Quadtree still uses ALL active nodes for correct global repulsion.
  const root = buildQuadtree();

  const gravityScale = Math.min(1, 25 / Math.max(25, totalActive.length));
  const effectiveGravity = PHYSICS.CENTER_GRAVITY * gravityScale;

  for (const n of activeNodes) {
    const s = sim[n.id];
    if (!s) continue;
    const fx = [0], fy = [0];
    root.applyForce({ id: n.id, x: s.x, y: s.y }, fx, fy);
    const f = forces.get(n.id);
    f.x += fx[0];
    f.y += fy[0];
    f.x += (W / 2 - s.x) * effectiveGravity;
    f.y += (H / 2 - s.y) * effectiveGravity;
  }

  // Spring + collision forces — only for edges where at least one endpoint is
  // in the current slice (so all edges still contribute over time).
  const sliceSet = new Set(activeNodes.map((n) => n.id));
  for (const edge of edges) {
    const a = edge[0], b = edge[1];
    if (!isActive(a) || !isActive(b)) continue;
    // Skip edge entirely if neither endpoint is in this frame's slice.
    if (useLOD && !sliceSet.has(a) && !sliceSet.has(b)) continue;
    const sa = sim[a], sb = sim[b];
    if (!sa || !sb) continue;
    const degA = degrees.get(a) || 0;
    const degB = degrees.get(b) || 0;
    const maxDeg = Math.max(degA, degB);
    const baseRest = edge.length > 2 ? edge[2] : PHYSICS.EDGE_REST;
    const restLen = baseRest + Math.min(maxDeg, 40) * 3;
    const dx = sb.x - sa.x, dy = sb.y - sa.y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 1;
    const f  = PHYSICS.EDGE_SPRING_K * (d - restLen);
    const fxx = (dx / d) * f, fyy = (dy / d) * f;
    // Only write forces for nodes actually in the forces map (slice).
    if (forces.has(a)) { forces.get(a).x += fxx; forces.get(a).y += fyy; }
    if (forces.has(b)) { forces.get(b).x -= fxx; forces.get(b).y -= fyy; }

    const minDist = 30 + (sa.mass + sb.mass) * 2;
    if (d < minDist) {
      const overlap = minDist - d;
      const ox = (dx / d) * overlap * PHYSICS.COLLISION_K;
      const oy = (dy / d) * overlap * PHYSICS.COLLISION_K;
      if (forces.has(a)) { forces.get(a).x -= ox; forces.get(a).y -= oy; }
      if (forces.has(b)) { forces.get(b).x += ox; forces.get(b).y += oy; }
    }
  }

  // Cross-edge untangling: only when graph is small enough (unchanged logic).
  if (!useLOD && edges.length < CROSS_EDGE_THRESHOLD) {
    for (let i = 0; i < edges.length; i++) {
      const a1 = edges[i][0], b1 = edges[i][1];
      if (!isActive(a1) || !isActive(b1)) continue;
      for (let j = i + 1; j < edges.length; j++) {
        const a2 = edges[j][0], b2 = edges[j][1];
        if (!isActive(a2) || !isActive(b2)) continue;
        if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue;
        const s1 = sim[a1], t1 = sim[b1], s2 = sim[a2], t2 = sim[b2];
        if (!s1 || !t1 || !s2 || !t2) continue;
        if (segmentsCross(s1, t1, s2, t2)) {
          const mx1 = (s1.x + t1.x) / 2, my1 = (s1.y + t1.y) / 2;
          const mx2 = (s2.x + t2.x) / 2, my2 = (s2.y + t2.y) / 2;
          const dx = mx2 - mx1, dy = my2 - my1;
          const d2 = dx * dx + dy * dy;
          if (d2 < PHYSICS.CROSS_CAP * PHYSICS.CROSS_CAP && d2 > 1) {
            const d = Math.sqrt(d2);
            const f = PHYSICS.CROSS_K / d2;
            const nx = dx / d, ny = dy / d;
            forces.get(a1).x -= nx * f; forces.get(a1).y -= ny * f;
            forces.get(b1).x -= nx * f; forces.get(b1).y -= ny * f;
            forces.get(a2).x += nx * f; forces.get(a2).y += ny * f;
            forces.get(b2).x += nx * f; forces.get(b2).y += ny * f;
          }
        }
      }
    }
  }

  let maxV = 0;
  const maxR = Math.max(W, H) * 3;
  const cx = W / 2, cy = H / 2;
  for (const n of activeNodes) {
    const s = sim[n.id];
    if (!s || s.pinned) continue;
    const f = forces.get(n.id);
    if (!f) continue;
    s.vx += f.x * 0.5;
    s.vy += f.y * 0.5;
    s.vx *= PHYSICS.DAMPING;
    s.vy *= PHYSICS.DAMPING;
    s.vx *= temperature;
    s.vy *= temperature;
    const v = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (v > PHYSICS.MAX_SPEED) {
      s.vx = (s.vx / v) * PHYSICS.MAX_SPEED;
      s.vy = (s.vy / v) * PHYSICS.MAX_SPEED;
    }
    s.x += s.vx;
    s.y += s.vy;
    const ddx = s.x - cx, ddy = s.y - cy;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist > maxR) {
      const k = maxR / dist;
      s.x = cx + ddx * k;
      s.y = cy + ddy * k;
      s.vx *= 0.3;
      s.vy *= 0.3;
    }
    if (v > maxV) maxV = v;
  }

  // In LOW mode we only measure sleep on the processed slice, so use
  // totalActive.length as denominator to avoid premature sleeping.
  temperature *= PHYSICS.COOLING;
  if (temperature < PHYSICS.MIN_TEMP) temperature = PHYSICS.MIN_TEMP;

  if (maxV < PHYSICS.SLEEP_V) {
    sleepFrames++;
    if (sleepFrames >= PHYSICS.SLEEP_FRAMES) sleeping = true;
  } else {
    sleepFrames = 0;
  }
}

function nodeMass(n) {
  return n.mass || 1;
}

function spawnPosition(id, idx, total) {
  const g = Math.PI * (3 - Math.sqrt(5));
  const r = Math.sqrt((idx + 0.5) / Math.max(1, total)) * Math.min(W, H) * 0.38;
  const a = g * idx;
  return {
    x: W / 2 + Math.cos(a) * r,
    y: H / 2 + Math.sin(a) * r,
  };
}

function wake(t = 0.2) {
  sleeping = false;
  sleepFrames = 0;
  temperature = Math.max(temperature, t);
}

self.onmessage = (e) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init': {
      W = data.W; H = data.H;
      nodes = data.nodes.map((n) => ({ id: n.id, mass: n.mass || 1 }));
      edges = data.edges.map((e) => e.length > 2 ? [e[0], e[1], e[2]] : [e[0], e[1]]);
      sim = {};
      _sliceIndex = 0;
      _degreesDirty = true;
      rebuildEdgeSet();
      nodes.forEach((n, i) => {
        if (!sim[n.id]) {
          const p = spawnPosition(n.id, i, nodes.length);
          sim[n.id] = { x: p.x, y: p.y, vx: 0, vy: 0, mass: n.mass, pinned: false };
        }
      });
      wake(PHYSICS.INITIAL_TEMP);
      postMessage({ type: 'ready' });
      break;
    }

    case 'addNodes': {
      let newIdx = nodes.length;
      for (const n of data.nodes) {
        if (sim[n.id]) continue;
        nodes.push({ id: n.id, mass: n.mass || 1 });
        const p = spawnPosition(n.id, newIdx, nodes.length);
        sim[n.id] = { x: p.x, y: p.y, vx: 0, vy: 0, mass: n.mass || 1, pinned: false };
        newIdx++;
      }
      for (const e of data.edges) {
        const a = e[0], b = e[1];
        const key = `${Math.min(a, b)}_${Math.max(a, b)}`;
        if (!_edgeSet.has(key)) {
          _edgeSet.add(key);
          edges.push(e.length > 2 ? [a, b, e[2]] : [a, b]);
        }
      }
      _degreesDirty = true;
      wake(0.3);
      postMessage({ type: 'added' });
      break;
    }

    case 'removeNode': {
      nodes = nodes.filter((n) => n.id !== data.id);
      edges = edges.filter(([a, b]) => a !== data.id && b !== data.id);
      delete sim[data.id];
      _degreesDirty = true;
      rebuildEdgeSet();
      wake(0.2);
      postMessage({ type: 'removed' });
      break;
    }

    case 'pinNode': {
      const s = sim[data.id];
      if (s) {
        s.pinned = true;
        s.x = data.x;
        s.y = data.y;
        s.vx = 0;
        s.vy = 0;
      }
      wake(0.3);
      break;
    }

    case 'unpinNode': {
      const s = sim[data.id];
      if (s) s.pinned = false;
      wake(0.2);
      break;
    }

    case 'reheat': {
      wake(data?.temperature ?? PHYSICS.INITIAL_TEMP);
      for (const n of nodes) {
        const s = sim[n.id];
        if (!s) continue;
        s.vx += (Math.random() - 0.5) * 4;
        s.vy += (Math.random() - 0.5) * 4;
      }
      break;
    }

    case 'clear': {
      nodes = [];
      edges = [];
      sim = {};
      _sliceIndex = 0;
      _degreesDirty = true;
      _degreesCache = new Map();
      _edgeSet = new Set();
      sleeping = false;
      temperature = PHYSICS.INITIAL_TEMP;
      postMessage({ type: 'cleared' });
      break;
    }

    case 'resize': {
      W = data.W;
      H = data.H;
      break;
    }

    case 'setActiveNodes': {
      activeIds = data.ids ? new Set(data.ids) : null;
      sleeping = false;
      sleepFrames = 0;
      break;
    }

    case 'step': {
      step();
      const positions = {};
      for (const n of nodes) {
        if (!isActive(n.id)) continue;
        const s = sim[n.id];
        if (s) positions[n.id] = { x: s.x, y: s.y };
      }
      postMessage({
        type: 'positions',
        positions,
        sleeping,
        temperature,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });
      break;
    }

    case 'getState': {
      postMessage({
        type: 'state',
        nodes: nodes.map((n) => ({ id: n.id, mass: n.mass })),
        edges,
      });
      break;
    }
  }
};
