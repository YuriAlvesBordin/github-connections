/**
 * avatarCache.js — simple LRU cache for GitHub avatar images.
 *
 * Avatars are loaded as `new Image()` objects. When the cache exceeds
 * CACHE_MAX we evict the least-recently-used entries.
 */

import { CONFIG } from '../config.js';

const CACHE_MAX = CONFIG.AVATAR.CACHE_MAX;
const LOAD_TIMEOUT = CONFIG.AVATAR.LOAD_TIMEOUT;
const FALLBACK_COLOR = CONFIG.AVATAR.FALLBACK_COLOR;

const cache = new Map();        // url -> { img, promise, lastUsed }
const loading = new Map();      // url -> promise (in-flight)

function evictIfNeeded() {
  if (cache.size <= CACHE_MAX) return;
  // Find LRU entry.
  let oldest = Infinity, oldestKey = null;
  for (const [url, entry] of cache) {
    if (entry.lastUsed < oldest) {
      oldest = entry.lastUsed;
      oldestKey = url;
    }
  }
  if (oldestKey) cache.delete(oldestKey);
}

/**
 * Load an avatar image.
 * Returns a promise that resolves to an HTMLImageElement (on success)
 * or null (on failure/timeout). The caller should check `img.complete`
 * and `img.naturalWidth > 0` before drawing.
 */
export async function loadAvatar(url) {
  if (!url) return null;

  // Return cached image if available and valid.
  const cached = cache.get(url);
  if (cached && cached.img.complete && cached.img.naturalWidth > 0) {
    cached.lastUsed = Date.now();
    return cached.img;
  }

  // If already loading, return the in-flight promise.
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

/**
 * Draw an avatar into a circular clipping region.
 * If the image isn't ready, draws a fallback circle.
 */
export function drawAvatar(ctx, url, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const entry = cache.get(url);
  if (entry && entry.img.complete && entry.img.naturalWidth > 0) {
    entry.lastUsed = Date.now();
    ctx.drawImage(entry.img, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = FALLBACK_COLOR;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  ctx.restore();
}

/** Clear the cache. */
export function clear() {
  cache.clear();
  loading.clear();
}

/** Expose for debugging. */
export const avatarCache = { cache, loading, loadAvatar, drawAvatar, clear };