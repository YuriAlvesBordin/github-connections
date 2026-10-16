/**
 * Owns the selection flags of nodes and links, including exclusive versus
 * additive selection and the selected id listings.
 */
import { GraphModel } from './GraphModel.js';
import type { LinkId, NodeId } from './types.js';
export declare class SelectionController {
    private readonly model;
    private readonly invalidate;
    constructor(model: GraphModel, invalidate: () => void);
    /** Selects one node, optionally keeping the current selection. */
    selectNode(id: NodeId | number, selected?: boolean, additive?: boolean): void;
    /** Selects one link, optionally keeping the current selection. */
    selectLink(id: LinkId | number, selected?: boolean, additive?: boolean): void;
    /** Clears the selection of every node and link. */
    clear(): void;
    /** Returns the ids of every selected node. */
    selectedNodes(): NodeId[];
    /** Returns the ids of every selected link. */
    selectedLinks(): LinkId[];
    /** Deselects every node. */
    private clearNodeSelection;
    /** Deselects every link. */
    private clearLinkSelection;
}
//# sourceMappingURL=SelectionController.d.ts.map