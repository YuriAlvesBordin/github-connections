/**
 * rateLimitBar.js: tiny bar showing GitHub API rate limit remaining.
 */

import { rateLimiter } from '../rateLimiter.js';

const bar = document.createElement('div');
bar.id = 'rate-limit-bar';
bar.style.cssText = `
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 1000;
  font: 11px monospace;
  color: #8b949e;
  background: rgba(13,17,23,0.9);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #30363d;
  white-space: nowrap;
`;
document.body.appendChild(bar);

rateLimiter.subscribe((snap) => {
  const pct = Math.round((snap.remaining / snap.limit) * 100);
  bar.textContent = `API: ${snap.remaining}/${snap.limit} (${pct}%)`;
  bar.style.color = snap.remaining < 10 ? '#f85149' : '#8b949e';
  if (snap.queueLen > 0) bar.textContent += ` • Q:${snap.queueLen}`;
});