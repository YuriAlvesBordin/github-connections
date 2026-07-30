/**
 * renderer.js: canvas renderer for the graph.
 *
 * Draws:
 *   1. Edges (filtered by current mode) - straight with arrows on one-way
 *   2. Repo edges (user -> repo) - dashed, gray, always visible
 *   3. Nodes - circular avatars (users) or smaller purple dots (repos)
 *   4. Labels - only when zoomed in or node is hovered/selected
 *
 * Pop-in animation: each node has an `addedAt` timestamp. For the first
 * POP_DURATION ms after appearing, the node scales from 0 to 1 with a
 * slight overshoot (ease-out-back) and fades in opacity.
 *
 * Filter isolation: when filterMode is 'mutual' or 'oneway', only nodes
 * that are incident to at least one edge of the matching type are drawn.
 * Repo nodes are drawn only if their parent user is visible.
 */

import { CONFIG, lerp, clamp, smoothstep } from '../config.js';
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
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 - c3 * Math.pow(1 - t, 3) + c1 * Math.pow(1 - t, 4);
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
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
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

    this._ringBase = cssVar('--ring-base', '#8e8e93');
    this._labelColor = cssVar('--label-color', PALETTE.label);
    this._labelHiColor = cssVar('--label-hi', PALETTE.labelHi);
    this._labelBgColor = cssVar('--label-bg', 'rgba(13,17,23,0.85)');
    this._fallbackColor = cssVar('--fallback', PALETTE.fallback);
    this._initialsBg = cssVar('--initials-bg', '#3a3a44');
    this._initialsFg = cssVar('--initials-fg', '#f5f5f7');

    this._running = true;
    this._lastTime = 0;
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  destroy() {
    this._running = false;
  }

  _tick(time) {
    if (!this._running) return;
    this._lastTime = time;
    this._updatePositions();
    this._computeVisibleNodes();
    this._draw();
    requestAnimationFrame(this._tick);
  }

  _updatePositions() {
    const lerpFactor = this.sim.sleeping ? 1.0 : CONFIG.RENDER.LERP_AWAKE;
    for (const [id, pos] of this.sim.positions) {
      const cur = this.renderPos.get(id);
      if (!cur) {
        this.renderPos.set(id, { x: pos.x, y: pos.y });
      } else {
        cur.x = lerp(cur.x, pos.x, lerpFactor);
        cur.y = lerp(cur.y, pos.y, lerpFactor);
      }
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
  }

  setShowArrows(v) {
    this.showArrows = v;
  }

  setShowLabels(v) {
    this.showLabels = v;
  }

  setSelected(node) {
    this.selected = node;
  }

  setHovered(node) {
    this.hovered = node;
  }

  setDragging(id) {
    this.draggingId = id;
  }

  pickNode(screenX, screenY) {
    const world = this.camera.screenToWorld(screenX, screenY);
    let bestNode = null;
    let bestDist = Infinity;

    for (const node of this.graph.nodes.values()) {
      if (!this._visibleNodes.has(node.id)) continue;
      const p = this.renderPos.get(node.id);
      if (!p) continue;

      const r = this._radius(node);
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
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.clearRect(0, 0, W, H);

    this._drawEdges(ctx);
    this._drawRepoEdges(ctx);
    this._drawNodes(ctx);
    if (this.showLabels) this._drawLabels(ctx);
  }

  _radius(node) {
    if (node.type === 'repo') return CONFIG.RENDER.BASE_NODE_RADIUS * 0.55;
    return CONFIG.RENDER.BASE_NODE_RADIUS;
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
        let fx, fy, tipX, tipY, baseX, baseY;
        if (type === 'oneway') {
          fx = pa.x; fy = pa.y; tipX = tx; tipY = ty;
        } else {
          fx = pb.x; fy = pb.y; tipX = sx; tipY = sy;
        }
        const baseDist = 8 / scale;
        baseX = tipX - ux * baseDist;
        baseY = tipY - uy * baseDist;
        const px = -uy, py = ux;
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

        ctx.strokeStyle = `rgba(167,139,250,${alpha})`;
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
      if (age < 0) continue;
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

    if (node.expanded) {
      ctx.beginPath();
      ctx.arc(p.x + r * 0.7, p.y - r * 0.7, 2.5 / scale, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.mutual;
      ctx.fill();
    }
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

    ctx.fillStyle = this._initialsBg;
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

      const metrics = ctx.measureText(label);
      const padX = 4 / scale, padY = 2 / scale;
      const w = metrics.width + padX * 2;
      const h = 14 / scale;
      ctx.fillStyle = this._labelBgColor;
      ctx.fillRect(p.x - w / 2, y - padY, w, h);

      ctx.fillStyle = (isSel || isHov) ? this._labelHiColor : this._labelColor;
      const fontSpec = node.type === 'repo' ? '10px' : '11px';
      ctx.font = `${isSel || isHov ? '600 ' : ''}${fontSpec} -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(label, p.x, y);
    }
  }
}