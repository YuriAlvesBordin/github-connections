/**
 * Owns view framing and navigation: fitting the graph, centering, zooming,
 * resizing the renderer to the canvas and screen to world conversion.
 */
import type { GraphModel } from '../core/GraphModel.js';
import type { Camera } from './Camera.js';
import type { Renderer } from './Renderer.js';
/** Collaborators the viewport control needs from the main facade. */
export interface ViewportDeps {
    model: GraphModel;
    camera: Camera;
    renderer: Renderer;
    invalidate: () => void;
}
export declare class ViewportController {
    private readonly deps;
    constructor(deps: ViewportDeps);
    /** Scales the view so the whole graph fits with padding. */
    fit(padding?: number): void;
    /** Centers the view on a world point. */
    centerOn(x: number, y: number): void;
    /** Multiplies the current zoom level. */
    zoomBy(factor: number): void;
    /** Sets an absolute zoom level. */
    zoomTo(zoom: number): void;
    /** Resizes the renderer to the canvas client size. */
    resize(): void;
    /** Returns the world position under a screen position. */
    screenToWorld(screenX: number, screenY: number): {
        x: number;
        y: number;
    };
}
//# sourceMappingURL=ViewportController.d.ts.map