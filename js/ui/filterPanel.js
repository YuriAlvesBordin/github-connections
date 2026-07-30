/**
 * filterPanel.js: filter panel for connection types and display options.
 */

export class FilterPanel {
  constructor({ onChange }) {
    this.onChange = onChange;

    this.root = document.getElementById('filter-panel');
    this.chips = {
      all: this.root.querySelector('[data-filter="all"]'),
      mutual: this.root.querySelector('[data-filter="mutual"]'),
      oneway: this.root.querySelector('[data-filter="oneway"]'),
    };
    this.chkArrows = document.getElementById('filter-arrows');
    this.chkLabels = document.getElementById('filter-labels');

    this._bind();
    this._state = { mode: 'all', showArrows: true, showLabels: true };
  }

  _bind() {
    for (const [mode, btn] of Object.entries(this.chips)) {
      btn.addEventListener('click', () => {
        this._state.mode = mode;
        this._updateChips();
        this.onChange(this._state);
      });
    }
    this.chkArrows.addEventListener('change', () => {
      this._state.showArrows = this.chkArrows.checked;
      this.onChange(this._state);
    });
    this.chkLabels.addEventListener('change', () => {
      this._state.showLabels = this.chkLabels.checked;
      this.onChange(this._state);
    });
  }

  _updateChips() {
    for (const [mode, btn] of Object.entries(this.chips)) {
      btn.classList.toggle('active', mode === this._state.mode);
    }
  }

  getState() {
    return { ...this._state };
  }
}