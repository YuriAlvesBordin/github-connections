/**
 * Stores the whole graph in contiguous TypedArrays so physics, picking and
 * rendering all run with zero per-frame allocations. External string ids map
 * to dense integer indices through hash maps, and swap-remove keeps every
 * mutation O(links) in the worst case while preserving cache locality.
 */
import type { LinkId, LinkOptions, LinkSnapshot, NodeId, NodeOptions, NodeSnapshot, NodeStateName, ThemeResolved } from './types.js';
export declare const NODE_FIXED = 1;
export declare const NODE_SELECTED = 2;
export declare const NODE_DRAGGED = 4;
export declare const NODE_HIDDEN = 8;
export declare const NODE_DISABLED = 16;
export declare const NODE_DIM = 32;
export declare const LINK_SELECTED = 1;
export declare const LINK_HIDDEN = 2;
export declare const LINK_DIM = 4;
export declare const STATE_NORMAL = 0;
export declare const STATE_HOVER = 1;
export declare const STATE_SELECTED = 2;
export declare const STATE_DRAGGING = 3;
export declare const STATE_FIXED = 4;
export declare const STATE_DISABLED = 5;
export declare const STYLE_SOLID = 0;
export declare const STYLE_DASHED = 1;
export interface GraphModelOptions {
    nodeCapacity?: number;
    linkCapacity?: number;
    theme: ThemeResolved;
}
export declare class GraphModel {
    readonly nodeDefaults: Required<NonNullable<ThemeOptionsNode>>;
    readonly linkDefaults: Required<ThemeOptionsEdgeShape>;
    nodeCount: number;
    linkCount: number;
    topologyRevision: number;
    positionRevision: number;
    appearanceRevision: number;
    palette: number[];
    private nodeIds;
    private linkIds;
    private nodeIndexById;
    private linkIndexById;
    private nodeData;
    private linkData;
    x: Float32Array;
    y: Float32Array;
    px: Float32Array;
    py: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    fx: Float32Array;
    fy: Float32Array;
    radius: Float32Array;
    visualRadius: Float32Array;
    mass: Float32Array;
    degree: Int32Array;
    color: Uint32Array;
    borderColor: Uint32Array;
    borderWidth: Float32Array;
    nodeOpacity: Float32Array;
    nodeImage: Array<string | null>;
    nodeImageMode: Uint8Array;
    nodeLabel: Array<string | null>;
    flags: Uint8Array;
    state: Uint8Array;
    source: Int32Array;
    target: Int32Array;
    restLength: Float32Array;
    linkStrength: Float32Array;
    linkWidth: Float32Array;
    linkColor: Uint32Array;
    linkFlags: Uint8Array;
    linkOpacity: Float32Array;
    linkCurvature: Float32Array;
    linkStyle: Uint8Array;
    dashLength: Float32Array;
    dashGap: Float32Array;
    dashOffset: Float32Array;
    dashWorldScale: Uint8Array;
    arrowMode: Int8Array;
    arrowSize: Float32Array;
    arrowWidth: Float32Array;
    private nodeCapacity;
    private linkCapacity;
    constructor(options: GraphModelOptions);
    /** Resolves a node id or raw index into a dense index, or returns -1. */
    nodeIndexOf(idOrIndex: NodeId | number): number;
    /** Resolves a link id or raw index into a dense index, or returns -1. */
    linkIndexOf(idOrIndex: LinkId | number): number;
    /** Returns the external id attached to a dense node index. */
    nodeIdAt(index: number): NodeId | undefined;
    /** Returns the external id attached to a dense link index. */
    linkIdAt(index: number): LinkId | undefined;
    /** Adds a node or updates an existing one and returns its dense index. */
    addNode(id: NodeId, options?: NodeOptions): number;
    /** Adds a link or updates an existing one and returns its dense index. */
    addLink(id: LinkId, sourceId: NodeId, targetId: NodeId, options?: LinkOptions): number;
    /** Applies node level appearance and physics properties to an index. */
    private applyNodeOptions;
    /** Applies link level appearance and physics properties to an index. */
    private applyLinkOptions;
    /** Writes a visual state code and keeps the flag mask synchronized. */
    setNodeState(index: number, value: NodeStateName | number): void;
    /** Updates node appearance properties without touching topology. */
    updateNode(index: number, options: NodeOptions): void;
    /** Updates link appearance properties without touching topology. */
    updateLink(index: number, options: LinkOptions): void;
    /** Sets node world position and optionally resets Verlet history. */
    setNodePosition(index: number, x: number, y: number, resetPrevious?: boolean): void;
    /** Locks or unlocks a node inside the physics solver. */
    setNodeFixed(index: number, fixed: boolean): void;
    /** Toggles the selected flag of a node. */
    setNodeSelected(index: number, selected: boolean): void;
    /** Toggles the selected flag of a link. */
    setLinkSelected(index: number, selected: boolean): void;
    /** Removes a link using swap-remove and returns whether it existed. */
    removeLink(id: LinkId): boolean;
    /** Removes every link touching a node before the node itself is removed. */
    removeLinksOf(index: number): void;
    /** Removes a node using swap-remove and reindexes surviving links. */
    removeNode(id: NodeId): boolean;
    /** Replaces the whole graph with the supplied data payload. */
    setData(data: {
        nodes?: Array<NodeOptions & {
            id: NodeId;
        }>;
        links?: Array<LinkOptions & {
            source: NodeId;
            target: NodeId;
        }>;
    }): void;
    /** Clears topology while keeping allocated storage and current theme. */
    clear(): void;
    /** Builds a readable snapshot object for one node. */
    nodeSnapshot(index: number): NodeSnapshot;
    /** Builds a readable snapshot object for one link. */
    linkSnapshot(index: number): LinkSnapshot;
    /** Returns the custom data object attached to a node. */
    nodeUserData(index: number): Record<string, unknown>;
    /** Returns the custom data object attached to a link. */
    linkUserData(index: number): Record<string, unknown>;
    /** Doubles node storage when the dense count would overflow. */
    private ensureNodeCapacity;
    /** Doubles link storage when the dense count would overflow. */
    private ensureLinkCapacity;
}
interface ThemeOptionsNode {
    radius?: number;
    color?: number;
    borderColor?: number;
    borderWidth?: number;
    borderOpacity?: number;
    opacity?: number;
}
interface ThemeOptionsEdgeShape {
    color: number;
    width: number;
    opacity: number;
    curvature: number;
    style: number;
    arrow: number;
    arrowSize: number;
    arrowWidth: number;
}
export {};
//# sourceMappingURL=GraphModel.d.ts.map