/**
 * Owns every graph data mutation: node and link CRUD, per element property
 * updates, custom data attachment and JSON export.
 */
import type { Emitter } from './events.js';
import { GraphModel } from './GraphModel.js';
import type { PhysicsEngine } from '../physics/PhysicsEngine.js';
import type { GraphData, LinkId, LinkOptions, NodeId, NodeOptions, NodeStateName } from './types.js';
/** Collaborators and hooks the editor needs from the main facade. */
export interface GraphEditorDeps {
    model: GraphModel;
    physics: PhysicsEngine;
    events: Emitter;
    resetAutoFit(): void;
    invalidate(): void;
}
export declare class GraphEditor {
    private readonly deps;
    private linkCounter;
    constructor(deps: GraphEditorDeps);
    /** Adds one node. */
    addNode(id: NodeId, options?: NodeOptions): void;
    /** Adds many nodes in one call. */
    addNodes(nodes: Array<NodeOptions & {
        id: NodeId;
    }>): void;
    /** Links two nodes, reusing an existing link with the same auto id. */
    link(source: NodeId, target: NodeId, options?: LinkOptions): void;
    /** Adds many links in one call. */
    addLinks(links: Array<LinkOptions & {
        source: NodeId;
        target: NodeId;
    }>): void;
    /** Replaces the entire graph with the supplied data payload. */
    setData(data: GraphData): void;
    /** Removes one node together with its links. */
    removeNode(id: NodeId): boolean;
    /** Removes one link by id. */
    removeLink(id: LinkId): boolean;
    /** Removes every node and link while keeping the current theme. */
    clear(): void;
    /** Moves a node to a world position. */
    setNodePosition(id: NodeId | number, x: number, y: number): void;
    /** Locks or unlocks a node in the solver. */
    setNodeFixed(id: NodeId | number, fixed: boolean): void;
    /** Assigns a visual state to a node. */
    setNodeState(id: NodeId | number, state: NodeStateName): void;
    /** Updates node appearance properties. */
    setNodeAppearance(id: NodeId | number, options: NodeOptions): void;
    /** Updates link appearance properties. */
    setLinkAppearance(id: LinkId | number, options: LinkOptions): void;
    /** Sets the node image and starts the asynchronous load. */
    setNodeImage(id: NodeId | number, url: string | null, mode?: 'cover' | 'contain'): void;
    /** Replaces the custom data object attached to a node. */
    setNodeData(id: NodeId | number, data: Record<string, unknown>): void;
    /** Replaces the custom data object attached to a link. */
    setLinkData(id: LinkId | number, data: Record<string, unknown>): void;
    /** Exports the current graph as a plain JSON friendly object. */
    toJSON(): GraphData;
}
//# sourceMappingURL=GraphEditor.d.ts.map