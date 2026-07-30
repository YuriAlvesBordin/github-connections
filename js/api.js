import { CONFIG } from './config.js';
import { rateLimiter } from './rateLimiter.js';

function authHeaders() {
  return {};
}

async function ghGet(path) {
  const res = await rateLimiter.fetch(CONFIG.API_BASE + path, authHeaders());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const GitHub = {
  fetchUser(login) {
    return ghGet(`/users/${encodeURIComponent(login)}`);
  },

  async fetchConnections(login, perPage = CONFIG.MAX_PER_EXPAND) {
    const [followers, following] = await Promise.all([
      ghGet(`/users/${encodeURIComponent(login)}/followers?per_page=${perPage}`),
      ghGet(`/users/${encodeURIComponent(login)}/following?per_page=${perPage}`),
    ]);
    return { followers: followers || [], following: following || [] };
  },

  async fetchTopRepos(login, count = 3) {
    const repos = await ghGet(
      `/users/${encodeURIComponent(login)}/repos?sort=stars&direction=desc&per_page=${count}`
    );
    return repos || [];
  },

  rateLimiter,
};