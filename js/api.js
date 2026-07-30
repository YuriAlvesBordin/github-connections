/**
 * github.js — thin GitHub REST client that funnels everything through
 * the shared RateLimiter.
 */

import { CONFIG } from './config.js';
import { rateLimiter } from './rateLimiter.js';

/** Build auth headers (no token — unauthenticated requests only). */
function authHeaders() {
  return {};
}

/** GET a JSON path from the GitHub API. */
async function ghGet(path) {
  const res = await rateLimiter.fetch(CONFIG.API_BASE + path, authHeaders());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const GitHub = {
  /** Fetch a single user by login. */
  fetchUser(login) {
    return ghGet(`/users/${encodeURIComponent(login)}`);
  },

  /**
   * Fetch followers + following in parallel.
   * Returns { followers, following } arrays of minimal user objects.
   */
  async fetchConnections(login, perPage = CONFIG.MAX_PER_EXPAND) {
    const [followers, following] = await Promise.all([
      ghGet(`/users/${encodeURIComponent(login)}/followers?per_page=${perPage}`),
      ghGet(`/users/${encodeURIComponent(login)}/following?per_page=${perPage}`),
    ]);
    return { followers: followers || [], following: following || [] };
  },

  /**
   * Fetch a user's top repositories by star count.
   * Returns an array of repo objects (max `count` items).
   */
  async fetchTopRepos(login, count = 3) {
    const repos = await ghGet(
      `/users/${encodeURIComponent(login)}/repos?sort=stars&direction=desc&per_page=${count}`
    );
    return repos || [];
  },

  /** Expose the underlying rate limiter for UI panels. */
  rateLimiter,
};