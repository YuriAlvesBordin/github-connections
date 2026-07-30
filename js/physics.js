import { CONFIG } from './config.js';
import { graph } from './graph.js';

const REPULSION = 8000;
const GRAVITY = 0.02;
const DAMPING = 0.92;
const MAX_SPEED = 12;

export function applyPhysics() {
    const nodes = graph.nodes;
    const len = nodes.length;

    for (let i = 0; i < len; i++) {
        const a = nodes[i];

        for (let j = i + 1; j < len; j++) {
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 1) continue;

            const force = REPULSION / distSq;
            const dist = Math.sqrt(distSq);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
        }
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < len; i++) {
        const node = nodes[i];
        const dx = centerX - node.x;
        const dy = centerY - node.y;

        node.vx += dx * GRAVITY * 0.001;
        node.vy += dy * GRAVITY * 0.001;

        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > MAX_SPEED) {
            const ratio = MAX_SPEED / speed;
            node.vx *= ratio;
            node.vy *= ratio;
        }

        node.vx *= DAMPING;
        node.vy *= DAMPING;

        node.x += node.vx;
        node.y += node.vy;
    }
}
