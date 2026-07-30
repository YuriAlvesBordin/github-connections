import { CONFIG } from './config.js';
import { graph, addNode, addEdge, getNodeAt } from './graph.js';
import { render } from './render.js';
import { fetchFollowers, fetchFollowing } from './api.js';
import { applyPhysics } from './physics.js';
import { createInteractionHandlers } from './interaction.js';
import { showProfilePopup } from './popup.js';

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

function setLoading(isLoading) {
    usernameInput.classList.toggle('loading', isLoading);
}

function setError(isError) {
    usernameInput.classList.toggle('error', isError);
}

async function loadUser(username) {
    setLoading(true);
    setError(false);

    clearGraph();

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    addNode(username, centerX, centerY, {
        avatarUrl: `https://github.com/${username}.png`,
        bio: '',
        profileUrl: `https://github.com/${username}`,
        name: username
    });

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
            addNode(follower.login, x, y, {
                avatarUrl: follower.avatar_url,
                bio: follower.bio || '',
                profileUrl: follower.html_url,
                name: follower.login
            });
            addEdge(follower.login, username);
        });

        following.forEach((followed, index) => {
            const angle = angleStepFollowing * index + Math.PI / 2;
            const x = centerX + 160 * Math.cos(angle);
            const y = centerY + 160 * Math.sin(angle);
            addNode(followed.login, x, y, {
                avatarUrl: followed.avatar_url,
                bio: followed.bio || '',
                profileUrl: followed.html_url,
                name: followed.login
            });
            addEdge(username, followed.login);
        });
    } catch (err) {
        console.error(err);
        setError(true);
    } finally {
        setLoading(false);
    }
}

let debounceTimer = null;

usernameInput.addEventListener('input', () => {
    const value = usernameInput.value.trim();

    setError(false);

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

const interaction = createInteractionHandlers({
    onTap: event => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const node = getNodeAt(x, y);
        if (node) {
            showProfilePopup(node);
        }
    },
    onLongPress: event => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const node = getNodeAt(x, y);
        if (node) {
            console.log('long press', node.id);
        }
    },
    onDoubleTap: event => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const node = getNodeAt(x, y);
        if (node) {
            console.log('double tap', node.id);
        }
    }
});

canvas.addEventListener('pointerdown', interaction.onPointerDown);
canvas.addEventListener('pointermove', interaction.onPointerMove);
canvas.addEventListener('pointerup', interaction.onPointerUp);
canvas.addEventListener('pointercancel', interaction.onPointerCancel);

function animate() {
    applyPhysics();
    render(ctx);
    requestAnimationFrame(animate);
}

animate();
