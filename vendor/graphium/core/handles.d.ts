/**
 * Exposes fluent per node and per link handles returned by the main facade.
 * Handles wrap a dense index resolution so users interact with stable ids
 * while the library keeps operating on flat arrays.
 */
import type { Graphium } from '../Graphium.js';
import type { ColorInput, LinkOptions, LinkSnapshot, NodeId, NodeOptions, NodeSnapshot, NodeStateName } from './types.js';
export declare class NodeHandle {
    private graph;
    readonly id: NodeId;
    /** Creates a handle bound to one graph and one node id. */
    constructor(graph: Graphium, id: NodeId);
    /** Updates node appearance properties and returns the handle. */
    style(options: NodeOptions): this;
    /** Moves the node to a world position and returns the handle. */
    move(x: number, y: number): this;
    /** Locks or unlocks the node in the physics solver. */
    fix(fixed?: boolean): this;
    /** Selects or deselects the node. */
    select(selected?: boolean): this;
    /** Assigns a visual state such as hover or disabled. */
    state(name: NodeStateName): this;
    /** Sets the label text, or removes it with null. */
    label(text: string | null): this;
    /** Sets the node image from a URL or data URL. */
    image(url: string | null, mode?: 'cover' | 'contain'): this;
    /** Tints the node with a color shortcut. */
    color(color: ColorInput): this;
    /** Resizes the node with a radius shortcut. */
    radius(value: number): this;
    /** Attaches or replaces custom user data. */
    data(data: Record<string, unknown>): this;
    /** Removes the node from the graph. */
    remove(): void;
    /** Returns a point in time snapshot of the node. */
    get snapshot(): NodeSnapshot | null;
}
export declare class LinkHandle {
    private graph;
    readonly id: string | number;
    /** Creates a handle bound to one graph and one link id. */
    constructor(graph: Graphium, id: string | number);
    /** Updates link appearance properties and returns the handle. */
    style(options: LinkOptions): this;
    /** Sets the curvature of the edge in one call. */
    curve(value: number): this;
    /** Switches the edge to a dashed style with an optional pattern. */
    dashed(pattern?: [number, number]): this;
    /** Sets the link color shortcut. */
    color(color: ColorInput): this;
    /** Selects or deselects the link. */
    select(selected?: boolean): this;
    /** Attaches or replaces custom user data. */
    data(data: Record<string, unknown>): this;
    /** Removes the link from the graph. */
    remove(): void;
    /** Returns a point in time snapshot of the link. */
    get snapshot(): LinkSnapshot | null;
}
//# sourceMappingURL=handles.d.ts.map