export class ContextMenu {
  constructor({ onInfo, onExpand, onFocus, onOpenGithub, onDelete }) {
    this.onInfo = onInfo;
    this.onExpand = onExpand;
    this.onFocus = onFocus;
    this.onOpenGithub = onOpenGithub;
    this.onDelete = onDelete;

    this.menu = document.getElementById('ctx-menu');
    this.itemInfo = document.getElementById('ctx-info');
    this.itemExpand = document.getElementById('ctx-expand');
    this.itemFocus = document.getElementById('ctx-focus');
    this.itemOpen = document.getElementById('ctx-open');
    this.itemDelete = document.getElementById('ctx-delete');

    this._bind();
    this._hideOnClickOutside();
  }

  _bind() {
    this.itemInfo.addEventListener('click', () => {
      if (this.node) this.onInfo(this.node);
      this.hide();
    });
    this.itemExpand.addEventListener('click', () => {
      if (this.node) this.onExpand(this.node);
      this.hide();
    });
    this.itemFocus.addEventListener('click', () => {
      if (this.node) this.onFocus(this.node);
      this.hide();
    });
    this.itemOpen.addEventListener('click', () => {
      if (this.node) this.onOpenGithub(this.node);
      this.hide();
    });
    this.itemDelete.addEventListener('click', () => {
      if (this.node) this.onDelete(this.node);
      this.hide();
    });
  }

  _hideOnClickOutside() {
    document.addEventListener('pointerdown', (e) => {
      if (!this.menu.classList.contains('visible')) return;
      if (!this.menu.contains(e.target)) this.hide();
    });
  }

  show(node, x, y) {
    this.node = node;
    if (!node) return;

    const isUser = node.type === 'user';
    this.itemExpand.style.display = isUser ? 'flex' : 'none';
    this.itemFocus.style.display = 'flex';
    this.itemOpen.style.display = 'flex';
    this.itemDelete.style.display = 'flex';

    this.itemExpand.textContent = node.expanded ? 'already expanded' : 'expand connections';
    this.itemExpand.classList.toggle('disabled', node.expanded || !isUser);

    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.classList.add('visible');

    const rect = this.menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.menu.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }

  hide() {
    this.menu.classList.remove('visible');
    this.node = null;
  }
}
