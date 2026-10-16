/**
 * Implements the main Graphium facade. The class wires the data model,
 * physics engine, camera, renderer, label layer and pointer controller into
 * one object, exposes a fluent chainable API with sensible defaults, and
 * runs an on demand render loop that pauses completely while the simulation
 * sleeps.
 */
import { Emitter } from './core/events.js';
import { FocusController } from './core/FocusController.js';
import { GraphEditor } from './core/GraphEditor.js';
import { GraphModel } from './core/GraphModel.js';
import { LinkHandle, NodeHandle } from './core/handles.js';
import { SelectionController } from './core/SelectionController.js';
import { resolveTheme } from './core/theme.js';
import { BUILT_IN_THEMES } from './core/themes.js';
import { InteractionBinder } from './interaction/InteractionBinder.js';
import { PhysicsEngine } from './physics/PhysicsEngine.js';
import { Camera } from './render/Camera.js';
import { LabelLayer } from './render/LabelLayer.js';
import { RenderLoop } from './render/RenderLoop.js';
import { Renderer } from './render/Renderer.js';
import { TextureAtlas } from './render/TextureAtlas.js';
import { ViewportController } from './render/ViewportController.js';
export class Graphium {
    constructor(options = {}) {
        this.events = new Emitter();
        this.running = false;
        this.destroyed = false;
        this.options = options;
        this.theme = resolveTheme(options.theme);
        this.model = new GraphModel({
            nodeCapacity: options.nodeCapacity,
            linkCapacity: options.linkCapacity,
            theme: this.theme,
        });
        this.physics = new PhysicsEngine(this.model, options.physics ?? {});
        this.physics.hash.setCellSize(this.physics.options.repulsionRadius);
        this.camera = new Camera(options.camera ?? {});
        const canvas = options.canvas ?? (options.container ? createCanvasIn(options.container) : createCanvasIn(document.body));
        this.renderer = new Renderer(canvas, this.theme, options.renderer ?? {});
        this.renderer.setCamera(this.camera);
        this.atlas = new TextureAtlas(this.renderer.gl);
        this.renderer.setAtlas(this.atlas);
        this.atlas.onEvent = event => {
            this.events.emit(event.type, event);
            this.invalidate();
        };
        const host = canvas.parentElement ?? document.body;
        this.labels = new LabelLayer(host, this.theme);
        this.labels.attach(this.model, this.camera);
        this.loop = new RenderLoop({
            model: this.model,
            physics: this.physics,
            camera: this.camera,
            renderer: this.renderer,
            labels: this.labels,
            atlas: this.atlas,
            isRunning: () => this.running,
            isDestroyed: () => this.destroyed,
            autoFit: options.autoFit ?? false,
            fitView: () => this.fit(),
        });
        this.editor = new GraphEditor({
            model: this.model,
            physics: this.physics,
            events: this.events,
            resetAutoFit: () => this.loop.resetAutoFit(),
            invalidate: () => this.invalidate(),
        });
        this.selection = new SelectionController(this.model, () => this.invalidate());
        this.focusController = new FocusController(this.model, () => this.invalidate());
        this.viewport = new ViewportController({
            model: this.model,
            camera: this.camera,
            renderer: this.renderer,
            invalidate: () => this.invalidate(),
        });
        this.binder = new InteractionBinder({
            canvas,
            model: this.model,
            physics: this.physics,
            camera: this.camera,
            hash: this.physics.hash,
            events: this.events,
            interaction: options.interaction,
            selection: this.selection,
            invalidate: () => this.invalidate(),
        });
        this.resize();
        if (typeof ResizeObserver !== 'undefined' && (options.autoResize ?? true)) {
            new ResizeObserver(() => this.resize()).observe(canvas);
        }
        if (options.autoStart ?? true) {
            this.start();
        }
    }
    /** Creates a Graphium instance with the supplied configuration. */
    static create(options = {}) {
        return new Graphium(options);
    }
    /** Subscribes to an event and returns an unsubscribe function. */
    on(type, listener) {
        return this.events.on(type, listener);
    }
    /** Subscribes to an event exactly once. */
    once(type, listener) {
        return this.events.once(type, listener);
    }
    /** Removes one listener, or every listener of a type. */
    off(type, listener) {
        this.events.off(type, listener);
        return this;
    }
    /** Dispatches an event payload to the registered listeners. */
    emit(type, payload) {
        this.events.emit(type, payload);
        return this;
    }
    /** Adds one node and returns the graph for chaining. */
    addNode(id, options = {}) {
        this.editor.addNode(id, options);
        return this;
    }
    /** Adds many nodes in one call and returns the graph for chaining. */
    addNodes(nodes) {
        this.editor.addNodes(nodes);
        return this;
    }
    link(sourceOrId, target, options = {}) {
        if (target === undefined) {
            return this.linkById(sourceOrId);
        }
        this.editor.link(sourceOrId, target, options);
        return this;
    }
    /** Adds many links in one call and returns the graph for chaining. */
    addLinks(links) {
        this.editor.addLinks(links);
        return this;
    }
    /** Returns a fluent handle for one node, or null when it is missing. */
    node(id) {
        const index = this.model.nodeIndexOf(id);
        return index < 0 ? null : new NodeHandle(this, this.model.nodeIdAt(index));
    }
    /** Returns a fluent handle for one link, or null when it is missing. */
    linkById(id) {
        const index = this.model.linkIndexOf(id);
        return index < 0 ? null : new LinkHandle(this, this.model.linkIdAt(index));
    }
    /** Replaces the entire graph with the supplied data payload. */
    setData(data) {
        this.editor.setData(data);
        return this;
    }
    /** Removes one node together with its links. */
    removeNode(id) {
        return this.editor.removeNode(id);
    }
    /** Removes one link by id. */
    removeLink(id) {
        return this.editor.removeLink(id);
    }
    /** Removes every node and link while keeping the current theme. */
    clear() {
        this.editor.clear();
        return this;
    }
    /** Returns a snapshot of one node or null when it does not exist. */
    getNode(id) {
        const index = this.model.nodeIndexOf(id);
        return index < 0 ? null : this.model.nodeSnapshot(index);
    }
    /** Returns a snapshot of one link or null when it does not exist. */
    getLink(id) {
        const index = this.model.linkIndexOf(id);
        return index < 0 ? null : this.model.linkSnapshot(index);
    }
    /** Returns the ids of every node currently in the graph. */
    nodeIds() {
        const ids = [];
        for (let index = 0; index < this.model.nodeCount; index++) {
            ids.push(this.model.nodeIdAt(index));
        }
        return ids;
    }
    /** Returns the ids of every link currently in the graph. */
    linkIds() {
        const ids = [];
        for (let index = 0; index < this.model.linkCount; index++) {
            ids.push(this.model.linkIdAt(index));
        }
        return ids;
    }
    /** Sets the node image and starts the asynchronous load. */
    setNodeImage(id, url, mode = 'cover') {
        this.editor.setNodeImage(id, url, mode);
        return this;
    }
    /** Selects one node, optionally keeping the current selection. */
    selectNode(id, selected = true, additive = false) {
        this.selection.selectNode(id, selected, additive);
        return this;
    }
    /** Selects one link, optionally keeping the current selection. */
    selectLink(id, selected = true, additive = false) {
        this.selection.selectLink(id, selected, additive);
        return this;
    }
    /** Clears the selection of every node and link. */
    clearSelection() {
        this.selection.clear();
        return this;
    }
    /** Returns the ids of every selected node. */
    selectedNodes() {
        return this.selection.selectedNodes();
    }
    /** Returns the ids of every selected link. */
    selectedLinks() {
        return this.selection.selectedLinks();
    }
    /** Dims every node and link that is not adjacent to the focus node. */
    focus(id) {
        this.focusController.focus(id);
        return this;
    }
    /** Removes all dimming applied by focus. */
    unfocus() {
        this.focusController.unfocus();
        return this;
    }
    /** Merges theme values, optionally starting from a built in theme name. */
    setTheme(theme) {
        const base = theme.name && BUILT_IN_THEMES[theme.name] ? BUILT_IN_THEMES[theme.name] : this.options.theme ?? {};
        const merged = { ...base, ...theme };
        delete merged.name;
        this.options.theme = merged;
        this.theme = resolveTheme(merged, this.theme);
        this.model.palette = this.theme.nodeColorPalette;
        this.renderer.setTheme(this.theme);
        this.labels.theme = this.theme;
        this.labels.applyTheme();
        this.labels.minZoom = this.theme.labelEnabled ? 0.3 : 2;
        this.invalidate();
        return this;
    }
    /** Updates physics options live and wakes the simulation. */
    setPhysics(options) {
        this.physics.setOptions(options);
        this.physics.hash.setCellSize(this.physics.options.repulsionRadius);
        return this;
    }
    /** Applies a named physics preset with optional overrides. */
    usePreset(name, overrides = {}) {
        this.physics.usePreset(name, overrides);
        this.physics.hash.setCellSize(this.physics.options.repulsionRadius);
        return this;
    }
    /** Updates interaction options on the live pointer controller. */
    setInteraction(options) {
        this.binder.setInteraction(options);
        return this;
    }
    /** Restarts the simulation and returns the graph for chaining. */
    reboot() {
        this.physics.reset();
        return this;
    }
    /** Scales the view so the whole graph fits with padding. */
    fit(padding = 60) {
        this.viewport.fit(padding);
        return this;
    }
    /** Centers the view on a world point. */
    centerOn(x, y) {
        this.viewport.centerOn(x, y);
        return this;
    }
    /** Multiplies the current zoom level. */
    zoomBy(factor) {
        this.viewport.zoomBy(factor);
        return this;
    }
    /** Sets an absolute zoom level. */
    zoomTo(zoom) {
        this.viewport.zoomTo(zoom);
        return this;
    }
    /** Resizes the renderer to the canvas client size. */
    resize() {
        this.viewport.resize();
        return this;
    }
    /** Advances physics and renders once, returning the kinetic energy. */
    step(dt = 1 / 60) {
        return this.loop.step(dt);
    }
    /** Renders a frame immediately without stepping the simulation. */
    render() {
        this.loop.renderNow();
        return this;
    }
    /** Requests a render on the next scheduled frame. */
    requestRender() {
        this.loop.requestRender();
        return this;
    }
    /** Marks the view dirty and guarantees a scheduled frame. */
    invalidate() {
        this.loop.invalidate();
    }
    /** Starts the run loop and returns the graph for chaining. */
    start() {
        if (this.running || this.destroyed) {
            return this;
        }
        this.running = true;
        this.physics.wake();
        this.events.emit('start', {});
        this.loop.schedule();
        return this;
    }
    /** Stops the run loop and returns the graph for chaining. */
    stop() {
        if (!this.running) {
            return this;
        }
        this.running = false;
        this.events.emit('stop', {});
        return this;
    }
    /** Resolves when every requested node image finished loading. */
    loadImages() {
        return this.atlas.loadAll();
    }
    /** Finds the link index closest to a world position within a radius. */
    pickLinkAt(worldX, worldY, hitRadius = 8) {
        return this.binder.pickLinkAt(worldX, worldY, hitRadius);
    }
    /** Returns the world position under a screen position. */
    screenToWorld(screenX, screenY) {
        return this.viewport.screenToWorld(screenX, screenY);
    }
    /** Returns a performance statistics snapshot for dashboards. */
    stats() {
        return {
            nodeCount: this.model.nodeCount,
            linkCount: this.model.linkCount,
            fps: Math.round(this.loop.fps),
            frameMs: Math.round(this.loop.frameMs * 100) / 100,
            physicsMs: Math.round(this.loop.physicsMs * 100) / 100,
            renderMs: Math.round(this.renderer.lastRenderMs * 100) / 100,
            sleeping: this.physics.sleeping,
        };
    }
    /** Captures the current canvas contents as a PNG data URL. */
    screenshot() {
        this.loop.renderNow();
        return this.renderer.canvas.toDataURL('image/png');
    }
    /** Exports the current graph as a plain JSON friendly object. */
    toJSON() {
        return this.editor.toJSON();
    }
    /** Releases every resource owned by the instance. */
    destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.running = false;
        this.loop.cancel();
        this.binder.destroy();
        this.labels.destroy();
        this.atlas.onEvent = null;
        this.renderer.destroy();
        this.events.clear();
        this.model.clear();
    }
    /** Returns the number of nodes in the graph. */
    get nodeCount() {
        return this.model.nodeCount;
    }
    /** Returns the number of links in the graph. */
    get linkCount() {
        return this.model.linkCount;
    }
    /** Reports whether the physics simulation is currently asleep. */
    get sleeping() {
        return this.physics.sleeping;
    }
}
/** Creates a canvas element appended to a host element. */
function createCanvasIn(host) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
        display: 'block',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: '0',
        touchAction: 'none',
    });
    if (host !== document.body) {
        Object.assign(host.style, { position: 'relative' });
    }
    host.appendChild(canvas);
    return canvas;
}
//# sourceMappingURL=Graphium.js.map