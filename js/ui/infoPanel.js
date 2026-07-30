/**
 * infoPanel.js — right sidebar showing details for the hovered/selected node.
 */

export class InfoPanel {
  constructor({ graph, onExpand, onShowRepos }) {
    this.graph = graph;
    this.onExpand = onExpand;
    this.onShowRepos = onShowRepos;

    this.panel = document.getElementById('info-panel');
    this.avatar = document.getElementById('info-avatar');
    this.title = document.getElementById('info-title');
    this.link = document.getElementById('info-link');
    this.sub = document.getElementById('info-sub');
    this.desc = document.getElementById('info-desc');
    this.mutual = document.getElementById('info-mutual');
    this.oneway = document.getElementById('info-oneway');
    this.total = document.getElementById('info-total');
    this.btnExpand = document.getElementById('btn-expand');
    this.btnRepos = document.getElementById('btn-repos');

    this._bind();
    this.setNode(null);
  }

  _bind() {
    this.btnExpand.addEventListener('click', () => {
      if (this.node) this.onExpand(this.node);
    });
    this.btnRepos.addEventListener('click', () => {
      if (this.node) this.onShowRepos(this.node);
    });
  }

  setNode(node) {
    this.node = node;
    if (!node) {
      this.panel.classList.remove('visible');
      return;
    }
    this.panel.classList.add('visible');
    this._render(node);
  }

  _render(node) {
    const isRepo = node.type === 'repo';

    this.avatar.src = isRepo ? '' : (node.avatar || '');
    this.avatar.alt = isRepo ? '' : node.login;
    this.avatar.style.display = isRepo ? 'none' : 'block';

    this.title.textContent = isRepo ? node.name : (node.name || node.login);
    this.link.href = node.html_url || '#';
    this.link.style.display = 'inline-flex';

    if (isRepo) {
      this.sub.textContent = `Repository · ${node.language || 'Unknown'}`;
      this.desc.textContent = node.description || 'No description provided.';
      this.mutual.textContent = '—';
      this.oneway.textContent = '—';
      this.total.textContent = `★ ${node.stars || 0}`;
    } else {
      this.sub.textContent = `@${node.login}`;
      this.desc.textContent = node.bio || 'No bio available.';
      this.mutual.textContent = this.graph.mutualCount(node.id);
      this.oneway.textContent = this.graph.onewayCount(node.id);
      this.total.textContent = this.graph.neighborCount(node.id);
    }

    this.btnExpand.style.display = isRepo ? 'none' : 'block';
    this.btnExpand.textContent = node.expanded ? 'expanded' : 'expand connections';
    this.btnExpand.disabled = node.expanded || isRepo;

    this.btnRepos.style.display = isRepo ? 'none' : 'block';
  }

  refresh() {
    if (this.node) this._render(this.node);
  }
}