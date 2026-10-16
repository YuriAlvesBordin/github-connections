/**
 * Renders node labels as a pooled set of DOM elements positioned over the
 * canvas. The pool keeps at most a fixed number of elements alive, updates
 * transforms without layout thrash and hides labels below a zoom threshold.
 */
import { NODE_DIM, NODE_HIDDEN } from '../core/GraphModel.js';
const MAX_LABELS = 400;
export class LabelLayer {
    constructor(parent, theme) {
        this.minZoom = 0.3;
        this.model = null;
        this.camera = null;
        this.pool = [];
        this.activeCount = 0;
        this.screen = { x: 0, y: 0 };
        this.theme = theme;
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: '1',
        });
        parent.appendChild(this.container);
        this.applyTheme();
    }
    /** Applies label styling from the theme to the pool and future nodes. */
    applyTheme() {
        const label = this.theme;
        for (const element of this.pool) {
            element.style.font = `${label.labelWeight} ${label.labelSize}px ${label.labelFont}`;
            element.style.color = label.labelColor;
            if (label.labelBackground) {
                element.style.background = label.labelBackground;
                element.style.padding = `${label.labelPadding[1]}px ${label.labelPadding[0]}px`;
                element.style.borderRadius = `${label.labelRadius}px`;
            }
            else {
                element.style.background = 'none';
                element.style.padding = '0';
            }
        }
    }
    /** Registers the model and camera the layer reads positions from. */
    attach(model, camera) {
        this.model = model;
        this.camera = camera;
    }
    /** Syncs pooled labels with visible nodes for the current frame. */
    update() {
        const model = this.model;
        const camera = this.camera;
        if (!model || !camera) {
            return;
        }
        const enabled = this.theme.labelEnabled;
        if (!enabled || camera.zoom < this.minZoom) {
            this.hideAll();
            return;
        }
        const margin = 40;
        let used = 0;
        const width = camera.width;
        const height = camera.height;
        for (let index = 0; index < model.nodeCount && used < MAX_LABELS; index++) {
            const label = model.nodeLabel[index];
            if (label === null || (model.flags[index] & (NODE_HIDDEN | NODE_DIM)) !== 0) {
                continue;
            }
            const screenX = camera.zoom * (model.x[index] - camera.x) + width * 0.5;
            const screenY = camera.zoom * (model.y[index] - camera.y) + height * 0.5;
            if (screenX < -margin || screenX > width + margin || screenY < -margin || screenY > height + margin) {
                continue;
            }
            const element = this.acquire(used++);
            const offset = model.visualRadius[index] * camera.zoom;
            let top = screenY;
            if (this.theme.labelPosition === 'above') {
                top -= offset + this.theme.labelOffset;
            }
            else if (this.theme.labelPosition === 'below') {
                top += offset + this.theme.labelOffset;
            }
            if (element.textContent !== label) {
                element.textContent = label;
            }
            element.style.display = '';
            element.style.transform = `translate3d(${screenX.toFixed(1)}px, ${top.toFixed(1)}px, 0) translate(-50%, -50%)`;
        }
        for (let index = used; index < this.activeCount; index++) {
            this.pool[index].style.display = 'none';
        }
        this.activeCount = used;
    }
    /** Returns a styled pool element, creating new ones only when needed. */
    acquire(index) {
        if (index < this.pool.length) {
            return this.pool[index];
        }
        const element = document.createElement('div');
        Object.assign(element.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            whiteSpace: 'nowrap',
            willChange: 'transform',
            pointerEvents: 'none',
        });
        element.style.font = `${this.theme.labelWeight} ${this.theme.labelSize}px ${this.theme.labelFont}`;
        element.style.color = this.theme.labelColor;
        if (this.theme.labelBackground) {
            element.style.background = this.theme.labelBackground;
            element.style.padding = `${this.theme.labelPadding[1]}px ${this.theme.labelPadding[0]}px`;
            element.style.borderRadius = `${this.theme.labelRadius}px`;
        }
        this.container.appendChild(element);
        this.pool.push(element);
        return element;
    }
    /** Hides every active label element. */
    hideAll() {
        for (let index = 0; index < this.activeCount; index++) {
            this.pool[index].style.display = 'none';
        }
        this.activeCount = 0;
    }
    /** Removes all DOM elements and detaches the layer. */
    destroy() {
        for (const element of this.pool) {
            element.remove();
        }
        this.pool.length = 0;
        this.activeCount = 0;
        this.container.remove();
    }
}
//# sourceMappingURL=LabelLayer.js.map