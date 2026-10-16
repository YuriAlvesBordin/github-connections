/**
 * Exposes fluent per node and per link handles returned by the main facade.
 * Handles wrap a dense index resolution so users interact with stable ids
 * while the library keeps operating on flat arrays.
 */
export class NodeHandle {
    /** Creates a handle bound to one graph and one node id. */
    constructor(graph, id) {
        this.graph = graph;
        this.id = id;
    }
    /** Updates node appearance properties and returns the handle. */
    style(options) {
        this.graph.editor.setNodeAppearance(this.id, options);
        return this;
    }
    /** Moves the node to a world position and returns the handle. */
    move(x, y) {
        this.graph.editor.setNodePosition(this.id, x, y);
        return this;
    }
    /** Locks or unlocks the node in the physics solver. */
    fix(fixed = true) {
        this.graph.editor.setNodeFixed(this.id, fixed);
        return this;
    }
    /** Selects or deselects the node. */
    select(selected = true) {
        this.graph.selectNode(this.id, selected);
        return this;
    }
    /** Assigns a visual state such as hover or disabled. */
    state(name) {
        this.graph.editor.setNodeState(this.id, name);
        return this;
    }
    /** Sets the label text, or removes it with null. */
    label(text) {
        this.graph.editor.setNodeAppearance(this.id, { label: text });
        return this;
    }
    /** Sets the node image from a URL or data URL. */
    image(url, mode = 'cover') {
        this.graph.setNodeImage(this.id, url, mode);
        return this;
    }
    /** Tints the node with a color shortcut. */
    color(color) {
        this.graph.editor.setNodeAppearance(this.id, { color });
        return this;
    }
    /** Resizes the node with a radius shortcut. */
    radius(value) {
        this.graph.editor.setNodeAppearance(this.id, { radius: value });
        return this;
    }
    /** Attaches or replaces custom user data. */
    data(data) {
        this.graph.editor.setNodeData(this.id, data);
        return this;
    }
    /** Removes the node from the graph. */
    remove() {
        this.graph.removeNode(this.id);
    }
    /** Returns a point in time snapshot of the node. */
    get snapshot() {
        return this.graph.getNode(this.id);
    }
}
export class LinkHandle {
    /** Creates a handle bound to one graph and one link id. */
    constructor(graph, id) {
        this.graph = graph;
        this.id = id;
    }
    /** Updates link appearance properties and returns the handle. */
    style(options) {
        this.graph.editor.setLinkAppearance(this.id, options);
        return this;
    }
    /** Sets the curvature of the edge in one call. */
    curve(value) {
        this.graph.editor.setLinkAppearance(this.id, { curvature: value });
        return this;
    }
    /** Switches the edge to a dashed style with an optional pattern. */
    dashed(pattern) {
        this.graph.editor.setLinkAppearance(this.id, { style: 'dashed', dashPattern: pattern });
        return this;
    }
    /** Sets the link color shortcut. */
    color(color) {
        this.graph.editor.setLinkAppearance(this.id, { color });
        return this;
    }
    /** Selects or deselects the link. */
    select(selected = true) {
        this.graph.selectLink(this.id, selected);
        return this;
    }
    /** Attaches or replaces custom user data. */
    data(data) {
        this.graph.editor.setLinkData(this.id, data);
        return this;
    }
    /** Removes the link from the graph. */
    remove() {
        this.graph.removeLink(this.id);
    }
    /** Returns a point in time snapshot of the link. */
    get snapshot() {
        return this.graph.getLink(this.id);
    }
}
//# sourceMappingURL=handles.js.map