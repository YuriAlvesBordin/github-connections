/**
 * Owns the focus mode: dims every node and link that is not adjacent to
 * the focused node and restores the graph on unfocus.
 */
import { GraphModel } from './GraphModel.js';
import type { NodeId } from './types.js';
export declare class FocusController {
    private readonly model;
    private readonly invalidate;
    constructor(model: GraphModel, invalidate: () => void);
    /** Dims every node and link that is not adjacent to the focus node. */
    focus(id: NodeId | number): void;
    /** Removes all dimming applied by focus. */
    unfocus(): void;
}
//# sourceMappingURL=FocusController.d.ts.map