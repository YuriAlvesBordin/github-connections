/**
 * Maintains the 2D view transform as a cached 3x3 matrix and provides
 * coordinate conversion helpers for pointer math and label placement.
 */
export class Camera {
    constructor(options = {}) {
        this.width = 1;
        this.height = 1;
        this.revision = 0;
        this.matrix = new Float32Array(9);
        this.x = Number.isFinite(options.x) ? options.x : 0;
        this.y = Number.isFinite(options.y) ? options.y : 0;
        this.zoom = Number.isFinite(options.zoom) ? options.zoom : 1;
        this.minZoom = options.minZoom ?? 0.02;
        this.maxZoom = options.maxZoom ?? 80;
        this.updateMatrix();
    }
    /** Recomputes the cached view matrix after any transform change. */
    updateMatrix() {
        const sx = (2 * this.zoom) / this.width;
        const sy = (-2 * this.zoom) / this.height;
        this.matrix[0] = sx;
        this.matrix[1] = 0;
        this.matrix[2] = 0;
        this.matrix[3] = 0;
        this.matrix[4] = sy;
        this.matrix[5] = 0;
        this.matrix[6] = -sx * this.x;
        this.matrix[7] = -sy * this.y;
        this.matrix[8] = 1;
        this.revision++;
    }
    /** Resizes the viewport and refreshes the view matrix. */
    setViewport(width, height) {
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        this.updateMatrix();
        return this;
    }
    /** Moves the camera center to a world position. */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.updateMatrix();
        return this;
    }
    /** Sets the zoom level clamped between the configured limits. */
    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.updateMatrix();
        return this;
    }
    /** Pans the view by a screen pixel delta. */
    pan(dx, dy) {
        this.x += dx / this.zoom;
        this.y += dy / this.zoom;
        this.updateMatrix();
        return this;
    }
    /** Zooms while keeping the supplied screen point visually anchored. */
    zoomAt(factor, screenX, screenY) {
        const beforeX = this.x + (screenX - this.width * 0.5) / this.zoom;
        const beforeY = this.y + (screenY - this.height * 0.5) / this.zoom;
        this.setZoom(this.zoom * factor);
        this.x = beforeX - (screenX - this.width * 0.5) / this.zoom;
        this.y = beforeY - (screenY - this.height * 0.5) / this.zoom;
        this.updateMatrix();
        return this;
    }
    /** Converts world coordinates into screen pixels. */
    worldToScreen(worldX, worldY, out) {
        out.x = this.zoom * (worldX - this.x) + this.width * 0.5;
        out.y = this.zoom * (worldY - this.y) + this.height * 0.5;
        return out;
    }
    /** Converts screen pixels into world coordinates. */
    screenToWorld(screenX, screenY, out) {
        out.x = this.x + (screenX - this.width * 0.5) / this.zoom;
        out.y = this.y + (screenY - this.height * 0.5) / this.zoom;
        return out;
    }
    /** Positions and scales the camera so a world rectangle fits the view. */
    fit(minX, minY, maxX, maxY, padding = 40) {
        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);
        const availableWidth = Math.max(1, this.width - padding * 2);
        const availableHeight = Math.max(1, this.height - padding * 2);
        this.x = (minX + maxX) * 0.5;
        this.y = (minY + maxY) * 0.5;
        this.setZoom(Math.min(availableWidth / width, availableHeight / height));
        return this;
    }
}
//# sourceMappingURL=Camera.js.map