const GESTURE = {
  CLICK_MAX_MS: 300,
  LONG_PRESS_MS: 450,
  DBLCLICK_MS: 280,
  MOVE_THRESHOLD: 0.10,
  MOVE_MIN_PX: 5,
};

export class InputController {
  constructor({ canvas, camera, renderer, callbacks }) {
    this.canvas = canvas;
    this.camera = camera;
    this.renderer = renderer;
    this.cb = callbacks;

    this.potentialNode = null;
    this.draggingNode = null;
    this.panning = false;
    this.panStart = { x: 0, y: 0 };
    this.downPos = { x: 0, y: 0 };
    this.downTime = 0;
    this.moveThreshold = GESTURE.MOVE_MIN_PX;
    this.movedExceeded = false;
    this.longPressFired = false;
    this._longPressTimer = null;

    this._lastClickNode = null;
    this._lastClickTime = 0;
    this._singleClickTimer = null;

    this.lastPinchDist = 0;

    this._bind();
  }

  _bind() {
    this.canvas.addEventListener('mousedown', (e) => this._onPointerDown(e.clientX, e.clientY, e.button, e));
    window.addEventListener('mousemove', (e) => this._onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', (e) => this._onPointerUp(e.clientX, e.clientY, e.button));
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => this._onContextMenu(e));

    this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this._onTouchEnd(e));

    window.addEventListener('keydown', (e) => this._onKeyDown(e));
  }

  _onPointerDown(x, y, button, event) {
    this.downPos = { x, y };
    this.downTime = Date.now();
    this.movedExceeded = false;
    this.longPressFired = false;

    const node = this._pickNode(x, y);

    if (node && button === 0) {
      this.potentialNode = node;
      const worldR = this._nodeRadius(node);
      const screenR = worldR * this.camera.scale;
      this.moveThreshold = Math.max(screenR * GESTURE.MOVE_THRESHOLD, GESTURE.MOVE_MIN_PX);

      this._longPressTimer = setTimeout(() => {
        if (this.potentialNode === node && !this.movedExceeded) {
          this.longPressFired = true;
          this.potentialNode = null;
          this.cb.onLongPress?.(node);
        }
      }, GESTURE.LONG_PRESS_MS);

      if (event) event.preventDefault();
    } else if (button === 0 || button === 1 || (event && event.altKey)) {
      this.panning = true;
      this.panStart = { x, y };
      this.canvas.classList.add('grabbing');
      if (event) event.preventDefault();
    }
  }

  _onPointerMove(x, y) {
    if (this.potentialNode && !this.movedExceeded) {
      const dx = x - this.downPos.x;
      const dy = y - this.downPos.y;
      if (Math.hypot(dx, dy) > this.moveThreshold) {
        this.movedExceeded = true;
        clearTimeout(this._longPressTimer);
        this.draggingNode = this.potentialNode;
        this.renderer.setDragging(this.draggingNode.id);
        this.canvas.classList.add('dragging');
      }
    }

    if (this.draggingNode) {
      const world = this.camera.screenToWorld(x, y);
      this.cb.onDragNode?.(this.draggingNode, world.x, world.y);
    } else if (this.panning) {
      const dx = x - this.panStart.x;
      const dy = y - this.panStart.y;
      this.camera.pan(dx, dy);
      this.panStart = { x, y };
    } else {
      const node = this._pickNode(x, y);
      this.cb.onHover?.(node);
      this.canvas.style.cursor = node ? 'pointer' : 'grab';
    }
  }

  _onPointerUp(x, y, button) {
    clearTimeout(this._longPressTimer);

    const wasDragging = this.draggingNode;
    const wasPotential = this.potentialNode;
    const wasPanning = this.panning;

    if (wasDragging) {
      this.cb.onEndDragNode?.(wasDragging);
      this.renderer.setDragging(null);
    }

    this.draggingNode = null;
    this.potentialNode = null;
    this.panning = false;
    this.canvas.classList.remove('grabbing', 'dragging');

    if (this.longPressFired) {
      this.longPressFired = false;
      return;
    }

    if (wasDragging) return;

    if (wasPotential && !this.movedExceeded) {
      const elapsed = Date.now() - this.downTime;
      if (elapsed < GESTURE.CLICK_MAX_MS) {
        this._handleNodeClick(wasPotential);
        return;
      }
      if (elapsed < GESTURE.LONG_PRESS_MS) {
        this._handleNodeClick(wasPotential);
        return;
      }
      this.cb.onLongPress?.(wasPotential);
      return;
    }

    if (wasPanning && !this.movedExceeded) {
      this.cb.onClickEmpty?.();
    }
  }

  _handleNodeClick(node) {
    const now = Date.now();
    if (this._lastClickNode === node && (now - this._lastClickTime) < GESTURE.DBLCLICK_MS) {
      clearTimeout(this._singleClickTimer);
      this._lastClickNode = null;
      this._lastClickTime = 0;
      this.cb.onDoubleClick?.(node);
    } else {
      this._lastClickNode = node;
      this._lastClickTime = now;
      clearTimeout(this._singleClickTimer);
      this._singleClickTimer = setTimeout(() => {
        this.cb.onQuickClick?.(node);
        this._lastClickNode = null;
      }, GESTURE.DBLCLICK_MS);
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12;
    this.camera.zoomAround(e.clientX, e.clientY, factor);
  }

  _onContextMenu(e) {
    e.preventDefault();
    const node = this._pickNode(e.clientX, e.clientY);
    if (node) {
      this.cb.onRightClick?.(node, e.clientX, e.clientY);
    }
  }

  _pickNode(x, y) {
    if (typeof this.renderer?.pickNode === 'function') return this.renderer.pickNode(x, y);
    if (typeof this.renderer?.pick === 'function') return this.renderer.pick(x, y);
    return null;
  }

  _nodeRadius(node) {
    if (typeof this.renderer?._radius === 'function') return this.renderer._radius(node);
    return 14;
  }


  _onTouchStart(e) {
    if (e.touches.length === 2) {
      this.lastPinchDist = this._touchDist(e);
      clearTimeout(this._longPressTimer);
      this.potentialNode = null;
      this.draggingNode = null;
      this.panning = false;
      e.preventDefault();
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      this._onPointerDown(t.clientX, t.clientY, 0, e);
    }
  }

  _onTouchMove(e) {
    if (e.touches.length === 2 && this.lastPinchDist > 0) {
      const d = this._touchDist(e);
      const factor = d / this.lastPinchDist;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      this.camera.zoomAround(cx, cy, factor);
      this.lastPinchDist = d;
      e.preventDefault();
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      this._onPointerMove(t.clientX, t.clientY);
      if (this.potentialNode || this.panning || this.draggingNode) {
        e.preventDefault();
      }
    }
  }

  _onTouchEnd(e) {
    if (e.touches.length === 0) {
      const t = e.changedTouches[0];
      if (t) this._onPointerUp(t.clientX, t.clientY, 0);
      this.lastPinchDist = 0;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      this._onPointerDown(t.clientX, t.clientY, 0, null);
    }
  }

  _touchDist(e) {
    const a = e.touches[0], b = e.touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }


  _onKeyDown(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    switch (e.key) {
      case 'Escape':
        this.cb.onEscape?.();
        break;
      case 'f':
      case 'F':
        this.cb.onFit?.();
        break;
      case 'r':
      case 'R':
        this.cb.onReheat?.();
        break;
      case 'Delete':
      case 'Backspace':
        this.cb.onDeleteSelected?.();
        break;
      case ' ':
        this.cb.onExpandSelected?.();
        e.preventDefault();
        break;
    }
  }
}
