import { CONFIG } from './config.js';
import { rateLimiter } from './rateLimiter.js';

function authHeaders() {
  const token = window.__ghToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function ghGet(path) {
  const res = await rateLimiter.fetch(CONFIG.API_BASE + path, authHeaders());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function* ghGetPages(path) {
  let page = 1;
  while (true) {
    const batch = await ghGet(`${path}?per_page=100&page=${page}`);
    if (!batch || batch.length === 0) break;
    yield batch;
    if (batch.length < 100) break;
    page++;
  }
}

export const GitHub = {
  fetchUser(login) {
    return ghGet(`/users/${encodeURIComponent(login)}`);
  },

  async fetchConnections(login, onBatch) {
    for await (const batch of ghGetPages(`/users/${encodeURIComponent(login)}/followers`))
      await onBatch(batch, 'follower');
    for await (const batch of ghGetPages(`/users/${encodeURIComponent(login)}/following`))
      await onBatch(batch, 'following');
  },

  async fetchTopRepos(login, count = 3) {
    const repos = await ghGet(
      `/users/${encodeURIComponent(login)}/repos?sort=stars&direction=desc&per_page=${count}`
    );
    return repos || [];
  },

  rateLimiter,
};
