/**
 * rateLimiter.js — a small queue that:
 *   • respects X-RateLimit-Remaining / -Reset headers
 *   • spaces out requests by ~1.1s when anonymous (avoids secondary limits)
 *   • retries 403 / 429 automatically after reset
 *   • exposes .remaining / .queueLen for UI feedback
 */

import { CONFIG } from './config.js';

class RateLimiter {
  constructor() {
    this.remaining   = CONFIG.DEFAULT_RATE_LIMIT;
    this.limit       = CONFIG.DEFAULT_RATE_LIMIT;
    this.resetAt     = 0;
    this.queue       = [];
    this.inFlight    = false;
    this.timer       = null;
    this.minSpacing  = 1100;  // ms between requests when anonymous
    this.lastRequest = 0;
    this.listeners   = new Set();
  }

  /** Subscribe to remaining/queue changes. Returns an unsubscribe fn. */
  subscribe(fn) {
    this.listeners.add(fn);
    fn(this._snapshot());
    return () => this.listeners.delete(fn);
  }

  _notify() {
    const snap = this._snapshot();
    for (const fn of this.listeners) fn(snap);
  }

  _snapshot() {
    return {
      remaining: this.remaining,
      limit:     this.limit,
      queueLen:  this.queue.length,
      resetAt:   this.resetAt,
      inFlight:  this.inFlight,
    };
  }

  /** Queue a fetch. Resolves with the Response. */
  fetch(url, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject, headers: extraHeaders });
      this._notify();
      if (!this.inFlight && this.timer === null) this._flush();
    });
  }

  async _flush() {
    this.timer = null;
    if (this.inFlight || this.queue.length === 0) return;

    // If we're out of budget, wait until reset.
    if (this.remaining <= 2 && this.resetAt > Date.now()) {
      const wait = this.resetAt - Date.now() + 500;
      this.timer = setTimeout(() => this._flush(), wait);
      return;
    }

    // Enforce min spacing between requests.
    const sinceLast = Date.now() - this.lastRequest;
    if (sinceLast < this.minSpacing) {
      this.timer = setTimeout(() => this._flush(), this.minSpacing - sinceLast);
      return;
    }

    this.inFlight = true;
    this.lastRequest = Date.now();
    const { url, resolve, reject, headers } = this.queue.shift();
    this._notify();

    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github+json', ...headers },
      });

      // Update rate-limit window from headers.
      const rem = res.headers.get('X-RateLimit-Remaining');
      const lim = res.headers.get('X-RateLimit-Limit');
      const rst = res.headers.get('X-RateLimit-Reset');
      if (rem !== null) this.remaining = parseInt(rem, 10);
      if (lim !== null) this.limit     = parseInt(lim, 10);
      if (rst !== null) this.resetAt   = parseInt(rst, 10) * 1000;
      this._notify();

      if (!res.ok) {
        if (res.status === 403 || res.status === 429) {
          // Re-queue and wait until reset.
          this.queue.unshift({ url, resolve, reject, headers });
          this.inFlight = false;
          this._notify();
          const wait = this.resetAt > Date.now()
            ? this.resetAt - Date.now() + 1000
            : 60000;
          this.timer = setTimeout(() => this._flush(), wait);
          return;
        }
        reject(new Error(`HTTP ${res.status} ${res.statusText}`));
      } else {
        resolve(res);
      }
    } catch (e) {
      reject(e);
    }

    this.inFlight = false;
    this._notify();
    if (this.queue.length > 0) {
      this.timer = setTimeout(() => this._flush(), this.minSpacing);
    }
  }
}

/** Singleton rate limiter. */
export const rateLimiter = new RateLimiter();