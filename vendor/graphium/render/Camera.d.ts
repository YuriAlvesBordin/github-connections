/**
 * Maintains the 2D view transform as a cached 3x3 matrix and provides
 * coordinate conversion helpers for pointer math and label placement.
 */
export declare class Camera {
    width: number;
    height: number;
    x: number;
    y: number;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    revision: number;
    readonly matrix: Float32Array;
    constructor(options?: {
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        zoom?: number;
        minZoom?: number;
        maxZoom?: number;
    });
    /** Recomputes the cached view matrix after any transform change. */
    private updateMatrix;
    /** Resizes the viewport and refreshes the view matrix. */
    setViewport(width: number, height: number): this;
    /** Moves the camera center to a world position. */
    setPosition(x: number, y: number): this;
    /** Sets the zoom level clamped between the configured limits. */
    setZoom(zoom: number): this;
    /** Pans the view by a screen pixel delta. */
    pan(dx: number, dy: number): this;
    /** Zooms while keeping the supplied screen point visually anchored. */
    zoomAt(factor: number, screenX: number, screenY: number): this;
    /** Converts world coordinates into screen pixels. */
    worldToScreen(worldX: number, worldY: number, out: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
    /** Converts screen pixels into world coordinates. */
    screenToWorld(screenX: number, screenY: number, out: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
    /** Positions and scales the camera so a world rectangle fits the view. */
    fit(minX: number, minY: number, maxX: number, maxY: number, padding?: number): this;
}
//# sourceMappingURL=Camera.d.ts.map