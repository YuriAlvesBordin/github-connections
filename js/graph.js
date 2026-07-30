/**
 * graph.js — directed graph model.
 *
 * Tracks nodes + directed follow edges (A → B means "A follows B").
 * Supports efficient queries for mutual vs one-way connections.
 *
 * Edges are stored as adjacency maps for O(1) lookups:
 *   outgoing: Map<id, Set<id>>   who this node follows
 *   incoming: Map<id, Set<id>>   who follows this node
 *
 * For rendering / physics we also expose a deduplicated pair list:
 *   pairs(): Array<[aId, bId, type]>
 *   where type ∈ { 'mutual', 'oneway-a-to-b', 'oneway-b-to-a' }
 */

let _nextId = 1;

export const graph = {
  nodes: new Map(),
  loginMap: new Map(),
  repoMap: new Map(),
  repoEdges: new Map(),
  outgoing: new Map(),
  incoming: new Map(),

  /** Reset everything. */
  clear() {
    this.nodes.clear();
    this.loginMap.clear();
    this.repoMap.clear();
    this.outgoing.clear();
    this.incoming.clear();
    this.repoEdges.clear();
    _nextId = 1;
  },

  /**
   * Add a node from a raw GitHub user object.
   * If a node with the same login exists, it is updated with fresh data.
   * Returns the node id.
   * `addedAt` lets the caller stagger pop-in animations.
   */
  addUser(user, addedAt = Date.now()) {
    if (!user || !user.login) return null;
    const existing = this.loginMap.get(user.login);
    if (existing !== undefined) {
      const node = this.nodes.get(existing);
      node.avatar = user.avatar_url || node.avatar;
      node.bio = user.bio || node.bio;
      node.followers_count = user.followers ?? node.followers_count;
      node.following_count = user.following ?? node.following_count;
      node.name = user.name || node.name;
      node.html_url = user.html_url || node.html_url;
      node.expanded = node.expanded || false;
      return existing;
    }
    const id = _nextId++;
    this.nodes.set(id, {
      id,
      type: 'user',
      login: user.login,
      name: user.name || user.login,
      avatar: user.avatar_url || '',
      bio: user.bio || '',
      html_url: user.html_url || `https://github.com/${user.login}`,
      followers_count: user.followers ?? null,
      following_count: user.following ?? null,
      expanded: false,
      addedAt,
    });
    this.loginMap.set(user.login, id);
    this.outgoing.set(id, new Set());
    this.incoming.set(id, new Set());
    return id;
  },

  /**
   * Add a repo node attached to a user.
   * Repos are stored separately from users (they don't participate in
   * follow-edges or the login map). Returns the repo node id.
   */
  addRepo(repo, userId, addedAt = Date.now()) {
    if (!repo || !repo.full_name) return null;
    const key = `${userId}:${repo.full_name}`;
    if (this.repoMap.has(key)) return this.repoMap.get(key);
    const id = _nextId++;
    this.nodes.set(id, {
      id,
      type: 'repo',
      parentId: userId,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      stars: repo.stargazers_count ?? 0,
      description: repo.description || '',
      language: repo.language || '',
      addedAt,
    });
    this.repoMap.set(key, id);
    if (!this.repoEdges.has(userId)) this.repoEdges.set(userId, new Set());
    this.repoEdges.get(userId).add(id);
    return id;
  },

  /**
   * Add a directed edge "from follows to".
   * No-op if from === to or edge already exists.
   */
  addDirectedEdge(fromId, toId) {
    if (fromId === toId) return false;
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return false;
    const out = this.outgoing.get(fromId);
    if (out.has(toId)) return false;
    out.add(toId);
    this.incoming.get(toId).add(fromId);
    return true;
  },

  /** Remove a node + all its incident edges. */
  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return false;
    this.nodes.delete(id);

    if (node.type === 'user') {
      this.loginMap.delete(node.login);
      for (const target of this.outgoing.get(id) || []) {
        this.incoming.get(target)?.delete(id);
      }
      for (const source of this.incoming.get(id) || []) {
        this.outgoing.get(source)?.delete(id);
      }
      this.outgoing.delete(id);
      this.incoming.delete(id);
      const repos = this.repoEdges.get(id);
      if (repos) {
        for (const rid of repos) {
          const rNode = this.nodes.get(rid);
          if (rNode) {
            this.nodes.delete(rid);
            this.repoMap.delete(`${id}:${rNode.full_name}`);
          }
        }
        this.repoEdges.delete(id);
      }
    } else {
      if (node.parentId != null) {
        this.repoEdges.get(node.parentId)?.delete(id);
        this.repoMap.delete(`${node.parentId}:${node.full_name}`);
      }
    }
    return true;
  },

  /** Look up a node id by login. */
  idOf(login) { return this.loginMap.get(login); },

  /** Look up a node by id. */
  nodeOf(id) { return this.nodes.get(id); },

  /** Does `fromId` follow `toId`? */
  follows(fromId, toId) {
    return this.outgoing.get(fromId)?.has(toId) ?? false;
  },

  /** Are these two nodes mutually following each other? */
  isMutual(aId, bId) {
    return this.follows(aId, bId) && this.follows(bId, aId);
  },

  /**
   * Yield deduplicated connection pairs.
   * Each pair [a, b, type] is yielded once.
   * type is one of:
   *   'mutual'              (both directions)
   *   'oneway'              (a → b only, where a < b by id)
   *   'oneway-reverse'      (b → a only — same pair as 'oneway' but
   *                          we tag the actual follower)
   *
   * For rendering we only need the unordered pair + the directionality.
   */
  pairs() {
    const seen = new Set();
    const result = [];
    for (const [a, outs] of this.outgoing) {
      for (const b of outs) {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const aToB = this.follows(a, b);
        const bToA = this.follows(b, a);
        if (aToB && bToA) {
          result.push([a, b, 'mutual']);
        } else if (aToB) {
          result.push([a, b, 'oneway']);
        } else {
          result.push([a, b, 'oneway-reverse']);
        }
      }
    }
    return result;
  },

  /** Total directed edge count (follows only, excludes repo edges). */
  edgeCount() {
    let n = 0;
    for (const outs of this.outgoing.values()) n += outs.size;
    return n;
  },

  /** Repo-edge count (user → repo). */
  repoEdgeCount() {
    let n = 0;
    for (const repos of this.repoEdges.values()) n += repos.size;
    return n;
  },

  /** Yield all repo edges as [userId, repoId] pairs. */
  repoPairs() {
    const result = [];
    for (const [userId, repos] of this.repoEdges) {
      for (const rid of repos) result.push([userId, rid]);
    }
    return result;
  },

  /** Degree = number of distinct neighbors (in ∪ out, excludes repos). */
  degree(id) {
    const out = this.outgoing.get(id);
    const inc = this.incoming.get(id);
    if (!out && !inc) return 0;
    const s = new Set(out || []);
    for (const x of (inc || [])) s.add(x);
    return s.size;
  },

  /** How many of `id`'s connections are mutual? */
  mutualCount(id) {
    const out = this.outgoing.get(id);
    let n = 0;
    for (const other of out) {
      if (this.follows(other, id)) n++;
    }
    return n;
  },

  /** How many of `id`'s connections are one-way (id follows but not followed back, or vice versa)? */
  onewayCount(id) {
    const out = this.outgoing.get(id);
    const inc = this.incoming.get(id);
    let n = 0;
    for (const other of out) if (!this.follows(other, id)) n++;
    for (const other of inc) if (!this.follows(id, other)) n++;
    return n;
  },

  /** Total distinct neighbors of `id`. */
  neighborCount(id) {
    return this.degree(id);
  },

  /** Is `id` already expanded (we've fetched its followers/following)? */
  isExpanded(id) {
    return this.nodes.get(id)?.expanded ?? false;
  },

  /** Mark a node as expanded. */
  markExpanded(id) {
    const n = this.nodes.get(id);
    if (n) n.expanded = true;
  },

  /** Serialize for persistence. */
  toJSON() {
    return {
      version: 3,
      nextId: _nextId,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.outgoing.entries())
        .flatMap(([from, outs]) => Array.from(outs).map((to) => [from, to])),
      repoEdges: Array.from(this.repoEdges.entries())
        .flatMap(([uid, repos]) => Array.from(repos).map((rid) => [uid, rid])),
    };
  },

  /** Hydrate from a previously serialized object. */
  fromJSON(data) {
    this.clear();
    if (!data || (data.version !== 2 && data.version !== 3)) return false;
    _nextId = data.nextId ?? 1;
    for (const n of data.nodes) {
      const node = { ...n };
      if (!node.type) node.type = 'user';
      this.nodes.set(n.id, node);
      if (node.type === 'user') {
        this.loginMap.set(node.login, n.id);
        this.outgoing.set(n.id, new Set());
        this.incoming.set(n.id, new Set());
      } else if (node.type === 'repo' && node.parentId != null) {
        this.repoMap.set(`${node.parentId}:${node.full_name}`, n.id);
        if (!this.repoEdges.has(node.parentId)) this.repoEdges.set(node.parentId, new Set());
        this.repoEdges.get(node.parentId).add(n.id);
      }
    }
    for (const [from, to] of data.edges || []) {
      this.outgoing.get(from)?.add(to);
      this.incoming.get(to)?.add(from);
    }
    if (data.repoEdges) {
      for (const [uid, rid] of data.repoEdges) {
        if (!this.repoEdges.has(uid)) this.repoEdges.set(uid, new Set());
        this.repoEdges.get(uid).add(rid);
      }
    }
    return true;
  },
};