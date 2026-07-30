/**
 * Camera.js — viewport transform (pan/zoom) with smooth interpolation.
 *
 * The renderer asks the camera for world→screen and screen→world
 * conversions every frame. The camera keeps its own internal state
 * (target + current) and lerps toward the target each frame so
 * programmatic camera moves (fit-to-view, center-on-node) feel smooth.
 */

import { CONFIG, lerp } from '../config.js';

export class Camera {
  constructor() {
    /** Current (interpolated) transform. */
    this.x = 0;       // world X at screen center
    this.y = 0;       // world Y at screen center
    this.scale = 1;   // world units per screen pixel

    /** Target transform (what we're lerping toward). */
    this.targetX = 0;
    this.targetY = 0;
    this.targetScale = 1;

    /** Viewport size in screen pixels. */
    this.W = 0;
    this.H = 0;

    /** Lerp factors — faster when sim is awake, instant when asleep. */
    this.lerpPos = CONFIG.RENDER.LERP_AWAKE;
    this.lerpScale = CONFIG.RENDER.LERP_AWAKE;
  }

  /** Call once per frame with the current canvas size. */
  resize(W, H) {
    this.W = W;
    this.H = H;
  }

  /** Update lerp factors based on whether the simulation is sleeping. */
  setSleeping(sleeping) {
    this.lerpPos = sleeping ? CONFIG.RENDER.LERP_SLEEP : CONFIG.RENDER.LERP_AWAKE;
    this.lerpScale = sleeping ? CONFIG.RENDER.LERP_SLEEP : CONFIG.RENDER.LERP_AWAKE;
  }

  /** One interpolation step — call every frame before rendering. */
  tick() {
    this.x = lerp(this.x, this.targetX, this.lerpPos);
    this.y = lerp(this.y, this.targetY, this.lerpPos);
    this.scale = lerp(this.scale, this.targetScale, this.lerpScale);
  }

  /** World → screen. */
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.scale + this.W / 2,
      y: (wy - this.y) * this.scale + this.H / 2,
    };
  }

  /** Screen → world. */
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.W / 2) / this.scale + this.x,
      y: (sy - this.H / 2) / this.scale + this.y,
    };
  }

  /** Zoom in/out around a screen point (or center if omitted). */
  zoom(factor, sx = this.W / 2, sy = this.H / 2) {
    const before = this.screenToWorld(sx, sy);
    this.targetScale = Math.max(CONFIG.RENDER.MIN_SCALE, Math.min(CONFIG.RENDER.MAX_SCALE, this.targetScale * factor));
    const after = this.screenToWorld(sx, sy);
    this.targetX += before.x - after.x;
    this.targetY += before.y - after.y;
  }

  /** Pan by screen pixels. */
  pan(dx, dy) {
    this.targetX -= dx / this.scale;
    this.targetY -= dy / this.scale;
  }

  /** Center the camera on a world point immediately (no lerp). */
  centerOn(wx, wy) {
    this.x = this.targetX = wx;
    this.y = this.targetY = wy;
  }

  /** Smoothly center on a world point. */
  centerOnSmooth(wx, wy) {
    this.targetX = wx;
    this.targetY = wy;
  }

  /**
   * Fit a bounding box {minX, minY, maxX, maxY} into the viewport
   * with some padding.
   */
  fitTo(bbox, W, H, padding = 60) {
    const bw = bbox.maxX - bbox.minX;
    const bh = bbox.maxY - bbox.minY;
    if (bw <= 0 || bh <= 0) return;
    const scaleX = (W - padding * 2) / bw;
    const scaleY = (H - padding * 2) / bh;
    const target = Math.min(scaleX, scaleY);
    this.targetScale = Math.max(CONFIG.RENDER.MIN_SCALE, Math.min(CONFIG.RENDER.MAX_SCALE, target));
    this.targetX = (bbox.minX + bbox.maxX) / 2;
    this.targetY = (bbox.minY + bbox.maxY) / 2;
  }

  /** Get the current world-space bounding box of the viewport. */
  getWorldBounds() {
    const hw = this.W / 2 / this.scale;
    const hh = this.H / 2 / this.scale;
    return {
      minX: this.x - hw,
      maxX: this.x + hw,
      minY: this.y - hh,
      maxY: this.y + hh,
    };
  }
}