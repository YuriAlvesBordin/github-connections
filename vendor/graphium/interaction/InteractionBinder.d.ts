/**
 * Connects user input to graph behavior: builds the pointer controller,
 * routes pointer and physics events, maintains the hover state and exposes
 * link hit testing.
 */
import type { Emitter } from '../core/events.js';
import { GraphModel } from '../core/GraphModel.js';
import type { SelectionController } from '../core/SelectionController.js';
import type { GraphiumOptions, InteractionOptions } from '../core/types.js';
import type { PhysicsEngine } from '../physics/PhysicsEngine.js';
import type { SpatialHash } from '../physics/SpatialHash.js';
import type { Camera } from '../render/Camera.js';
/** Collaborators and hooks the binder needs from the main facade. */
export interface InteractionDeps {
    canvas: HTMLCanvasElement;
    model: GraphModel;
    physics: PhysicsEngine;
    camera: Camera;
    hash: SpatialHash;
    events: Emitter;
    interaction: GraphiumOptions['interaction'];
    selection: SelectionController;
    invalidate: () => void;
}
export declare class InteractionBinder {
    private readonly deps;
    private pointer;
    private hoverIndex;
    constructor(deps: InteractionDeps);
    /** Updates interaction options on the live pointer controller. */
    setInteraction(options: InteractionOptions): void;
    /** Finds the link index closest to a world position within a radius. */
    pickLinkAt(worldX: number, worldY: number, hitRadius?: number): number;
    /** Releases the pointer controller. */
    destroy(): void;
    /** Builds the pointer controller when interaction is not disabled. */
    private wirePointer;
    /** Connects library internal reactions to emitter traffic. */
    private wireEvents;
    /** Updates the hovered node and keeps the previous one consistent. */
    private setHover;
}
//# sourceMappingURL=InteractionBinder.d.ts.map