/**
 * Owns the selection flags of nodes and links, including exclusive versus
 * additive selection and the selected id listings.
 */
import { LINK_SELECTED, NODE_SELECTED } from './GraphModel.js';
export class SelectionController {
    constructor(model, invalidate) {
        this.model = model;
        this.invalidate = invalidate;
    }
    /** Selects one node, optionally keeping the current selection. */
    selectNode(id, selected = true, additive = false) {
        const index = this.model.nodeIndexOf(id);
        if (index < 0) {
            return;
        }
        if (selected && !additive) {
            this.clearNodeSelection();
        }
        this.model.setNodeSelected(index, selected);
        this.invalidate();
    }
    /** Selects one link, optionally keeping the current selection. */
    selectLink(id, selected = true, additive = false) {
        const index = this.model.linkIndexOf(id);
        if (index < 0) {
            return;
        }
        if (selected && !additive) {
            this.clearLinkSelection();
        }
        this.model.setLinkSelected(index, selected);
        this.invalidate();
    }
    /** Clears the selection of every node and link. */
    clear() {
        this.clearNodeSelection();
        this.clearLinkSelection();
        this.invalidate();
    }
    /** Returns the ids of every selected node. */
    selectedNodes() {
        const ids = [];
        for (let index = 0; index < this.model.nodeCount; index++) {
            if (this.model.flags[index] & NODE_SELECTED) {
                ids.push(this.model.nodeIdAt(index));
            }
        }
        return ids;
    }
    /** Returns the ids of every selected link. */
    selectedLinks() {
        const ids = [];
        for (let index = 0; index < this.model.linkCount; index++) {
            if (this.model.linkFlags[index] & LINK_SELECTED) {
                ids.push(this.model.linkIdAt(index));
            }
        }
        return ids;
    }
    /** Deselects every node. */
    clearNodeSelection() {
        for (let index = 0; index < this.model.nodeCount; index++) {
            if (this.model.flags[index] & NODE_SELECTED) {
                this.model.setNodeSelected(index, false);
            }
        }
    }
    /** Deselects every link. */
    clearLinkSelection() {
        for (let index = 0; index < this.model.linkCount; index++) {
            if (this.model.linkFlags[index] & LINK_SELECTED) {
                this.model.setLinkSelected(index, false);
            }
        }
    }
}
//# sourceMappingURL=SelectionController.js.map