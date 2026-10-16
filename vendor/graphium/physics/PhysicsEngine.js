/**
 * Advances the force directed simulation with velocity based integration,
 * spatial hash repulsion, soft spring constraints and inertia carrying drag.
 * The engine aims for a silk like feel: smooth accelerations, graceful
 * damping and a natural hand off when a dragged node is released.
 */
import { NODE_DRAGGED, NODE_FIXED, NODE_HIDDEN, LINK_HIDDEN } from '../core/GraphModel.js';
import { PRESETS } from './presets.js';
import { SpatialHash } from './SpatialHash.js';
const DEFAULTS = {
    repulsion: 1100,
    repulsionRadius: 200,
    degreeFactor: 0.05,
    degreeExponent: 0.75,
    springStrength: 0.055,
    gravity: 0.0022,
    damping: 0.92,
    maxSpeed: 900,
    collisionStrength: 0.85,
    positionIterations: 2,
    temperature: 0.7,
    cooling: 0.99,
    minTemperature: 0.05,
    sleepEnergy: 0.0004,
    sleepFrames: 48,
    maxNeighbors: 128,
    edgeSeparation: 0.45,
    dragSmooth: 0.42,
    throwFactor: 1,
};
export class PhysicsEngine {
    constructor(model, options = {}, sharedHash) {
        this.energy = Infinity;
        this.sleeping = false;
        this.iteration = 0;
        this.onSleep = null;
        this.onWake = null;
        this.sleepCounter = 0;
        this.lastTopology = -1;
        this.dragIndex = -1;
        this.dragTargetX = 0;
        this.dragTargetY = 0;
        this.model = model;
        this.options = resolveOptions(options);
        this.temperature = this.options.temperature;
        this.hash = sharedHash ?? new SpatialHash(Math.max(256, model.nodeCount + 1), this.options.repulsionRadius);
        this.edgeHash = new SpatialHash(256, 72);
        this.neighbors = new Int32Array(this.options.maxNeighbors);
        this.edgeScratch = new Int32Array(64);
        this.edgeMidX = new Float64Array(256);
        this.edgeMidY = new Float64Array(256);
    }
    /** Merges new physics values into the live configuration and wakes up. */
    setOptions(options) {
        const presetValues = options.preset ? PRESETS[options.preset].values : {};
        const merged = { ...this.options, ...presetValues, ...options };
        delete merged.preset;
        this.options = merged;
        if (options.temperature !== undefined) {
            this.temperature = options.temperature;
        }
        if (options.maxNeighbors !== undefined && options.maxNeighbors !== this.neighbors.length) {
            this.neighbors = new Int32Array(Math.max(16, options.maxNeighbors));
        }
        if (options.repulsionRadius !== undefined) {
            this.hash.setCellSize(options.repulsionRadius);
        }
        this.wake();
    }
    /** Loads a named preset while preserving explicitly provided overrides. */
    usePreset(name, overrides = {}) {
        this.setOptions({ ...overrides, preset: name });
    }
    /** Forces the simulation awake so the next frame produces motion. */
    wake() {
        if (this.sleeping && this.onWake) {
            this.onWake();
        }
        this.sleeping = false;
        this.sleepCounter = 0;
    }
    /** Clears velocities and restores the initial temperature. */
    reset() {
        const model = this.model;
        for (let index = 0; index < model.nodeCount; index++) {
            model.vx[index] = 0;
            model.vy[index] = 0;
            model.px[index] = model.x[index];
            model.py[index] = model.y[index];
        }
        this.temperature = this.options.temperature;
        this.iteration = 0;
        this.wake();
    }
    /** Registers the start of an interactive drag for a node. */
    beginDrag(index, x, y) {
        this.dragIndex = index;
        this.dragTargetX = x;
        this.dragTargetY = y;
        if (index >= 0) {
            this.wake();
        }
    }
    /** Updates the drag target position while the pointer moves. */
    dragTo(x, y) {
        if (this.dragIndex < 0) {
            return;
        }
        this.dragTargetX = x;
        this.dragTargetY = y;
        this.wake();
    }
    /** Releases the dragged node, handing the pointer momentum to physics. */
    endDrag() {
        if (this.dragIndex < 0) {
            return;
        }
        const index = this.dragIndex;
        this.dragIndex = -1;
        const model = this.model;
        const factor = this.options.throwFactor;
        model.vx[index] *= factor;
        model.vy[index] *= factor;
        this.wake();
    }
    /** Advances the simulation one time step and returns the kinetic energy. */
    step(dt) {
        const model = this.model;
        if (this.sleeping || model.nodeCount === 0) {
            return this.energy === Infinity ? 0 : this.energy;
        }
        const delta = Math.min(0.05, Math.max(0.001, dt));
        if (this.lastTopology !== model.topologyRevision) {
            this.lastTopology = model.topologyRevision;
            this.wake();
        }
        this.applyForces();
        this.integrate(delta);
        this.solveConstraints();
        this.resolveEdgeCrossings();
        this.temperature = Math.max(this.options.minTemperature, this.temperature * Math.pow(this.options.cooling, delta * 60));
        this.iteration++;
        model.positionRevision++;
        const energy = this.measureEnergy();
        this.energy = energy;
        if (energy < this.options.sleepEnergy) {
            this.sleepCounter++;
        }
        else {
            this.sleepCounter = 0;
        }
        if (this.sleepCounter >= this.options.sleepFrames) {
            this.sleeping = true;
            if (this.onSleep) {
                this.onSleep(energy);
            }
        }
        return energy;
    }
    /** Accumulates gravity, pairwise repulsion and spring forces. */
    applyForces() {
        const model = this.model;
        const options = this.options;
        model.fx.fill(0, 0, model.nodeCount);
        model.fy.fill(0, 0, model.nodeCount);
        const gravity = options.gravity;
        if (gravity > 0) {
            for (let index = 0; index < model.nodeCount; index++) {
                if (model.flags[index] & (NODE_FIXED | NODE_DRAGGED | NODE_HIDDEN)) {
                    continue;
                }
                model.fx[index] -= model.x[index] * gravity;
                model.fy[index] -= model.y[index] * gravity;
            }
        }
        this.hash.rebuild(model.x, model.y, model.nodeCount, model.flags, NODE_HIDDEN);
        const radius = options.repulsionRadius;
        const radiusSq = radius * radius;
        for (let index = 0; index < model.nodeCount; index++) {
            if (model.flags[index] & (NODE_FIXED | NODE_DRAGGED | NODE_HIDDEN)) {
                continue;
            }
            const found = this.hash.queryRadius(model.x[index], model.y[index], radius, this.neighbors);
            const degreeScaleI = 1 + options.degreeFactor * Math.pow(model.degree[index], options.degreeExponent);
            for (let k = 0; k < found; k++) {
                const other = this.neighbors[k];
                if (other <= index || model.flags[other] & NODE_HIDDEN) {
                    continue;
                }
                let dx = model.x[other] - model.x[index];
                let dy = model.y[other] - model.y[index];
                let distanceSq = dx * dx + dy * dy;
                if (distanceSq < 0.0001) {
                    dx = (index % 2 === 0 ? 0.01 : -0.01) + Math.random() * 0.001;
                    dy = 0.01;
                    distanceSq = dx * dx + dy * dy;
                }
                if (distanceSq > radiusSq) {
                    continue;
                }
                const distance = Math.sqrt(distanceSq);
                const degreeScaleJ = 1 + options.degreeFactor * Math.pow(model.degree[other], options.degreeExponent);
                const force = (options.repulsion * Math.sqrt(degreeScaleI * degreeScaleJ)) / Math.max(4, distanceSq);
                const nx = dx / distance;
                const ny = dy / distance;
                model.fx[index] -= nx * force;
                model.fy[index] -= ny * force;
                if (!(model.flags[other] & (NODE_FIXED | NODE_DRAGGED))) {
                    model.fx[other] += nx * force;
                    model.fy[other] += ny * force;
                }
            }
        }
        const springScale = options.springStrength;
        for (let link = 0; link < model.linkCount; link++) {
            if (model.linkFlags[link] & LINK_HIDDEN) {
                continue;
            }
            const a = model.source[link];
            const b = model.target[link];
            const fixedA = model.flags[a] & (NODE_FIXED | NODE_DRAGGED);
            const fixedB = model.flags[b] & (NODE_FIXED | NODE_DRAGGED);
            if (fixedA && fixedB) {
                continue;
            }
            const dx = model.x[b] - model.x[a];
            const dy = model.y[b] - model.y[a];
            const distance = Math.max(0.0001, Math.hypot(dx, dy));
            const extension = distance - model.restLength[link];
            const force = extension * model.linkStrength[link] * springScale;
            const nx = (dx / distance) * force;
            const ny = (dy / distance) * force;
            if (!fixedA) {
                model.fx[a] += nx;
                model.fy[a] += ny;
            }
            if (!fixedB) {
                model.fx[b] -= nx;
                model.fy[b] -= ny;
            }
        }
    }
    /** Integrates velocities and positions, including the soft drag follower. */
    integrate(dt) {
        const model = this.model;
        const options = this.options;
        const damping = Math.pow(options.damping, dt * 60);
        const temperature = Math.max(options.minTemperature, this.temperature);
        const dragSmooth = 1 - Math.pow(1 - Math.min(0.95, options.dragSmooth), dt * 60);
        let energy = 0;
        for (let index = 0; index < model.nodeCount; index++) {
            if (model.flags[index] & NODE_HIDDEN) {
                continue;
            }
            if (model.flags[index] & NODE_FIXED) {
                model.vx[index] = 0;
                model.vy[index] = 0;
                model.px[index] = model.x[index];
                model.py[index] = model.y[index];
                continue;
            }
            if (index === this.dragIndex) {
                const nextX = model.x[index] + (this.dragTargetX - model.x[index]) * dragSmooth;
                const nextY = model.y[index] + (this.dragTargetY - model.y[index]) * dragSmooth;
                model.vx[index] = (nextX - model.x[index]) / dt;
                model.vy[index] = (nextY - model.y[index]) / dt;
                model.x[index] = nextX;
                model.y[index] = nextY;
                model.px[index] = nextX;
                model.py[index] = nextY;
                energy += model.vx[index] * model.vx[index] + model.vy[index] * model.vy[index];
                continue;
            }
            const mass = Math.max(0.0001, model.mass[index]);
            let vx = (model.vx[index] + (model.fx[index] / mass) * dt * temperature) * damping;
            let vy = (model.vy[index] + (model.fy[index] / mass) * dt * temperature) * damping;
            const speedSq = vx * vx + vy * vy;
            const maxSpeed = options.maxSpeed;
            if (speedSq > maxSpeed * maxSpeed) {
                const scale = maxSpeed / Math.sqrt(speedSq);
                vx *= scale;
                vy *= scale;
            }
            model.vx[index] = vx;
            model.vy[index] = vy;
            model.x[index] += vx * dt;
            model.y[index] += vy * dt;
            model.px[index] = model.x[index];
            model.py[index] = model.y[index];
            energy += vx * vx + vy * vy;
        }
        return model.nodeCount > 0 ? energy / model.nodeCount : 0;
    }
    /** Iterates soft spring constraints and collision separation passes. */
    solveConstraints() {
        const model = this.model;
        const options = this.options;
        const iterations = Math.max(1, options.positionIterations);
        for (let iteration = 0; iteration < iterations; iteration++) {
            for (let link = 0; link < model.linkCount; link++) {
                if (model.linkFlags[link] & LINK_HIDDEN) {
                    continue;
                }
                const a = model.source[link];
                const b = model.target[link];
                const fixedA = model.flags[a] & (NODE_FIXED | NODE_DRAGGED);
                const fixedB = model.flags[b] & (NODE_FIXED | NODE_DRAGGED);
                if (fixedA && fixedB) {
                    continue;
                }
                const dx = model.x[b] - model.x[a];
                const dy = model.y[b] - model.y[a];
                const distance = Math.max(0.0001, Math.hypot(dx, dy));
                const invA = fixedA ? 0 : 1 / Math.max(0.0001, model.mass[a]);
                const invB = fixedB ? 0 : 1 / Math.max(0.0001, model.mass[b]);
                const total = invA + invB;
                const correction = (((distance - model.restLength[link]) / distance) * 0.28 * model.linkStrength[link]) / total;
                const cx = dx * correction;
                const cy = dy * correction;
                if (!fixedA) {
                    model.x[a] += cx * invA;
                    model.y[a] += cy * invA;
                }
                if (!fixedB) {
                    model.x[b] -= cx * invB;
                    model.y[b] -= cy * invB;
                }
            }
            this.hash.rebuild(model.x, model.y, model.nodeCount, model.flags, NODE_HIDDEN);
            const pad = options.repulsionRadius * 0.05;
            for (let index = 0; index < model.nodeCount; index++) {
                if (model.flags[index] & (NODE_FIXED | NODE_HIDDEN)) {
                    continue;
                }
                const radiusI = model.radius[index];
                const found = this.hash.queryRadius(model.x[index], model.y[index], radiusI + pad, this.neighbors);
                for (let k = 0; k < found; k++) {
                    const other = this.neighbors[k];
                    if (other <= index || model.flags[other] & (NODE_FIXED | NODE_HIDDEN)) {
                        continue;
                    }
                    let dx = model.x[other] - model.x[index];
                    let dy = model.y[other] - model.y[index];
                    let distance = Math.hypot(dx, dy);
                    if (distance < 0.0001) {
                        dx = 0.01;
                        dy = 0;
                        distance = 0.01;
                    }
                    const minDistance = radiusI + model.radius[other];
                    if (distance >= minDistance) {
                        continue;
                    }
                    const invI = 1 / Math.max(0.0001, model.mass[index]);
                    const invJ = 1 / Math.max(0.0001, model.mass[other]);
                    const total = invI + invJ;
                    const correction = ((minDistance - distance) / distance) * 0.5 * options.collisionStrength;
                    model.x[index] -= (dx * correction * invI) / total;
                    model.y[index] -= (dy * correction * invI) / total;
                    model.x[other] += (dx * correction * invJ) / total;
                    model.y[other] += (dy * correction * invJ) / total;
                }
            }
        }
    }
    /** Pushes apart crossing edges so layouts stay readable over time. */
    resolveEdgeCrossings() {
        const strength = this.options.edgeSeparation;
        const model = this.model;
        if (strength <= 0 || model.linkCount < 2) {
            return;
        }
        const count = model.linkCount;
        if (this.edgeMidX.length < count) {
            this.edgeMidX = new Float64Array(Math.max(count, this.edgeMidX.length * 2));
            this.edgeMidY = new Float64Array(Math.max(count, this.edgeMidY.length * 2));
        }
        const midX = this.edgeMidX;
        const midY = this.edgeMidY;
        for (let link = 0; link < count; link++) {
            const a = model.source[link];
            const b = model.target[link];
            midX[link] = (model.x[a] + model.x[b]) * 0.5;
            midY[link] = (model.y[a] + model.y[b]) * 0.5;
        }
        this.edgeHash.rebuild(midX, midY, count);
        let conflicts = 0;
        for (let link = 0; link < count; link++) {
            if (conflicts > 4000) {
                break;
            }
            if (model.linkFlags[link] & LINK_HIDDEN) {
                continue;
            }
            const a0 = model.source[link];
            const b0 = model.target[link];
            const found = this.edgeHash.queryRadius(midX[link], midY[link], 72, this.edgeScratch);
            for (let k = 0; k < found; k++) {
                const other = this.edgeScratch[k];
                if (other <= link || model.linkFlags[other] & LINK_HIDDEN) {
                    continue;
                }
                const a1 = model.source[other];
                const b1 = model.target[other];
                if (a0 === a1 || a0 === b1 || b0 === a1 || b0 === b1) {
                    continue;
                }
                if (!segmentsCross(model.x[a0], model.y[a0], model.x[b0], model.y[b0], model.x[a1], model.y[a1], model.x[b1], model.y[b1])) {
                    continue;
                }
                conflicts++;
                let dx = midX[other] - midX[link];
                let dy = midY[other] - midY[link];
                const distance = Math.max(0.0001, Math.hypot(dx, dy));
                dx /= distance;
                dy /= distance;
                const push = strength * 2.2;
                this.nudgeNode(a0, -dx * push, -dy * push);
                this.nudgeNode(b0, -dx * push, -dy * push);
                this.nudgeNode(a1, dx * push, dy * push);
                this.nudgeNode(b1, dx * push, dy * push);
            }
        }
    }
    /** Moves a node a small amount unless it is fixed or being dragged. */
    nudgeNode(index, dx, dy) {
        const model = this.model;
        if (model.flags[index] & (NODE_FIXED | NODE_DRAGGED)) {
            return;
        }
        model.x[index] += dx;
        model.y[index] += dy;
    }
    /** Computes the mean squared velocity used by the sleep detector. */
    measureEnergy() {
        const model = this.model;
        let energy = 0;
        let counted = 0;
        for (let index = 0; index < model.nodeCount; index++) {
            if (model.flags[index] & NODE_HIDDEN) {
                continue;
            }
            energy += model.vx[index] * model.vx[index] + model.vy[index] * model.vy[index];
            counted++;
        }
        return counted > 0 ? energy / counted : 0;
    }
}
/** Tests whether two closed segments intersect using orientation signs. */
function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1 = crossSign(cx, cy, dx, dy, ax, ay);
    const d2 = crossSign(cx, cy, dx, dy, bx, by);
    const d3 = crossSign(ax, ay, bx, by, cx, cy);
    const d4 = crossSign(ax, ay, bx, by, dx, dy);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
/** Returns the orientation sign of the turn between three points. */
function crossSign(ax, ay, bx, by, px, py) {
    const value = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    return value > 0.0001 ? 1 : value < -0.0001 ? -1 : 0;
}
/** Combines defaults, preset values and user overrides into one config. */
function resolveOptions(options) {
    const preset = options.preset ? PRESETS[options.preset].values : {};
    const merged = { ...DEFAULTS, ...preset, ...options };
    delete merged.preset;
    return merged;
}
//# sourceMappingURL=PhysicsEngine.js.map