export class ContextMenu {
  constructor({ onExpand, onFocus, onOpenGithub, onDelete }) {
    this.onExpand = onExpand;
    this.onFocus = onFocus;
    this.onOpenGithub = onOpenGithub;
    this.onDelete = onDelete;

    this.menu = document.getElementById('ctx-menu');
    this.itemExpand = document.getElementById('ctx-expand');
    this.itemFocus = document.getElementById('ctx-focus');
    this.itemOpen = document.getElementById('ctx-open');
    this.itemDelete = document.getElementById('ctx-delete');

    this._bind();
    this._hideOnClickOutside();
  }

  _bind() {
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
    this.itemExpand.style.display = isUser ? 'block' : 'none';
    this.itemFocus.style.display = 'block';
    this.itemOpen.style.display = 'block';
    this.itemDelete.style.display = 'block';

    this.itemExpand.textContent = node.expanded ? 'already expanded' : 'expand connections';
    this.itemExpand.classList.toggle('disabled', node.expanded || !isUser);
    this.itemExpand.style.pointerEvents = (node.expanded || !isUser) ? 'none' : '';

    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.classList.add('visible');
  }

  hide() {
    this.menu.classList.remove('visible');
    this.node = null;
  }
}