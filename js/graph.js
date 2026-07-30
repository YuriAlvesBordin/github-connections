export const graph = {
    nodes: [],
    edges: []
};

export function addNode(id, x, y) {
    graph.nodes.push({ id, x, y, vx: 0, vy: 0 });
}

export function addEdge(source, target) {
    graph.edges.push({ source, target });
}
