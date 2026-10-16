/**
 * Implements a flat spatial hash grid with open addressing and intrusive
 * linked lists stored in TypedArrays. Rebuild and query paths allocate
 * nothing, which keeps the physics loop free of garbage collection pressure.
 */
export class SpatialHash {
    constructor(nodeCapacity = 512, cellSize = 96) {
        this.count = 0;
        this.cellSize = Math.max(0.0001, cellSize);
        this.invCellSize = 1 / this.cellSize;
        this.nodeCapacity = Math.max(16, nodeCapacity);
        this.tableCapacity = 16;
        const requested = this.nodeCapacity * 4;
        while (this.tableCapacity < requested) {
            this.tableCapacity <<= 1;
        }
        this.mask = this.tableCapacity - 1;
        this.keyX = new Int32Array(this.tableCapacity);
        this.keyY = new Int32Array(this.tableCapacity);
        this.head = new Int32Array(this.tableCapacity);
        this.used = new Uint8Array(this.tableCapacity);
        this.next = new Int32Array(this.nodeCapacity);
        this.head.fill(-1);
        this.next.fill(-1);
    }
    /** Changes the grid cell size and invalidates the current index. */
    setCellSize(value) {
        this.cellSize = Math.max(0.0001, value);
        this.invCellSize = 1 / this.cellSize;
    }
    /** Grows the per node chain storage when the population increases. */
    ensureCapacity(required) {
        if (required <= this.nodeCapacity) {
            return;
        }
        let capacity = this.nodeCapacity;
        while (capacity < required) {
            capacity <<= 1;
        }
        const next = new Int32Array(capacity);
        next.set(this.next);
        next.fill(-1, this.nodeCapacity);
        this.next = next;
        this.nodeCapacity = capacity;
    }
    /** Clears every cell and prepares the grid for a new rebuild. */
    clear() {
        this.used.fill(0);
        this.head.fill(-1);
        this.next.fill(-1);
        this.count = 0;
    }
    /** Computes the hash slot for a cell coordinate pair. */
    hash(cx, cy) {
        return (((cx * 73856093) ^ (cy * 19349663)) >>> 0) & this.mask;
    }
    /** Finds the slot holding a cell, or the first free slot after probing. */
    slot(cx, cy) {
        let slot = this.hash(cx, cy);
        while (this.used[slot] && (this.keyX[slot] !== cx || this.keyY[slot] !== cy)) {
            slot = (slot + 1) & this.mask;
        }
        return slot;
    }
    /** Rebuilds the grid over the first count positions, skipping nodes whose masked bits are set. */
    rebuild(x, y, count, hidden, mask) {
        this.ensureCapacity(count);
        this.clear();
        for (let index = 0; index < count; index++) {
            if (hidden && (hidden[index] & (mask ?? 0xff)) !== 0) {
                continue;
            }
            const cx = Math.floor(x[index] * this.invCellSize);
            const cy = Math.floor(y[index] * this.invCellSize);
            const slot = this.slot(cx, cy);
            if (!this.used[slot]) {
                this.used[slot] = 1;
                this.keyX[slot] = cx;
                this.keyY[slot] = cy;
                this.head[slot] = -1;
            }
            this.next[index] = this.head[slot];
            this.head[slot] = index;
            this.count++;
        }
    }
    /** Collects all indices inside the square radius window into the output. */
    queryRadius(x, y, radius, output) {
        const minX = Math.floor((x - radius) * this.invCellSize);
        const maxX = Math.floor((x + radius) * this.invCellSize);
        const minY = Math.floor((y - radius) * this.invCellSize);
        const maxY = Math.floor((y + radius) * this.invCellSize);
        let found = 0;
        for (let cy = minY; cy <= maxY; cy++) {
            for (let cx = minX; cx <= maxX; cx++) {
                const slot = this.slot(cx, cy);
                if (!this.used[slot] || this.keyX[slot] !== cx || this.keyY[slot] !== cy) {
                    continue;
                }
                for (let index = this.head[slot]; index >= 0 && found < output.length; index = this.next[index]) {
                    output[found++] = index;
                }
            }
        }
        return found;
    }
    /** Returns the node index whose disc contains the point, or -1. */
    pick(x, y, posX, posY, radii, output) {
        const found = this.queryRadius(x, y, 96, output);
        let best = -1;
        let bestDistance = Infinity;
        for (let index = 0; index < found; index++) {
            const candidate = output[index];
            const dx = posX[candidate] - x;
            const dy = posY[candidate] - y;
            const distance = dx * dx + dy * dy;
            const radius = radii[candidate];
            if (distance <= radius * radius && distance < bestDistance) {
                best = candidate;
                bestDistance = distance;
            }
        }
        return best;
    }
}
//# sourceMappingURL=SpatialHash.js.map