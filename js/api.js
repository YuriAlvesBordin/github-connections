import { CONFIG } from './config.js';
import { rateLimiter } from './rateLimiter.js';

function authHeaders() {
  const token = window.__ghToken;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

async function ghGet(path) {
  const res = await rateLimiter.fetch(CONFIG.API_BASE + path, authHeaders());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function ghGetAll(path, maxNodes = CONFIG.MAX_PER_EXPAND) {
  const results = [];
  let page = 1;
  const perPage = Math.min(100, maxNodes);

  while (results.length < maxNodes) {
    const batch = await ghGet(`${path}?per_page=${perPage}&page=${page}`);
    if (!batch || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return results.slice(0, maxNodes);
}

export const GitHub = {
  fetchUser(login) {
    return ghGet(`/users/${encodeURIComponent(login)}`);
  },

  async fetchConnections(login, maxNodes = CONFIG.MAX_PER_EXPAND) {
    const [followers, following] = await Promise.all([
      ghGetAll(`/users/${encodeURIComponent(login)}/followers`, maxNodes),
      ghGetAll(`/users/${encodeURIComponent(login)}/following`, maxNodes),
    ]);
    return { followers, following };
  },

  async fetchTopRepos(login, count = 3) {
    const repos = await ghGet(
      `/users/${encodeURIComponent(login)}/repos?sort=stars&direction=desc&per_page=${count}`
    );
    return repos || [];
  },

  rateLimiter,
};
