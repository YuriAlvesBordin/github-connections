/**
 * Hosts the quadratic bezier geometry helpers shared by the renderer and the
 * picking code so curved edges look and hit test exactly the same way.
 */
export interface Point2D {
    x: number;
    y: number;
}
/** Computes the quadratic bezier control point for an edge with curvature. */
export declare function controlPoint(ax: number, ay: number, bx: number, by: number, curvature: number, out: Point2D): Point2D;
/** Evaluates a point on the quadratic bezier defined by an edge. */
export declare function bezierPoint(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, t: number, out: Point2D): Point2D;
/** Estimates the arc length of a curved edge using fixed sampling. */
export declare function bezierLength(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, samples?: number): number;
/** Computes the shortest distance from a point to a quadratic bezier edge. */
export declare function distanceToEdge(px: number, py: number, ax: number, ay: number, bx: number, by: number, curvature: number): number;
/** Computes the shortest distance from a point to a straight segment. */
export declare function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number;
//# sourceMappingURL=geometry.d.ts.map