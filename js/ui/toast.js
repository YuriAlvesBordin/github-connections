export const toast = {
  show(message, duration = 3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.hide(), duration);
  },

  ok(message) {
    this.show(message, 2500);
  },

  err(message) {
    this.show(message, 5000);
  },

  hide() {
    const el = document.getElementById('toast');
    if (!el) return;
    el.classList.remove('visible');
  },
};
