const STORAGE_KEY = 'gh_onboarding_seen';

export class Onboarding {
  constructor() {
    this.overlay = document.getElementById('onboarding-overlay');
    this.btnSkip = document.getElementById('onboarding-skip');
    this.btnStart = document.getElementById('onboarding-start');
    this._bind();
  }

  _bind() {
    this.btnSkip.addEventListener('click', () => this.hide());
    this.btnStart.addEventListener('click', () => this.hide());
  }

  show() {
    this.overlay.classList.add('visible');
  }

  hide() {
    this.overlay.classList.remove('visible');
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  shouldShow() {
    try { return !localStorage.getItem(STORAGE_KEY); } catch { return true; }
  }

  maybeShow() {
    if (this.shouldShow()) {
      setTimeout(() => this.show(), 400);
    }
  }
}
