import { CONFIG } from '../config.js';

const CACHE_MAX = CONFIG.AVATAR.CACHE_MAX;
const LOAD_TIMEOUT = CONFIG.AVATAR.LOAD_TIMEOUT;
const FALLBACK_COLOR = CONFIG.AVATAR.FALLBACK_COLOR;

const cache = new Map();
const loading = new Map();

function evictIfNeeded() {
  if (cache.size <= CACHE_MAX) return;
  let oldest = Infinity, oldestKey = null;
  for (const [url, entry] of cache) {
    if (entry.lastUsed < oldest) {
      oldest = entry.lastUsed;
      oldestKey = url;
    }
  }
  if (oldestKey) cache.delete(oldestKey);
}

export async function loadAvatar(url) {
  if (!url) return null;

  const cached = cache.get(url);
  if (cached && cached.img.complete && cached.img.naturalWidth > 0) {
    cached.lastUsed = Date.now();
    return cached.img;
  }

  const inFlight = loading.get(url);
  if (inFlight) return inFlight;

  const promise = (async () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';

      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, LOAD_TIMEOUT);

      img.onload = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          evictIfNeeded();
          cache.set(url, { img, lastUsed: Date.now() });
          resolve(img);
        }
      };
      img.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(null);
        }
      };

      img.src = url;
    });
  })();

  loading.set(url, promise);
  try {
    return await promise;
  } finally {
    loading.delete(url);
  }
}

export function drawAvatar(ctx, url, cx, cy, radius) {
  const entry = cache.get(url);
  if (entry && entry.img.complete && entry.img.naturalWidth > 0) {
    entry.lastUsed = Date.now();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(entry.img, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
    return;
  }

  if (!loading.has(url) && !cache.has(url)) {
    loadAvatar(url);
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = FALLBACK_COLOR;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

export function clear() {
  cache.clear();
  loading.clear();
}

export const avatarCache = { cache, loading, loadAvatar, drawAvatar, clear };
