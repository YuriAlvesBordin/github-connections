/**
 * Advances the force directed simulation with velocity based integration,
 * spatial hash repulsion, soft spring constraints and inertia carrying drag.
 * The engine aims for a silk like feel: smooth accelerations, graceful
 * damping and a natural hand off when a dragged node is released.
 */
import { GraphModel } from '../core/GraphModel.js';
import type { PhysicsOptions } from '../core/types.js';
import { PRESETS } from './presets.js';
import { SpatialHash } from './SpatialHash.js';
export interface ResolvedPhysicsOptions {
    repulsion: number;
    repulsionRadius: number;
    degreeFactor: number;
    degreeExponent: number;
    springStrength: number;
    gravity: number;
    damping: number;
    maxSpeed: number;
    collisionStrength: number;
    positionIterations: number;
    temperature: number;
    cooling: number;
    minTemperature: number;
    sleepEnergy: number;
    sleepFrames: number;
    maxNeighbors: number;
    edgeSeparation: number;
    dragSmooth: number;
    throwFactor: number;
}
export declare class PhysicsEngine {
    options: ResolvedPhysicsOptions;
    energy: number;
    sleeping: boolean;
    temperature: number;
    iteration: number;
    onSleep: ((energy: number) => void) | null;
    onWake: (() => void) | null;
    private model;
    hash: SpatialHash;
    private neighbors;
    private sleepCounter;
    private lastTopology;
    private edgeMidX;
    private edgeMidY;
    private edgeHash;
    private edgeScratch;
    private dragIndex;
    private dragTargetX;
    private dragTargetY;
    constructor(model: GraphModel, options?: PhysicsOptions, sharedHash?: SpatialHash);
    /** Merges new physics values into the live configuration and wakes up. */
    setOptions(options: PhysicsOptions): void;
    /** Loads a named preset while preserving explicitly provided overrides. */
    usePreset(name: keyof typeof PRESETS, overrides?: PhysicsOptions): void;
    /** Forces the simulation awake so the next frame produces motion. */
    wake(): void;
    /** Clears velocities and restores the initial temperature. */
    reset(): void;
    /** Registers the start of an interactive drag for a node. */
    beginDrag(index: number, x: number, y: number): void;
    /** Updates the drag target position while the pointer moves. */
    dragTo(x: number, y: number): void;
    /** Releases the dragged node, handing the pointer momentum to physics. */
    endDrag(): void;
    /** Advances the simulation one time step and returns the kinetic energy. */
    step(dt: number): number;
    /** Accumulates gravity, pairwise repulsion and spring forces. */
    private applyForces;
    /** Integrates velocities and positions, including the soft drag follower. */
    private integrate;
    /** Iterates soft spring constraints and collision separation passes. */
    private solveConstraints;
    /** Pushes apart crossing edges so layouts stay readable over time. */
    private resolveEdgeCrossings;
    /** Moves a node a small amount unless it is fixed or being dragged. */
    private nudgeNode;
    /** Computes the mean squared velocity used by the sleep detector. */
    private measureEnergy;
}
//# sourceMappingURL=PhysicsEngine.d.ts.map