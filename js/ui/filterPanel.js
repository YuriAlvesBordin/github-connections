export class FilterPanel {
  constructor({ onChange }) {
    this.onChange = onChange;
    this.btn = document.getElementById('btn-filter');
    this.modes = ['all', 'mutual'];
    this.labels = { all: 'all', mutual: 'mutual' };
    this.idx = 0;

    this.btn.addEventListener('click', () => {
      this.idx = (this.idx + 1) % this.modes.length;
      this._update();
      this.onChange({ mode: this.modes[this.idx] });
    });

    this._update();
  }

  _update() {
    const mode = this.modes[this.idx];
    this.btn.title = `filter: ${mode}`;
    this.btn.classList.toggle('btn-primary', mode !== 'all');
  }

  getState() {
    return { mode: this.modes[this.idx] };
  }
}
