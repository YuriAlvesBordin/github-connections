/**
 * Owns the on demand render loop: rAF scheduling, revision based dirty
 * checking, auto fit bookkeeping and the frame timing statistics.
 */
export class RenderLoop {
    constructor(deps) {
        this.rafActive = false;
        this.rafHandle = 0;
        this.timeoutHandle = null;
        this.lastTime = 0;
        this.didAutoFit = false;
        this.lastCameraRevision = -1;
        this.lastTopologyRevision = -1;
        this.lastAppearanceRevision = -1;
        this.lastPositionRevision = -1;
        this.lastAtlasRevision = -1;
        this.forceDirty = false;
        /** Exponential moving averages surfaced by the stats snapshot. */
        this.fps = 60;
        this.frameMs = 16;
        this.physicsMs = 0;
        /** Runs one loop iteration, stepping physics and rendering when dirty. */
        this.frame = (time) => {
            this.rafActive = false;
            if (this.deps.isDestroyed()) {
                return;
            }
            const dt = this.lastTime > 0 ? Math.min(0.05, (time - this.lastTime) / 1000) : 1 / 60;
            this.lastTime = time;
            const started = performance.now();
            if (this.deps.isRunning()) {
                this.deps.physics.step(dt);
            }
            this.physicsMs = performance.now() - started;
            const dirty = this.forceDirty ||
                this.deps.camera.revision !== this.lastCameraRevision ||
                this.deps.model.topologyRevision !== this.lastTopologyRevision ||
                this.deps.model.appearanceRevision !== this.lastAppearanceRevision ||
                this.deps.model.positionRevision !== this.lastPositionRevision ||
                this.deps.atlas.revision !== this.lastAtlasRevision;
            this.forceDirty = false;
            if (dirty) {
                this.renderFrame();
            }
            const frameDuration = performance.now() - started;
            this.frameMs = this.frameMs * 0.9 + frameDuration * 0.1;
            this.fps = this.fps * 0.9 + (1 / Math.max(0.001, dt)) * 0.1;
            if (this.deps.isRunning() && !this.deps.physics.sleeping) {
                this.scheduleFrame();
            }
            else {
                this.lastTime = 0;
            }
        };
        this.deps = deps;
    }
    /** Advances physics and renders once, returning the kinetic energy. */
    step(dt = 1 / 60) {
        const energy = this.deps.physics.step(dt);
        this.renderFrame();
        return energy;
    }
    /** Performs one render pass immediately without stepping the simulation. */
    renderNow() {
        this.renderFrame();
    }
    /** Requests a render on the next scheduled frame. */
    requestRender() {
        this.forceDirty = true;
        this.invalidate();
    }
    /** Marks the view dirty and guarantees a scheduled frame. */
    invalidate() {
        this.scheduleFrame();
    }
    /** Schedules a loop iteration when none is pending. */
    schedule() {
        this.scheduleFrame();
    }
    /** Allows the next data arrival to trigger the auto fit again. */
    resetAutoFit() {
        this.didAutoFit = false;
    }
    /** Cancels any pending frame; called during teardown. */
    cancel() {
        if (this.rafHandle && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this.rafHandle);
            this.rafHandle = 0;
        }
        if (this.timeoutHandle !== null) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
    }
    /** Performs one render pass and label update with revision bookkeeping. */
    renderFrame() {
        if (this.deps.isDestroyed()) {
            return;
        }
        if (this.deps.autoFit && !this.didAutoFit && this.deps.model.nodeCount > 0) {
            this.didAutoFit = true;
            this.deps.fitView();
        }
        this.deps.renderer.render(this.deps.model);
        this.deps.labels.update();
        this.lastCameraRevision = this.deps.camera.revision;
        this.lastTopologyRevision = this.deps.model.topologyRevision;
        this.lastAppearanceRevision = this.deps.model.appearanceRevision;
        this.lastPositionRevision = this.deps.model.positionRevision;
        this.lastAtlasRevision = this.deps.atlas.revision;
    }
    /** Schedules a loop iteration when none is pending. */
    scheduleFrame() {
        if (this.rafActive || this.deps.isDestroyed()) {
            return;
        }
        this.rafActive = true;
        if (typeof requestAnimationFrame === 'function') {
            this.rafHandle = requestAnimationFrame(this.frame);
        }
        else {
            this.timeoutHandle = setTimeout(() => this.frame(performance.now()), 16);
        }
    }
}
//# sourceMappingURL=RenderLoop.js.map