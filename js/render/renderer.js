import { CONFIG, lerp, clamp } from '../config.js';
import { avatarCache } from './avatarCache.js';

const PALETTE = {
  mutual: '#34c759',
  oneway: '#ff9f0a',
  repo: '#bf5af2',
  selected: '#0071e3',
  hover: '#ff9f0a',
  fallback: '#f5f5f7',
  label: 'rgba(142,142,147,0.78)',
  labelHi: '#ffffff',
};

const POP_DURATION = 400;
const POP_DURATION_REPO = 250;

function popScale(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

export class Renderer {
  constructor(canvas, graph, sim, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.graph = graph;
    this.sim = sim;
    this.camera = camera;

    this.selected = null;
    this.hovered = null;
    this.draggingId = null;

    this.renderPos = new Map();
    this._visibleNodes = new Set();

    this.filterMode = 'all';
    this.showArrows = true;
    this.showLabels = true;

    this.loadingNodes = new Set();

    this.W = 0;
    this.H = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this._refreshTheme();

    this._running = true;
    this._tick = this._tick.bind(this);

    this._resize();
    window.addEventListener('resize', () => this._resize());

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', () => this._refreshTheme());

    requestAnimationFrame(this._tick);
  }

  _refreshTheme() {
    this._bgColor = cssVar('--bg', '#0d1117');
    this._ringBase = cssVar('--ring-base', 'rgba(142,142,147,0.22)');
    this._labelColor = cssVar('--label-color', PALETTE.label);
    this._labelHiColor = cssVar('--label-hi', PALETTE.labelHi);
    this._labelBgColor = cssVar('--label-bg', 'rgba(13,17,23,0.85)');
    this._fallbackColor = cssVar('--fallback', PALETTE.fallback);
    this._initialsBg = cssVar('--initials-bg', '#3a3a44');
    this._initialsFg = cssVar('--initials-fg', '#f5f5f7');
  }

  _resize() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.camera.resize(this.W, this.H);
    this.sim.resize(this.W, this.H);
  }

  destroy() {
    this._running = false;
  }

  _tick(time) {
    if (!this._running) return;
    this.sim.step();
    this.camera.tick();
    this._updatePositions();
    this._computeVisibleNodes();
    this._draw();
    requestAnimationFrame(this._tick);
  }

  _updatePositions() {
    const lerpFactor = this.sim.sleeping ? CONFIG.RENDER.LERP_SLEEP : CONFIG.RENDER.LERP_AWAKE;
    for (const [id, pos] of this.sim.positions) {
      const cur = this.renderPos.get(id);
      if (!cur) {
        this.renderPos.set(id, { x: pos.x, y: pos.y });
      } else {
        cur.x = lerp(cur.x, pos.x, lerpFactor);
        cur.y = lerp(cur.y, pos.y, lerpFactor);
      }
    }
    for (const id of Array.from(this.renderPos.keys())) {
      if (!this.graph.nodes.has(id)) this.renderPos.delete(id);
    }
  }

  _computeVisibleNodes() {
    this._visibleNodes.clear();
    if (this.filterMode === 'all') {
      for (const id of this.graph.nodes.keys()) this._visibleNodes.add(id);
      return;
    }
    for (const [a, b, type] of this.graph.pairs()) {
      if (this.filterMode === 'mutual' && type === 'mutual') {
        this._visibleNodes.add(a);
        this._visibleNodes.add(b);
      } else if (this.filterMode === 'oneway' && type !== 'mutual') {
        this._visibleNodes.add(a);
        this._visibleNodes.add(b);
      }
    }
    for (const [userId, repos] of this.graph.repoEdges) {
      if (this._visibleNodes.has(userId)) {
        for (const rid of repos) this._visibleNodes.add(rid);
      }
    }
  }

  setFilter(mode) {
    this.filterMode = mode;
    this._computeVisibleNodes();
    if (this.sim) {
      const ids = Array.from(this._visibleNodes);
      this.sim.setActiveNodes(ids);
    }
  }
  setShowArrows(v) { this.showArrows = v; }
  setShowLabels(v) { this.showLabels = v; }
  setSelected(node) { this.selected = node; }
  setHovered(node) { this.hovered = node; }
  setDragging(id) { this.draggingId = id; }
  setLoading(id, loading) {
    if (loading) this.loadingNodes.add(id);
    else this.loadingNodes.delete(id);
  }

  pickNode(screenX, screenY) {
    const world = this.camera.screenToWorld(screenX, screenY);
    let bestNode = null;
    let bestDist = Infinity;

    const nodes = Array.from(this.graph.nodes.values()).reverse();
    for (const node of nodes) {
      if (!this._visibleNodes.has(node.id)) continue;
      const p = this.renderPos.get(node.id);
      if (!p) continue;

      const r = this._radius(node) + 4 / this.camera.scale;
      const dx = p.x - world.x;
      const dy = p.y - world.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= r && dist < bestDist) {
        bestDist = dist;
        bestNode = node;
      }
    }
    return bestNode;
  }

  bbox() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let any = false;
    for (const id of this._visibleNodes) {
      const p = this.renderPos.get(id);
      if (!p) continue;
      any = true;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    if (!any) return null;
    return { minX, minY, maxX, maxY };
  }

  _draw() {
    const ctx = this.ctx;
    const camera = this.camera;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this._bgColor;
    ctx.fillRect(0, 0, this.W * this.dpr, this.H * this.dpr);

    ctx.setTransform(
      camera.scale * this.dpr, 0,
      0, camera.scale * this.dpr,
      (-camera.x * camera.scale + this.W / 2) * this.dpr,
      (-camera.y * camera.scale + this.H / 2) * this.dpr
    );

    this._drawEdges(ctx);
    this._drawRepoEdges(ctx);
    this._drawNodes(ctx);
    if (this.showLabels) this._drawLabels(ctx);
  }

  _radius(node) {
    if (node.type === 'repo') return CONFIG.RENDER.BASE_NODE_RADIUS * 0.55;
    const deg = this.graph.degree(node.id);
    return CONFIG.RENDER.BASE_NODE_RADIUS + Math.min(deg, 30) * 0.35;
  }

  _drawEdges(ctx) {
    const scale = this.camera.scale;
    const now = Date.now();

    for (const [a, b, type] of this.graph.pairs()) {
      if (!this._visibleNodes.has(a) || !this._visibleNodes.has(b)) continue;
      const pa = this.renderPos.get(a);
      const pb = this.renderPos.get(b);
      if (!pa || !pb) continue;

      const nodeA = this.graph.nodeOf(a);
      const nodeB = this.graph.nodeOf(b);
      if (!nodeA || !nodeB) continue;
      if ((nodeA.addedAt ?? now) > now || (nodeB.addedAt ?? now) > now) continue;

      const isMutual = type === 'mutual';
      const color = isMutual ? PALETTE.mutual : PALETTE.oneway;

      const rA = this._radius(nodeA) + CONFIG.RENDER.RING_WIDTH;
      const rB = this._radius(nodeB) + CONFIG.RENDER.RING_WIDTH;
      const dx = pb.x - pa.x, dy = pb.y - pa.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const sx = pa.x + ux * rA;
      const sy = pa.y + uy * rA;
      const tx = pb.x - ux * rB;
      const ty = pb.y - uy * rB;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1 / scale;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      if (this.showArrows && !isMutual) {
        let tipX, tipY;
        if (type === 'oneway') {
          tipX = tx; tipY = ty;
        } else {
          tipX = sx; tipY = sy;
        }
        const dirX = type === 'oneway' ? ux : -ux;
        const dirY = type === 'oneway' ? uy : -uy;
        const baseDist = 8 / scale;
        const baseX = tipX - dirX * baseDist;
        const baseY = tipY - dirY * baseDist;
        const px = -dirY, py = dirX;
        const w = 4 / scale;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(baseX + px * w, baseY + py * w);
        ctx.lineTo(baseX - px * w, baseY - py * w);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  _drawRepoEdges(ctx) {
    const scale = this.camera.scale;
    const hoveredId = this.hovered?.id;
    const selectedId = this.selected?.id;
    const now = Date.now();

    for (const [userId, repoIds] of this.graph.repoEdges) {
      if (!this._visibleNodes.has(userId)) continue;
      const parentPos = this.renderPos.get(userId);
      if (!parentPos) continue;
      const parentNode = this.graph.nodeOf(userId);
      if (!parentNode || (parentNode.addedAt ?? now) > now) continue;

      for (const rid of repoIds) {
        const rp = this.renderPos.get(rid);
        if (!rp) continue;
        const repoNode = this.graph.nodeOf(rid);
        if (!repoNode || (repoNode.addedAt ?? now) > now) continue;
        if (!this._visibleNodes.has(rid)) continue;

        const involves = (hoveredId === userId || hoveredId === rid);
        const dim = hoveredId && !involves;
        const boosted = involves || (selectedId === userId || selectedId === rid);
        const alpha = dim ? 0.12 : (boosted ? 0.85 : 0.45);

        ctx.strokeStyle = `rgba(191,90,242,${alpha})`;
        ctx.lineWidth = (boosted ? 1.4 : 1) / scale;
        ctx.setLineDash([4 / scale, 3 / scale]);
        ctx.beginPath();
        ctx.moveTo(parentPos.x, parentPos.y);
        ctx.lineTo(rp.x, rp.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  _drawNodes(ctx) {
    const scale = this.camera.scale;
    const now = Date.now();

    for (const node of this.graph.nodes.values()) {
      if (!this._visibleNodes.has(node.id)) continue;
      const p = this.renderPos.get(node.id);
      if (!p) continue;

      const dur = node.type === 'repo' ? POP_DURATION_REPO : POP_DURATION;
      const age = now - (node.addedAt ?? now);
      if (age < 0) continue; // staggered - not yet appeared
      const popT = clamp(age / dur, 0, 1);
      const popS = popScale(popT);
      if (popS <= 0) continue;

      const r = this._radius(node) * popS;
      const alpha = popT;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (node.type === 'repo') {
        this._drawRepoNode(ctx, node, p, r, scale);
      } else {
        this._drawUserNode(ctx, node, p, r, scale);
      }

      ctx.restore();
    }

    for (const id of this.loadingNodes) {
      const p = this.renderPos.get(id);
      if (!p) continue;
      const node = this.graph.nodeOf(id);
      if (!node) continue;
      const r = this._radius(node);
      this._drawSpinner(ctx, p, r, scale, now);
    }
  }

  _drawSpinner(ctx, p, r, scale, now) {
    const spinnerR = r + 6 / scale;
    const angle = (now / 600) % (Math.PI * 2);
    const arcLen = Math.PI * 1.2;

    ctx.save();
    ctx.strokeStyle = PALETTE.selected;
    ctx.lineWidth = 2 / scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(p.x, p.y, spinnerR, angle, angle + arcLen);
    ctx.stroke();

    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, spinnerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawUserNode(ctx, node, p, r, scale) {
    const isSel = this.selected && this.selected.id === node.id;
    const isHov = this.hovered && this.hovered.id === node.id;
    const isDrag = this.draggingId === node.id;

    if (isSel || isHov) {
      const ringColor = isSel ? PALETTE.selected : PALETTE.hover;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6 / scale, 0, Math.PI * 2);
      ctx.fillStyle = ringColor + '22';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = this._fallbackColor;
    ctx.fill();

    if (node.avatar) {
      avatarCache.drawAvatar(ctx, node.avatar, p.x, p.y, r);
    } else {
      this._drawInitials(ctx, node, p, r);
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.lineWidth = (isSel || isHov ? 2.5 : 1.5) / scale;
    ctx.strokeStyle = isSel
      ? PALETTE.selected
      : isHov
        ? PALETTE.hover
        : (isDrag ? this._labelHiColor : this._ringBase);
    ctx.stroke();
  }

  _drawRepoNode(ctx, node, p, r, scale) {
    const isSel = this.selected && this.selected.id === node.id;
    const isHov = this.hovered && this.hovered.id === node.id;

    if (isSel || isHov) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 5 / scale, 0, Math.PI * 2);
      ctx.fillStyle = (isSel ? PALETTE.selected : PALETTE.hover) + '22';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.repo;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${Math.floor(r * 1.0)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letter = (node.name || '?').charAt(0).toUpperCase();
    ctx.fillText(letter, p.x, p.y);

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.lineWidth = (isSel || isHov ? 2 : 1) / scale;
    ctx.strokeStyle = isSel
      ? PALETTE.selected
      : isHov
        ? PALETTE.hover
        : 'rgba(191,90,242,0.6)';
    ctx.stroke();
  }

  _drawInitials(ctx, node, p, r) {
    const initials = (node.login || '?').slice(0, 2).toUpperCase();
    ctx.fillStyle = this._initialsBg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this._initialsFg;
    ctx.font = `${Math.floor(r * 0.9)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, p.x, p.y);
  }

  _drawLabels(ctx) {
    const scale = this.camera.scale;
    const drawAll = scale > 0.4;
    if (!drawAll && !this.hovered && !this.selected) return;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const node of this.graph.nodes.values()) {
      if (!this._visibleNodes.has(node.id)) continue;
      const p = this.renderPos.get(node.id);
      if (!p) continue;
      const isSel = this.selected && this.selected.id === node.id;
      const isHov = this.hovered && this.hovered.id === node.id;
      if (!drawAll && !isSel && !isHov) continue;

      const dur = node.type === 'repo' ? POP_DURATION_REPO : POP_DURATION;
      const age = Date.now() - (node.addedAt ?? Date.now());
      if (age < 0 || age < dur * 0.5) continue;

      const r = this._radius(node);
      const label = node.type === 'repo' ? node.name : node.login;
      const y = p.y + r + 6 / scale;

      ctx.fillStyle = (isSel || isHov) ? this._labelHiColor : this._labelColor;
      const fontSpec = node.type === 'repo' ? '10px' : '11px';
      ctx.font = `${isSel || isHov ? '600 ' : ''}${fontSpec} -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(label, p.x, y);
    }
  }
}
