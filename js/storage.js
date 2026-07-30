import { CONFIG } from './config.js';

const KEY = CONFIG.STORAGE_KEY;

export const Storage = {
  save(graph) {
    try {
      const json = graph.toJSON();
      localStorage.setItem(KEY, JSON.stringify(json));
      return true;
    } catch (e) {
      console.warn('[storage] save failed, attempting prune:', e);
      try {
        const json = graph.toJSON();
        json.nodes = json.nodes.map((n) => ({ ...n, bio: '' }));
        localStorage.setItem(KEY, JSON.stringify(json));
        return true;
      } catch (e2) {
        console.warn('[storage] save failed even after prune:', e2);
        return false;
      }
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[storage] load failed:', e);
      return null;
    }
  },

  clear() {
    try { localStorage.removeItem(KEY); } catch {}
  },
};
