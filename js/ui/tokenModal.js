export class TokenModal {
  constructor() {
    this._overlay = document.getElementById('token-overlay');
    this._input   = document.getElementById('token-input');
    this._save    = document.getElementById('token-save');
    this._clear   = document.getElementById('token-clear');
    this._status  = document.getElementById('token-status');

    this._bind();
    this._refresh();
  }

  _bind() {
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.hide();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._overlay.classList.contains('visible')) this.hide();
    });
    this._save.addEventListener('click',  () => this._saveToken());
    this._clear.addEventListener('click', () => this._clearToken());
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._saveToken();
    });
    const btnClose = document.getElementById('token-close');
    if (btnClose) btnClose.addEventListener('click', () => this.hide());
  }

  _saveToken() {
    const val = this._input.value.trim();
    if (!val) return;
    window.__ghToken = val;
    this._input.value = '';
    this._refresh();
    this.hide();
  }

  _clearToken() {
    window.__ghToken = null;
    this._refresh();
  }

  _refresh() {
    if (window.__ghToken) {
      this._status.textContent = 'Token active - higher rate limits enabled.';
      this._status.className = 'token-status ok';
      this._clear.style.display = 'inline-flex';
    } else {
      this._status.textContent = 'No token set - limited to 60 requests/hour.';
      this._status.className = 'token-status';
      this._clear.style.display = 'none';
    }
  }

  show() { this._refresh(); this._overlay.classList.add('visible'); this._input.focus(); }
  hide() { this._overlay.classList.remove('visible'); }
}
