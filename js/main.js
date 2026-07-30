import { CONFIG } from './config.js';
import { graph, addNode, addEdge } from './graph.js';
import { render } from './render.js';
import { fetchFollowers, fetchFollowing } from './api.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const usernameInput = document.getElementById('username-input');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.background = CONFIG.colors.background;
}

resize();
window.addEventListener('resize', resize);

function clearGraph() {
    graph.nodes.length = 0;
    graph.edges.length = 0;
}

async function loadUser(username) {
    usernameInput.classList.add('loading');

    clearGraph();

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    addNode(username, centerX, centerY);

    try {
        const [followers, following] = await Promise.all([
            fetchFollowers(username),
            fetchFollowing(username)
        ]);

        const angleStepFollowers = Math.PI / Math.max(followers.length || 1, 1);
        const angleStepFollowing = Math.PI / Math.max(following.length || 1, 1);

        followers.forEach((follower, index) => {
            const angle = angleStepFollowers * index - Math.PI / 2;
            const x = centerX + 160 * Math.cos(angle);
            const y = centerY + 160 * Math.sin(angle);
            addNode(follower.login, x, y);
            addEdge(follower.login, username);
        });

        following.forEach((followed, index) => {
            const angle = angleStepFollowing * index + Math.PI / 2;
            const x = centerX + 160 * Math.cos(angle);
            const y = centerY + 160 * Math.sin(angle);
            addNode(followed.login, x, y);
            addEdge(username, followed.login);
        });
    } catch (err) {
        console.error(err);
    } finally {
        usernameInput.classList.remove('loading');
    }
}

let debounceTimer = null;

usernameInput.addEventListener('input', () => {
    const value = usernameInput.value.trim();

    if (!value) {
        clearGraph();
        return;
    }

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        loadUser(value);
    }, 600);
});

function animate() {
    render(ctx);
    requestAnimationFrame(animate);
}

animate();
