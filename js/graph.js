import { CONFIG } from './config.js';

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

export function seedFakeData() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    addNode('user1', centerX, centerY);
    addNode('user2', centerX + 100, centerY);
    addNode('user3', centerX - 100, centerY);
    addNode('user4', centerX, centerY + 100);
    
    addEdge('user1', 'user2');
    addEdge('user1', 'user3');
    addEdge('user1', 'user4');
}
