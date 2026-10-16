/**
 * Renders node labels as a pooled set of DOM elements positioned over the
 * canvas. The pool keeps at most a fixed number of elements alive, updates
 * transforms without layout thrash and hides labels below a zoom threshold.
 */
import { GraphModel } from '../core/GraphModel.js';
import type { ThemeResolved } from '../core/types.js';
import { Camera } from './Camera.js';
export declare class LabelLayer {
    container: HTMLDivElement;
    theme: ThemeResolved;
    minZoom: number;
    private model;
    private camera;
    private pool;
    private activeCount;
    private screen;
    constructor(parent: HTMLElement, theme: ThemeResolved);
    /** Applies label styling from the theme to the pool and future nodes. */
    applyTheme(): void;
    /** Registers the model and camera the layer reads positions from. */
    attach(model: GraphModel, camera: Camera): void;
    /** Syncs pooled labels with visible nodes for the current frame. */
    update(): void;
    /** Returns a styled pool element, creating new ones only when needed. */
    private acquire;
    /** Hides every active label element. */
    private hideAll;
    /** Removes all DOM elements and detaches the layer. */
    destroy(): void;
}
//# sourceMappingURL=LabelLayer.d.ts.map