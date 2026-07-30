import { CONFIG, clamp, lerp } from '../config.js';

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

    this.targetScale = clamp(
      this.targetScale * factor,
      CONFIG.RENDER.MIN_SCALE,
      CONFIG.RENDER.MAX_SCALE
    );

    const afterX = (sx - this.W / 2) / this.targetScale + this.targetX;
    const afterY = (sy - this.H / 2) / this.targetScale + this.targetY;

    this.targetX += before.x - afterX;
    this.targetY += before.y - afterY;
  }

  pan(dx, dy) {
    this.targetX -= dx / this.targetScale;
    this.targetY -= dy / this.targetScale;
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
    this.targetScale = clamp(target, CONFIG.RENDER.MIN_SCALE, CONFIG.RENDER.MAX_SCALE);
    this.targetX = (bbox.minX + bbox.maxX) / 2;
    this.targetY = (bbox.minY + bbox.maxY) / 2;
  }
}
