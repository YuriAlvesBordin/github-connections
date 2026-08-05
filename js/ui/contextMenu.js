export class ContextMenu {
  constructor({ onInfo, onExpand, onFocus, onOpenGithub, onDelete }) {
    this.menu        = document.getElementById('ctx-menu');
    this.itemInfo    = document.getElementById('ctx-info');
    this.itemExpand  = document.getElementById('ctx-expand');
    this.itemFocus   = document.getElementById('ctx-focus');
    this.itemOpen    = document.getElementById('ctx-open');
    this.itemDelete  = document.getElementById('ctx-delete');
    this._node       = null;

    this.itemInfo.addEventListener('click',   () => { if (this._node) onInfo(this._node);       this.hide(); });
    this.itemExpand.addEventListener('click', () => { if (this._node) onExpand(this._node);     this.hide(); });
    this.itemFocus.addEventListener('click',  () => { if (this._node) onFocus(this._node);      this.hide(); });
    this.itemOpen.addEventListener('click',   () => { if (this._node) onOpenGithub(this._node); this.hide(); });
    this.itemDelete.addEventListener('click', () => { if (this._node) onDelete(this._node);     this.hide(); });

    document.addEventListener('click',   () => this.hide());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
  }

  show(node, x, y) {
    this._node = node;
    const isUser = node?.type === 'user';

    this.itemInfo.style.display   = isUser  ? 'flex' : 'none';
    this.itemFocus.style.display  = 'flex';
    this.itemOpen.style.display   = 'flex';
    this.itemDelete.style.display = 'flex';

    let expandLabel = 'expand connections';
    let expandDisabled = !isUser;
    if (isUser) {
      const total = (node.followers_count || 0) + (node.following_count || 0);
      const loaded = node.expandedCount || 0;
      if (loaded > 0) {
        if (total > 0 && loaded >= total) {
          expandLabel = 'fully expanded';
          expandDisabled = true;
        } else {
          expandLabel = total > 0
            ? `expand more (${loaded}/${total})`
            : 'expand again';
        }
      }
    }
    this.itemExpand.textContent = expandLabel;
    this.itemExpand.classList.toggle('disabled', expandDisabled);
    this.itemExpand.style.display = 'flex';

    this.menu.style.left = `${x}px`;
    this.menu.style.top  = `${y}px`;
    this.menu.classList.add('visible');
  }

  hide() {
    this.menu.classList.remove('visible');
    this._node = null;
  }
}
