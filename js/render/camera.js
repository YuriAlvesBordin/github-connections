import { CONFIG, lerp } from '../config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.scale = 1;

    this.targetX = 0;
    this.targetY = 0;
    this.targetScale = 1;

    this.W = 0;
    this.H = 0;

    this.lerpPos = CONFIG.RENDER.LERP_AWAKE;
    this.lerpScale = CONFIG.RENDER.LERP_AWAKE;
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
  }

  setSleeping(sleeping) {
    this.lerpPos = sleeping ? CONFIG.RENDER.LERP_SLEEP : CONFIG.RENDER.LERP_AWAKE;
    this.lerpScale = sleeping ? CONFIG.RENDER.LERP_SLEEP : CONFIG.RENDER.LERP_AWAKE;
  }

  tick() {
    this.x = lerp(this.x, this.targetX, this.lerpPos);
    this.y = lerp(this.y, this.targetY, this.lerpPos);
    this.scale = lerp(this.scale, this.targetScale, this.lerpScale);
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.scale + this.W / 2,
      y: (wy - this.y) * this.scale + this.H / 2,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.W / 2) / this.scale + this.x,
      y: (sy - this.H / 2) / this.scale + this.y,
    };
  }

  zoom(factor, sx = this.W / 2, sy = this.H / 2) {
    const before = this.screenToWorld(sx, sy);
    this.targetScale = Math.max(CONFIG.RENDER.MIN_SCALE, Math.min(CONFIG.RENDER.MAX_SCALE, this.targetScale * factor));
    const after = this.screenToWorld(sx, sy);
    this.targetX += before.x - after.x;
    this.targetY += before.y - after.y;
  }

  pan(dx, dy) {
    this.targetX -= dx / this.scale;
    this.targetY -= dy / this.scale;
  }

  centerOn(wx, wy) {
    this.x = this.targetX = wx;
    this.y = this.targetY = wy;
  }

  centerOnSmooth(wx, wy) {
    this.targetX = wx;
    this.targetY = wy;
  }

  zoomAround(sx, sy, factor) {
    this.zoom(factor, sx, sy);
  }

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