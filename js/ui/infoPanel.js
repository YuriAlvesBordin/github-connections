export class InfoModal {
  constructor({ graph, onExpand, onShowRepos, onFetchUser }) {
    this.graph = graph;
    this.onExpand = onExpand;
    this.onShowRepos = onShowRepos;
    this.onFetchUser = onFetchUser;

    this.overlay = document.getElementById('modal-overlay');
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
    this.btnClose = document.getElementById('modal-close');

    this._bind();
  }

  _bind() {
    this.btnClose.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.btnExpand.addEventListener('click', () => {
      if (this.node) this.onExpand(this.node);
    });
    this.btnRepos.addEventListener('click', () => {
      if (this.node) this.onShowRepos(this.node);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('visible')) {
        this.hide();
      }
    });
  }

  show(node) {
    this.node = node;
    if (!node) return;
    this._render(node);
    this.overlay.classList.add('visible');
    if (node.type === 'user' && node.followers_count == null && this.onFetchUser) {
      this.onFetchUser(node).then(() => this.refresh()).catch(() => {});
    }
  }

  hide() {
    this.overlay.classList.remove('visible');
  }

  _render(node) {
    const isRepo = node.type === 'repo';

    this.avatar.src = isRepo ? '' : (node.avatar_url || '');
    this.avatar.alt = isRepo ? '' : node.login;
    this.avatar.style.display = isRepo ? 'none' : 'block';

    this.title.textContent = isRepo ? node.name : (node.name || node.login);
    this.link.href = node.html_url || '#';

    if (isRepo) {
      this.sub.textContent = `${node.stargazers_count || 0} stars${node.language ? ' · ' + node.language : ''}`;
      this.desc.textContent = node.description || 'No description provided.';
      this.mutual.textContent = '-';
      this.oneway.textContent = '-';
      this.total.textContent = node.stargazers_count || 0;
    } else {
      this.sub.textContent = `${node.followers_count ?? '?'} followers · ${node.following_count ?? '?'} following`;
      this.desc.textContent = node.bio || 'No bio available.';
      this.mutual.textContent = this.graph.mutualCount(node.id);
      this.oneway.textContent = this.graph.onewayCount(node.id);
      this.total.textContent = this.graph.neighborCount(node.id);
    }

    this.btnExpand.style.display = isRepo ? 'none' : 'flex';
    this.btnExpand.textContent = node.expanded ? 'expanded' : 'expand connections';
    this.btnExpand.disabled = node.expanded || isRepo;

    this.btnRepos.style.display = isRepo ? 'none' : 'flex';
    const hasRepos = !isRepo && this.graph.repoEdges.has(node.id) && this.graph.repoEdges.get(node.id).size > 0;
    this.btnRepos.textContent = hasRepos ? 'repos shown' : 'show top repos';
    this.btnRepos.disabled = hasRepos;
  }

  refresh() {
    if (this.node && this.overlay.classList.contains('visible')) {
      this._render(this.node);
    }
  }
}
