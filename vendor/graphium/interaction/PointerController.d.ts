/**
 * Translates pointer and wheel activity into graph gestures. The controller
 * handles node dragging through the physics engine so releases carry
 * momentum, supports pinch zoom, hover picking, click detection and long
 * presses, and emits normalized event payloads.
 */
import { GraphModel } from '../core/GraphModel.js';
import type { Emitter } from '../core/events.js';
import { Camera } from '../render/Camera.js';
import { PhysicsEngine } from '../physics/PhysicsEngine.js';
import { SpatialHash } from '../physics/SpatialHash.js';
export interface PointerOptions {
    wheelZoomSpeed?: number;
    dragThreshold?: number;
    longPressMs?: number;
    linkHitRadius?: number;
    hoverEnabled?: boolean;
    panEnabled?: boolean;
    zoomEnabled?: boolean;
    dragEnabled?: boolean;
    pickLink?: (worldX: number, worldY: number, radius: number) => number;
}
export declare class PointerController {
    options: Required<Omit<PointerOptions, 'pickLink'>> & Pick<PointerOptions, 'pickLink'>;
    enabled: boolean;
    private element;
    private camera;
    private model;
    private physics;
    private hash;
    private emitter;
    private pointers;
    private dragNode;
    private activeLink;
    private isPanning;
    private downX;
    private downY;
    private moved;
    private longPressTimer;
    private pickBuffer;
    private world;
    private lastClickTime;
    private lastClickButton;
    private boundDown;
    private boundMove;
    private boundUp;
    private boundWheel;
    private boundLeave;
    private boundContext;
    constructor(element: HTMLElement, camera: Camera, model: GraphModel, physics: PhysicsEngine, hash: SpatialHash, emitter: Emitter, options?: PointerOptions);
    /** Converts client coordinates into camera space and world space. */
    private updateWorld;
    /** Finds the topmost node under a world position. */
    private pickNode;
    /** Resolves the link under a world position through the host callback. */
    private pickLinkAt;
    /** Emits a normalized payload to the shared event emitter. */
    private emit;
    /** Handles pointer press by picking nodes, links or starting a pan. */
    private onPointerDown;
    /** Handles pointer motion for dragging, panning, pinching and hovering. */
    private onPointerMove;
    private pinchDistance;
    private pinchCenterX;
    private pinchCenterY;
    /** Clears drag flags and lets the physics engine keep the momentum. */
    private releaseDrag;
    /** Handles pointer release, click synthesis and double click detection. */
    private onPointerUp;
    /** Emits click or dblclick depending on timing of consecutive clicks. */
    private emitClick;
    /** Zooms the view around the wheel position. */
    private onWheel;
    /** Ends hover tracking when the pointer leaves the canvas. */
    private onLeave;
    /** Attaches all DOM listeners and activates gesture handling. */
    enable(): this;
    /** Detaches all DOM listeners and stops gesture handling. */
    disable(): this;
    /** Fully releases controller resources. */
    destroy(): void;
}
//# sourceMappingURL=PointerController.d.ts.map