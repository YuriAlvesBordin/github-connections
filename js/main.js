import { CONFIG } from './config.js';
import { seedFakeData } from './graph.js';
import { render } from './render.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.background = CONFIG.colors.background;
}

resize();
window.addEventListener('resize', resize);

seedFakeData();

function animate() {
    render(ctx);
    requestAnimationFrame(animate);
}

animate();
