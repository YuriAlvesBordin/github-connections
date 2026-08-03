import { TokenModal } from './tokenModal.js';

export class Topbar {
  constructor({ onLoad, onClear, onFit, onReheat }) {
    this.onLoad   = onLoad;
    this.onClear  = onClear;
    this.onFit    = onFit;
    this.onReheat = onReheat;

    this.input     = document.getElementById('username-input');
    this.btnLoad   = document.getElementById('btn-load');
    this.btnClear  = document.getElementById('btn-clear');
    this.btnFit    = document.getElementById('btn-fit');
    this.btnReheat = document.getElementById('btn-shuffle');
    this.btnToken  = document.getElementById('btn-token');

    this._tokenModal = new TokenModal();
    this._bind();
  }

  _bind() {
    this.btnLoad.addEventListener('click', () => this._load());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._load();
    });
    this.btnClear.addEventListener('click',  () => this.onClear());
    this.btnFit.addEventListener('click',    () => this.onFit());
    this.btnReheat.addEventListener('click', () => this.onReheat());
    this.btnToken.addEventListener('click',  () => this._tokenModal.show());
  }

  _load() {
    const value = this.input.value.trim();
    if (!value) return;
    this.onLoad(value);
  }

  setValue(value) { this.input.value = value; }
  getValue()      { return this.input.value.trim(); }
}
