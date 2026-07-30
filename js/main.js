import { CONFIG } from './config.js';

// Setup inicial do canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Usa cores do config
    canvas.style.background = CONFIG.colors.background;
}

resize();
window.addEventListener('resize', resize);
