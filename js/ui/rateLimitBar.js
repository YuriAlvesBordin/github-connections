import { rateLimiter } from '../rateLimiter.js';

const bar = document.getElementById('rate-limit-bar');

if (bar) {
  rateLimiter.subscribe((snap) => {
    const pct = snap.limit > 0 ? Math.round((snap.remaining / snap.limit) * 100) : 0;
    let text = `API: ${snap.remaining}/${snap.limit} (${pct}%)`;
    if (snap.queueLen > 0) text += ` · Q:${snap.queueLen}`;
    bar.textContent = text;

    const danger = getComputedStyle(document.documentElement)
      .getPropertyValue('--danger').trim() || '#f85149';
    const muted = getComputedStyle(document.documentElement)
      .getPropertyValue('--muted').trim() || '#8b949e';
    bar.style.color = snap.remaining < 10 ? danger : muted;
  });
}
