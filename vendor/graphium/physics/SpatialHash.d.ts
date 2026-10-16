/**
 * Implements a flat spatial hash grid with open addressing and intrusive
 * linked lists stored in TypedArrays. Rebuild and query paths allocate
 * nothing, which keeps the physics loop free of garbage collection pressure.
 */
export declare class SpatialHash {
    cellSize: number;
    private invCellSize;
    private tableCapacity;
    private mask;
    private keyX;
    private keyY;
    private head;
    private used;
    private next;
    private nodeCapacity;
    count: number;
    constructor(nodeCapacity?: number, cellSize?: number);
    /** Changes the grid cell size and invalidates the current index. */
    setCellSize(value: number): void;
    /** Grows the per node chain storage when the population increases. */
    private ensureCapacity;
    /** Clears every cell and prepares the grid for a new rebuild. */
    clear(): void;
    /** Computes the hash slot for a cell coordinate pair. */
    private hash;
    /** Finds the slot holding a cell, or the first free slot after probing. */
    private slot;
    /** Rebuilds the grid over the first count positions, skipping nodes whose masked bits are set. */
    rebuild(x: Float32Array | Float64Array, y: Float32Array | Float64Array, count: number, hidden?: Uint8Array, mask?: number): void;
    /** Collects all indices inside the square radius window into the output. */
    queryRadius(x: number, y: number, radius: number, output: Int32Array): number;
    /** Returns the node index whose disc contains the point, or -1. */
    pick(x: number, y: number, posX: Float32Array, posY: Float32Array, radii: Float32Array, output: Int32Array): number;
}
//# sourceMappingURL=SpatialHash.d.ts.map