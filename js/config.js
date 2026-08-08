export const CONFIG = {
  API_BASE: 'https://api.github.com',

  DEFAULT_RATE_LIMIT: 60,

  PHYSICS: {
    NODE_REPULSION:   8000,
    EDGE_SPRING_K:    0.022,
    EDGE_REST:        170,
    CENTER_GRAVITY:   0.0035,
    DAMPING:          0.90,
    MAX_SPEED:        18,
    COLLISION_K:      0.6,
    CROSS_K:          2.2,
    CROSS_CAP:        280,
    THETA:            0.55,
    INITIAL_TEMP:     1.0,
    COOLING:          0.993,
    MIN_TEMP:         0.004,
    SLEEP_V:          0.10,
    SLEEP_FRAMES:     60,
  },

  RENDER: {
    BASE_NODE_RADIUS: 14,
    RING_WIDTH:       2,
    LABEL_FONT:       '11px -apple-system, BlinkMacSystemFont, sans-serif',
    LERP_AWAKE:       0.18,
    LERP_SLEEP:       1.0,
    MIN_SCALE:        0.08,
    MAX_SCALE:        6.0,
    ZOOM_FACTOR:      1.12,
  },

  AVATAR: {
    CACHE_MAX:        500,
    LOAD_TIMEOUT:     8000,
    FALLBACK_COLOR:   '#3a3a44',
  },

  STORAGE_KEY: 'gh_connections_v3',
};

export const lerp = (a, b, t) => a + (b - a) * t;

export const smoothstep = (t) => t * t * (3 - 2 * t);

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
