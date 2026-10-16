/**
 * Implements the main Graphium facade. The class wires the data model,
 * physics engine, camera, renderer, label layer and pointer controller into
 * one object, exposes a fluent chainable API with sensible defaults, and
 * runs an on demand render loop that pauses completely while the simulation
 * sleeps.
 */
import { Emitter } from './core/events.js';
import { GraphEditor } from './core/GraphEditor.js';
import { GraphModel } from './core/GraphModel.js';
import { LinkHandle, NodeHandle } from './core/handles.js';
import type { GraphData, GraphiumOptions, InteractionOptions, LinkId, LinkOptions, LinkSnapshot, NodeId, NodeOptions, NodeSnapshot, PhysicsOptions, PhysicsPresetName, StatsSnapshot, ThemeOptions, ThemeResolved } from './core/types.js';
import { PhysicsEngine } from './physics/PhysicsEngine.js';
import { Camera } from './render/Camera.js';
import { LabelLayer } from './render/LabelLayer.js';
import { Renderer } from './render/Renderer.js';
import { TextureAtlas } from './render/TextureAtlas.js';
export declare class Graphium {
    readonly model: GraphModel;
    readonly physics: PhysicsEngine;
    readonly camera: Camera;
    readonly renderer: Renderer;
    readonly atlas: TextureAtlas;
    readonly labels: LabelLayer;
    readonly editor: GraphEditor;
    readonly events: Emitter;
    theme: ThemeResolved;
    running: boolean;
    destroyed: boolean;
    private options;
    private readonly loop;
    private readonly selection;
    private readonly focusController;
    private readonly viewport;
    private readonly binder;
    constructor(options?: GraphiumOptions);
    /** Creates a Graphium instance with the supplied configuration. */
    static create(options?: GraphiumOptions): Graphium;
    /** Subscribes to an event and returns an unsubscribe function. */
    on<T = unknown>(type: string, listener: (payload: T) => void): () => void;
    /** Subscribes to an event exactly once. */
    once<T = unknown>(type: string, listener: (payload: T) => void): () => void;
    /** Removes one listener, or every listener of a type. */
    off<T = unknown>(type: string, listener?: (payload: T) => void): this;
    /** Dispatches an event payload to the registered listeners. */
    emit<T = unknown>(type: string, payload: T): this;
    /** Adds one node and returns the graph for chaining. */
    addNode(id: NodeId, options?: NodeOptions): this;
    /** Adds many nodes in one call and returns the graph for chaining. */
    addNodes(nodes: Array<NodeOptions & {
        id: NodeId;
    }>): this;
    /** Links two nodes, reusing an existing link with the same auto id. */
    link(source: NodeId, target: NodeId, options?: LinkOptions): this;
    /** Returns a fluent handle when called with a single link id. */
    link(id: LinkId): LinkHandle | null;
    /** Adds many links in one call and returns the graph for chaining. */
    addLinks(links: Array<LinkOptions & {
        source: NodeId;
        target: NodeId;
    }>): this;
    /** Returns a fluent handle for one node, or null when it is missing. */
    node(id: NodeId): NodeHandle | null;
    /** Returns a fluent handle for one link, or null when it is missing. */
    linkById(id: LinkId): LinkHandle | null;
    /** Replaces the entire graph with the supplied data payload. */
    setData(data: GraphData): this;
    /** Removes one node together with its links. */
    removeNode(id: NodeId): boolean;
    /** Removes one link by id. */
    removeLink(id: LinkId): boolean;
    /** Removes every node and link while keeping the current theme. */
    clear(): this;
    /** Returns a snapshot of one node or null when it does not exist. */
    getNode(id: NodeId): NodeSnapshot | null;
    /** Returns a snapshot of one link or null when it does not exist. */
    getLink(id: LinkId): LinkSnapshot | null;
    /** Returns the ids of every node currently in the graph. */
    nodeIds(): NodeId[];
    /** Returns the ids of every link currently in the graph. */
    linkIds(): LinkId[];
    /** Sets the node image and starts the asynchronous load. */
    setNodeImage(id: NodeId | number, url: string | null, mode?: 'cover' | 'contain'): this;
    /** Selects one node, optionally keeping the current selection. */
    selectNode(id: NodeId | number, selected?: boolean, additive?: boolean): this;
    /** Selects one link, optionally keeping the current selection. */
    selectLink(id: LinkId | number, selected?: boolean, additive?: boolean): this;
    /** Clears the selection of every node and link. */
    clearSelection(): this;
    /** Returns the ids of every selected node. */
    selectedNodes(): NodeId[];
    /** Returns the ids of every selected link. */
    selectedLinks(): LinkId[];
    /** Dims every node and link that is not adjacent to the focus node. */
    focus(id: NodeId | number): this;
    /** Removes all dimming applied by focus. */
    unfocus(): this;
    /** Merges theme values, optionally starting from a built in theme name. */
    setTheme(theme: ThemeOptions & {
        name?: string;
    }): this;
    /** Updates physics options live and wakes the simulation. */
    setPhysics(options: PhysicsOptions): this;
    /** Applies a named physics preset with optional overrides. */
    usePreset(name: PhysicsPresetName, overrides?: PhysicsOptions): this;
    /** Updates interaction options on the live pointer controller. */
    setInteraction(options: InteractionOptions): this;
    /** Restarts the simulation and returns the graph for chaining. */
    reboot(): this;
    /** Scales the view so the whole graph fits with padding. */
    fit(padding?: number): this;
    /** Centers the view on a world point. */
    centerOn(x: number, y: number): this;
    /** Multiplies the current zoom level. */
    zoomBy(factor: number): this;
    /** Sets an absolute zoom level. */
    zoomTo(zoom: number): this;
    /** Resizes the renderer to the canvas client size. */
    resize(): this;
    /** Advances physics and renders once, returning the kinetic energy. */
    step(dt?: number): number;
    /** Renders a frame immediately without stepping the simulation. */
    render(): this;
    /** Requests a render on the next scheduled frame. */
    requestRender(): this;
    /** Marks the view dirty and guarantees a scheduled frame. */
    private invalidate;
    /** Starts the run loop and returns the graph for chaining. */
    start(): this;
    /** Stops the run loop and returns the graph for chaining. */
    stop(): this;
    /** Resolves when every requested node image finished loading. */
    loadImages(): Promise<void>;
    /** Finds the link index closest to a world position within a radius. */
    pickLinkAt(worldX: number, worldY: number, hitRadius?: number): number;
    /** Returns the world position under a screen position. */
    screenToWorld(screenX: number, screenY: number): {
        x: number;
        y: number;
    };
    /** Returns a performance statistics snapshot for dashboards. */
    stats(): StatsSnapshot;
    /** Captures the current canvas contents as a PNG data URL. */
    screenshot(): string;
    /** Exports the current graph as a plain JSON friendly object. */
    toJSON(): GraphData;
    /** Releases every resource owned by the instance. */
    destroy(): void;
    /** Returns the number of nodes in the graph. */
    get nodeCount(): number;
    /** Returns the number of links in the graph. */
    get linkCount(): number;
    /** Reports whether the physics simulation is currently asleep. */
    get sleeping(): boolean;
}
//# sourceMappingURL=Graphium.d.ts.map