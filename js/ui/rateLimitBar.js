import { rateLimiter } from '../rateLimiter.js';

const container = document.getElementById('rate-limit-bar');
if (!container) throw new Error('rate-limit-bar element missing');

container.innerHTML = `
  <div class="rl-row">
    <span class="rl-label">API</span>
    <span class="rl-counts"><span id="rl-remaining">-</span>/<span id="rl-limit">-</span></span>
    <span id="rl-queue" class="rl-queue" hidden></span>
    <span id="rl-wait"  class="rl-wait"  hidden></span>
  </div>
  <div class="rl-track"><div id="rl-fill" class="rl-fill"></div></div>
`;

const elRemaining = document.getElementById('rl-remaining');
const elLimit     = document.getElementById('rl-limit');
const elQueue     = document.getElementById('rl-queue');
const elWait      = document.getElementById('rl-wait');
const elFill      = document.getElementById('rl-fill');

let countdownTimer = null;

function startCountdown(resetAt) {
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    const secs = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
    if (secs <= 0) {
      clearInterval(countdownTimer);
      elWait.hidden = true;
      return;
    }
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    elWait.textContent = `resets in ${m > 0 ? `${m}m ` : ''}${s}s`;
    elWait.hidden = false;
  }, 1000);
}

rateLimiter.subscribe((snap) => {
  const pct = snap.limit > 0 ? snap.remaining / snap.limit : 1;
  const isThrottled = snap.remaining <= 2 && snap.resetAt > Date.now();

  elRemaining.textContent = snap.remaining;
  elLimit.textContent     = snap.limit;

  elFill.style.width = `${Math.round(pct * 100)}%`;
  elFill.className   = 'rl-fill' + (pct <= 0.1 ? ' danger' : pct <= 0.3 ? ' warn' : '');

  if (snap.queueLen > 0) {
    elQueue.textContent = `${snap.queueLen} pending`;
    elQueue.hidden = false;
  } else {
    elQueue.hidden = true;
  }

  if (isThrottled) {
    startCountdown(snap.resetAt);
    container.classList.add('rl-throttled');
  } else {
    clearInterval(countdownTimer);
    elWait.hidden = true;
    container.classList.remove('rl-throttled');
  }
});
