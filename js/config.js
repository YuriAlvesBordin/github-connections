/**
 * config.js — global configuration constants.
 * No runtime logic here; just values + small pure helpers.
 */

export const CONFIG = {
  API_BASE: 'https://api.github.com',

  // How many followers / following to fetch per expand.
  // 30 + 30 = 60 API calls' worth of related data per expand.
  // (Each fetch is 1 API call; we do 2 per expand.)
  MAX_PER_EXPAND: 30,

  // Default rate limit (anonymous = 60/hr, authenticated = 5000/hr)
  DEFAULT_RATE_LIMIT: 60,

  // Physics
  PHYSICS: {
    NODE_REPULSION:   18000,
    EDGE_SPRING_K:    0.022,
    EDGE_REST:        170,
    CENTER_GRAVITY:   0.0035,
    DAMPING:          0.90,
    MAX_SPEED:        18,
    COLLISION_K:      0.6,    // soft collision spring
    CROSS_K:          2.2,    // edge-crossing repulsion
    CROSS_CAP:        280,
    THETA:            0.55,   // Barnes-Hut threshold
    INITIAL_TEMP:     1.0,
    COOLING:          0.993,
    MIN_TEMP:         0.004,
    SLEEP_V:          0.10,
    SLEEP_FRAMES:     60,
  },

  // Rendering
  RENDER: {
    BASE_NODE_RADIUS: 14,        // avatar radius in world units
    RING_WIDTH:       2,
    LABEL_FONT:       '11px -apple-system, BlinkMacSystemFont, sans-serif',
    LERP_AWAKE:       0.18,
    LERP_SLEEP:       1.0,
    MIN_SCALE:        0.08,
    MAX_SCALE:        6.0,
    ZOOM_FACTOR:      1.12,
  },

  // Avatar loading
  AVATAR: {
    CACHE_MAX:        500,
    LOAD_TIMEOUT:     8000,
    FALLBACK_COLOR:   '#3a3a44',
  },

  // Persistence
  STORAGE_KEY: 'gh_connections_v3',
};

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Smooth-step easing (Hermite). */
export const smoothstep = (t) => t * t * (3 - 2 * t);

/** Clamp a number into [min, max]. */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Promise-based delay. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Trigger a download of a blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
