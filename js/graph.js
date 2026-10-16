export class Graph {
  constructor() {
    this.nodes     = new Map();
    this.loginMap  = new Map();
    this.edges     = new Map();
    this.directed  = new Map();
    this.repoEdges = new Map();
    this._nextId   = 1;
  }

  _id() { return this._nextId++; }

  idOf(login) { return this.loginMap.get(login.toLowerCase()); }
  nodeOf(id)  { return this.nodes.get(id); }
  degree(id)  { return this.edges.get(id)?.size ?? 0; }

  addUser(data, addedAt = Date.now()) {
    const login = data.login.toLowerCase();
    const existing = this.loginMap.get(login);
    if (existing !== undefined) {
      const node = this.nodes.get(existing);
      if (data.followers_count != null) node.followers_count = data.followers_count;
      if (data.following_count != null) node.following_count = data.following_count;
      if (data.avatar_url)              node.avatar_url      = data.avatar_url;
      if (data.html_url)                node.html_url        = data.html_url;
      if (data.name != null)            node.name            = data.name;
      if (data.bio  != null)            node.bio             = data.bio;
      return existing;
    }
    const id = this._id();
    this.nodes.set(id, {
      id,
      type:            'user',
      login:           data.login,
      name:            data.name            || null,
      avatar_url:      data.avatar_url      || null,
      html_url:        data.html_url        || `https://github.com/${data.login}`,
      bio:             data.bio             || null,
      followers_count: data.followers_count || 0,
      following_count: data.following_count || 0,
      public_repos:    data.public_repos    || 0,
      expandedCount:   0,
      addedAt,
    });
    this.loginMap.set(login, id);
    this.edges.set(id, new Set());
    this.directed.set(id, new Set());
    return id;
  }

  addRepo(data, ownerId, addedAt = Date.now()) {
    const key = (data.full_name || data.name).toLowerCase();
    for (const [id, node] of this.nodes) {
      if (node.type === 'repo' && (node.full_name || '').toLowerCase() === key) return id;
    }
    const id = this._id();
    this.nodes.set(id, {
      id,
      type:        'repo',
      name:        data.name,
      full_name:   data.full_name,
      description: data.description || null,
      html_url:    data.html_url    || `https://github.com/${data.full_name}`,
      stargazers_count: data.stargazers_count || 0,
      language:    data.language   || null,
      addedAt,
    });
    this.edges.set(id, new Set());
    if (!this.repoEdges.has(ownerId)) this.repoEdges.set(ownerId, new Set());
    this.repoEdges.get(ownerId).add(id);
    this.addUndirectedEdge(ownerId, id);
    return id;
  }

  addUndirectedEdge(a, b) {
    if (!this.edges.has(a) || !this.edges.has(b)) return false;
    if (this.edges.get(a).has(b)) return false;
    this.edges.get(a).add(b);
    this.edges.get(b).add(a);
    return true;
  }

  addDirectedEdge(from, to) {
    if (!this.directed.has(from)) this.directed.set(from, new Set());
    if (this.directed.get(from).has(to)) return false;
    this.directed.get(from).add(to);
    this.addUndirectedEdge(from, to);
    return true;
  }

  markExpanded(id, count = 0) {
    const node = this.nodes.get(id);
    if (!node) return;
    node.expandedCount = (node.expandedCount || 0) + count;
    node.expanded = true;
  }

  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;
    if (node.type === 'user') this.loginMap.delete(node.login.toLowerCase());
    for (const nbr of (this.edges.get(id) || [])) {
      this.edges.get(nbr)?.delete(id);
      this.directed.get(nbr)?.delete(id);
    }
    this.directed.delete(id);
    this.edges.delete(id);
    this.nodes.delete(id);
    if (node.type === 'repo') {
      for (const [, set] of this.repoEdges) set.delete(id);
    } else {
      this.repoEdges.delete(id);
    }
  }

  *pairs() {
    const seen = new Set();
    for (const [a, nbrs] of this.edges) {
      for (const b of nbrs) {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const aToB = this.directed.get(a)?.has(b) ?? false;
        const bToA = this.directed.get(b)?.has(a) ?? false;
        const type = (aToB && bToA) ? 'mutual'
                   : aToB ? 'oneway'
                   : bToA ? 'oneway-reverse'
                   : 'oneway';
        yield [a, b, type];
      }
    }
  }

  follows(from, to) {
    return this.directed.get(from)?.has(to) ?? false;
  }

  mutualCount(id) {
    const out = this.directed.get(id);
    if (!out) return 0;
    let n = 0;
    for (const other of out) {
      if (this.directed.get(other)?.has(id)) n++;
    }
    return n;
  }

  onewayCount(id) {
    const out = this.directed.get(id) || new Set();
    const inc = new Set();
    for (const [from, tos] of this.directed) {
      if (tos.has(id)) inc.add(from);
    }
    let n = 0;
    for (const other of out) if (!this.directed.get(other)?.has(id)) n++;
    for (const other of inc) if (!out.has(other)) n++;
    return n;
  }

  neighborCount(id) {
    return this.edges.get(id)?.size ?? 0;
  }

  *repoPairs() {
    for (const [uid, rids] of this.repoEdges) {
      for (const rid of rids) yield [uid, rid];
    }
  }

  clear() {
    this.nodes.clear(); this.loginMap.clear();
    this.edges.clear(); this.directed.clear(); this.repoEdges.clear();
    this._nextId = 1;
  }

  toJSON() {
    const nodes = [];
    for (const node of this.nodes.values()) nodes.push({ ...node });
    const edges = [];
    for (const [a, b] of this.pairs()) edges.push([a, b]);
    const directed = [];
    for (const [from, tos] of this.directed) {
      for (const to of tos) directed.push([from, to]);
    }
    const repoEdges = [];
    for (const [uid, rids] of this.repoEdges) {
      for (const rid of rids) repoEdges.push([uid, rid]);
    }
    return { nodes, edges, directed, repoEdges, nextId: this._nextId };
  }

  fromJSON(data) {
    this.clear();
    if (data.nextId) this._nextId = data.nextId;
    for (const node of data.nodes || []) {
      if (node.expanded && !node.expandedCount) node.expandedCount = 1;
      this.nodes.set(node.id, node);
      if (node.type === 'user') this.loginMap.set(node.login.toLowerCase(), node.id);
      this.edges.set(node.id, new Set());
      if (node.type === 'user') this.directed.set(node.id, new Set());
    }
    for (const [a, b] of data.edges || []) {
      this.edges.get(a)?.add(b);
      this.edges.get(b)?.add(a);
    }
    for (const [from, to] of data.directed || []) {
      if (!this.directed.has(from)) this.directed.set(from, new Set());
      this.directed.get(from).add(to);
    }
    for (const [uid, rid] of data.repoEdges || []) {
      if (!this.repoEdges.has(uid)) this.repoEdges.set(uid, new Set());
      this.repoEdges.get(uid).add(rid);
    }
  }
}

export const graph = new Graph();
