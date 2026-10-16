/**
 * Owns the on demand render loop: rAF scheduling, revision based dirty
 * checking, auto fit bookkeeping and the frame timing statistics.
 */
import type { GraphModel } from '../core/GraphModel.js';
import type { PhysicsEngine } from '../physics/PhysicsEngine.js';
import type { Camera } from './Camera.js';
import type { LabelLayer } from './LabelLayer.js';
import type { Renderer } from './Renderer.js';
import type { TextureAtlas } from './TextureAtlas.js';
/** Collaborators and hooks the loop needs from the main facade. */
export interface RenderLoopDeps {
    model: GraphModel;
    physics: PhysicsEngine;
    camera: Camera;
    renderer: Renderer;
    labels: LabelLayer;
    atlas: TextureAtlas;
    /** Whether the simulation should step on every frame. */
    isRunning(): boolean;
    /** Whether the owning instance was destroyed. */
    isDestroyed(): boolean;
    /** Whether the view should fit itself when data first appears. */
    autoFit: boolean;
    /** Fits the view to the graph; used by the auto fit path. */
    fitView(): void;
}
export declare class RenderLoop {
    private readonly deps;
    private rafActive;
    private rafHandle;
    private timeoutHandle;
    private lastTime;
    private didAutoFit;
    private lastCameraRevision;
    private lastTopologyRevision;
    private lastAppearanceRevision;
    private lastPositionRevision;
    private lastAtlasRevision;
    private forceDirty;
    /** Exponential moving averages surfaced by the stats snapshot. */
    fps: number;
    frameMs: number;
    physicsMs: number;
    constructor(deps: RenderLoopDeps);
    /** Advances physics and renders once, returning the kinetic energy. */
    step(dt?: number): number;
    /** Performs one render pass immediately without stepping the simulation. */
    renderNow(): void;
    /** Requests a render on the next scheduled frame. */
    requestRender(): void;
    /** Marks the view dirty and guarantees a scheduled frame. */
    invalidate(): void;
    /** Schedules a loop iteration when none is pending. */
    schedule(): void;
    /** Allows the next data arrival to trigger the auto fit again. */
    resetAutoFit(): void;
    /** Cancels any pending frame; called during teardown. */
    cancel(): void;
    /** Performs one render pass and label update with revision bookkeeping. */
    private renderFrame;
    /** Schedules a loop iteration when none is pending. */
    private scheduleFrame;
    /** Runs one loop iteration, stepping physics and rendering when dirty. */
    private frame;
}
//# sourceMappingURL=RenderLoop.d.ts.map