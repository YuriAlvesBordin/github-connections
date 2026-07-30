import { CONFIG } from './config.js';
import { graph } from './graph.js';

export function render(ctx) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Limpa canvas
    ctx.clearRect(0, 0, width, height);
    
    // Desenha nodes
    ctx.fillStyle = CONFIG.colors.node;
    for (const node of graph.nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, CONFIG.nodeRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}
