import { CONFIG } from './config.js';
import { graph } from './graph.js';

export function render(ctx) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = CONFIG.colors.edge;
    ctx.lineWidth = CONFIG.edgeWidth;
    
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    
    for (const edge of graph.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
        }
    }
    
    ctx.fillStyle = CONFIG.colors.node;
    for (const node of graph.nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, CONFIG.nodeRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}
