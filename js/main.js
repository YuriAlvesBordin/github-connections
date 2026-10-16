import { CONFIG } from './config.js';
import { graph } from './graph.js';
import { Storage } from './storage.js';
import { GitHub } from './api.js';
import { Graphium } from '../vendor/graphium/index.js';
import { Topbar } from './ui/topbar.js';
import { InfoModal } from './ui/infoPanel.js';
import { ContextMenu } from './ui/contextMenu.js';
import { FilterPanel } from './ui/filterPanel.js';
import { toast } from './ui/toast.js';
import './ui/rateLimitBar.js';
import { Onboarding } from './ui/onboarding.js';

const BOOT_USER = 'yurialvesbordin';
const STAGGER_MS = 60;

const COLORS = {
  mutual: '#22c55e',
  oneway: '#f97316',
  repo:   '#a855f7',
  user:   '#64748b',
};

const USER_RADIUS = 14;
const REPO_RADIUS = 10;
const USER_REST = 170;
const REPO_REST = 80;

// ---------------------------------------------------------------------------
// Graphium instance: physics + WebGL rendering + camera + pointer interaction
// ---------------------------------------------------------------------------
const graphium = Graphium.create({
  canvas: document.getElementById('canvas'),
  autoStart: true,
  autoResize: true,
  nodeCapacity: 2048,
  linkCapacity: 4096,
  physics: {
    preset: 'silk',
    repulsion: 8000,
    gravity: 0.0035,
    maxSpeed: 18,
  },
  camera: { minZoom: CONFIG.RENDER.MIN_SCALE, maxZoom: CONFIG.RENDER.MAX_SCALE },
  theme: {
    node: {
      radius: USER_RADIUS,
      color: COLORS.user,
      borderWidth: 2,
      borderOpacity: 0.9,
    },
    edge: {
      width: 1.5,
      opacity: 0.8,
    },
    label: {
      enabled: true,
      position: 'below',
      offset: 6,
      size: 11,
      color: '#aaaaaa',
    },
  },
});

// ---------------------------------------------------------------------------
// Sync helpers: mirror the data-layer graph into Graphium
// ---------------------------------------------------------------------------

function pairKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

function findLinkId(a, b) {
  for (const id of graphium.linkIds()) {
    const s = graphium.getLink(id);
    if (!s) continue;
    if ((s.source === a && s.target === b) || (s.source === b && s.target === a)) return id;
  }
  return null;
}

function linkStyleForPair(a, b) {
  const na = graph.nodeOf(a);
  const nb = graph.nodeOf(b);
  if (!na || !nb) return null;
  if (na.type === 'repo' || nb.type === 'repo') {
    return { color: COLORS.repo, restLength: REPO_REST };
  }
  const mutual = graph.follows(a, b) && graph.follows(b, a);
  return { color: mutual ? COLORS.mutual : COLORS.oneway, restLength: USER_REST };
}

function ensureLink(a, b) {
  const existing = findLinkId(a, b);
  if (existing) {
    const style = linkStyleForPair(a, b);
    if (style) graphium.linkById(existing).style(style);
    return existing;
  }
  const style = linkStyleForPair(a, b) || { color: '#888888' };
  graphium.link(a, b, style);
  return null;
}

function addNodeToGraphium(id, x, y) {
  const node = graph.nodeOf(id);
  if (!node || graphium.getNode(id)) return;
  const opts = {
    label: node.type === 'user' ? node.login : node.name,
    radius: node.type === 'user' ? USER_RADIUS : REPO_RADIUS,
    color: node.type === 'user' ? COLORS.user : COLORS.repo,
    data: {},
  };
  if (typeof x === 'number' && typeof y === 'number') { opts.x = x; opts.y = y; }
  graphium.addNode(id, opts);
  if (node.type === 'user' && node.avatar_url) {
    graphium.setNodeImage(id, node.avatar_url, 'cover');
  }
}

/** Pushes the whole data graph into Graphium (used on restore). */
function syncAllToGraphium(positions) {
  graphium.clear();
  for (const node of graph.nodes.values()) {
    const p = positions?.[node.id];
    addNodeToGraphium(node.id, p?.x, p?.y);
  }
  for (const [a, b] of graph.pairs()) ensureLink(a, b);
  for (const [uid, rid] of graph.repoPairs()) ensureLink(uid, rid);
  graphium.physics.wake();
}

function nodeWorldPos(id) {
  const snap = graphium.getNode(id);
  return snap ? { x: snap.x, y: snap.y } : { x: 0, y: 0 };
}

// ---------------------------------------------------------------------------
// Visibility filters (connection type + person highlight)
// ---------------------------------------------------------------------------
let personFilterIds = null;

function pairVisibleInMode(a, b, mode) {
  if (mode === 'all') return true;
  const na = graph.nodeOf(a);
  const nb = graph.nodeOf(b);
  if (!na || !nb) return false;
  if (na.type === 'repo' || nb.type === 'repo') return false;
  const mutual = graph.follows(a, b) && graph.follows(b, a);
  if (mode === 'mutual') return mutual;
  if (mode === 'oneway') return !mutual;
  return true;
}

function applyVisibility() {
  const mode = typeof filterPanel !== 'undefined' && filterPanel
    ? filterPanel.getState().mode
    : 'all';
  const hasVisibleLink = new Set();
  for (const id of graphium.linkIds()) {
    const s = graphium.getLink(id);
    if (!s) continue;
    let visible = pairVisibleInMode(s.source, s.target, mode);
    if (visible && personFilterIds) {
      visible = personFilterIds.has(s.source) && personFilterIds.has(s.target);
    }
    graphium.linkById(id)?.style({ hidden: !visible });
    if (visible) { hasVisibleLink.add(s.source); hasVisibleLink.add(s.target); }
  }
  for (const id of graphium.nodeIds()) {
    let hidden = personFilterIds ? !personFilterIds.has(id) : false;
    if (!hidden && mode !== 'all' && !hasVisibleLink.has(id)) hidden = true;
    graphium.node(id)?.style({ hidden });
  }
  graphium.requestRender();
}

function refreshFilter() {
  applyVisibility();
}

function applyFilters(state) {
  applyVisibility();
}

function applyPersonFilter(query) {
  if (!query) {
    personFilterIds = null;
    applyVisibility();
    return;
  }
  const targetId = graph.idOf(query);
  if (targetId === undefined) {
    personFilterIds = null;
    applyVisibility();
    return;
  }
  personFilterIds = getConnectedNodeIds(targetId);
  applyVisibility();
}

function getConnectedNodeIds(targetId) {
  const connected = new Set([targetId]);
  const edges = graph.edges.get(targetId);
  if (edges) for (const n of edges) connected.add(n);
  const expandRepos = (id) => {
    const repos = graph.repoEdges.get(id);
    if (repos) for (const r of repos) connected.add(r);
  };
  expandRepos(targetId);
  for (const id of Array.from(connected)) expandRepos(id);
  return connected;
}

// ---------------------------------------------------------------------------
// Selection + UI plumbing
// ---------------------------------------------------------------------------
let selected = null;
let booted = false;

function selectNode(node) {
  selected = node;
  if (node) graphium.selectNode(node.id, true);
  else graphium.clearSelection();
  contextMenu.hide();
}

function focusNode(node) {
  selectNode(node);
  if (!node) return;
  graphium.focus(node.id);
  const p = nodeWorldPos(node.id);
  graphium.centerOn(p.x, p.y);
}

function fitToView() {
  if (graphium.nodeCount === 0) { toast.show('nothing to fit'); return; }
  graphium.fit(60);
}

function regenerateLayout() {
  const count = graphium.nodeCount;
  if (count === 0) { toast.show('nothing to regenerate'); return; }
  // physics.reset() preserva posições; re-espalha os nós antes de reiniciar
  const golden = Math.PI * (3 - Math.sqrt(5));
  const spread = Math.min(900, 140 + count * 16);
  let i = 0;
  for (const id of graphium.nodeIds()) {
    const r = Math.sqrt((i + 0.5) / count) * spread;
    const a = golden * i + Math.random() * 0.5;
    graphium.node(id)?.move(Math.cos(a) * r, Math.sin(a) * r);
    i++;
  }
  graphium.reboot();
  toast.show('regenerating layout');
}

// Persistence: graph.toJSON() plus live node positions from Graphium
const persistProxy = {
  toJSON() {
    const data = graph.toJSON();
    const positions = {};
    for (const id of graphium.nodeIds()) {
      const s = graphium.getNode(id);
      if (s) positions[id] = { x: s.x, y: s.y };
    }
    return { ...data, positions };
  },
};

function saveState() { Storage.save(persistProxy); }

// ---------------------------------------------------------------------------
// GitHub flows
// ---------------------------------------------------------------------------
async function fetchUserProfile(node) {
  try {
    const user = await GitHub.fetchUser(node.login);
    graph.addUser(user, node.addedAt);
    saveState();
  } catch (e) { /* keep cached profile */ }
}

function isFullyExpanded(node) {
  if (!node.expandedCount) return false;
  const total = (node.followers_count || 0) + (node.following_count || 0);
  if (total === 0) return true;
  return node.expandedCount >= total;
}

async function loadUser(login) {
  const existingId = graph.idOf(login);
  if (existingId !== undefined) {
    const node = graph.nodeOf(existingId);
    selectNode(node);
    const p = nodeWorldPos(existingId);
    graphium.centerOn(p.x, p.y);
    toast.show(`@${login} already loaded`);
    return;
  }
  toast.show(`loading @${login}...`);
  try {
    const user = await GitHub.fetchUser(login);
    const now = Date.now();
    const id = graph.addUser(user, now);
    addNodeToGraphium(id);
    refreshFilter();
    selectNode(graph.nodeOf(id));
    saveState();
    toast.ok(`loaded @${login}`);
    const p = nodeWorldPos(id);
    graphium.centerOn(p.x, p.y);
    await onExpand(graph.nodeOf(id));
  } catch (e) {
    toast.err(`failed: ${e.message}`);
  }
}

async function onExpand(node) {
  if (!node || node.type !== 'user') return;
  try {
    if (isFullyExpanded(node)) {
      toast.show('all connections already loaded');
      return;
    }
    const isReExpand = (node.expandedCount || 0) > 0;
    toast.show(isReExpand
      ? `refreshing @${node.login} connections...`
      : `fetching @${node.login} connections...`);

    let si = 0;
    let loadedCount = 0;
    const parent = nodeWorldPos(node.id);

    await GitHub.fetchConnections(node.login, async (batch, type) => {
      const now = Date.now();
      let touched = false;
      for (const u of batch) {
        const isNew = !graph.loginMap.has(u.login.toLowerCase());
        const tid = graph.addUser(u, now + si * STAGGER_MS);
        if (isNew) {
          const angle = Math.random() * Math.PI * 2;
          const r = 50 + Math.random() * 60;
          addNodeToGraphium(tid, parent.x + Math.cos(angle) * r, parent.y + Math.sin(angle) * r);
          si++;
        }
        const added = type === 'follower'
          ? graph.addDirectedEdge(tid, node.id)
          : graph.addDirectedEdge(node.id, tid);
        if (added || isNew) { ensureLink(tid, node.id); touched = true; }
      }
      loadedCount += batch.length;
      if (touched) {
        refreshFilter();
        graphium.physics.wake();
        infoModal.refresh();
        toast.show(`@${node.login}: ${loadedCount} connections so far...`);
      }
    });

    graph.markExpanded(node.id, loadedCount);
    saveState();
    const total = (node.followers_count || 0) + (node.following_count || 0);
    const partial = total > 0 && loadedCount < total;
    toast.ok(partial
      ? `+${loadedCount} connections (partial - expand again for more)`
      : `+${loadedCount} connections`);
  } catch (e) {
    toast.err(`expand failed: ${e.message}`);
  }
}

function removeReposForUser(userId) {
  const repos = graph.repoEdges.get(userId);
  if (!repos || repos.size === 0) return;
  for (const rid of Array.from(repos)) {
    graph.removeNode(rid);
    graphium.removeNode(rid);
  }
  refreshFilter();
  saveState();
}

async function showRepos(node) {
  if (!node || node.type !== 'user') return;
  const existing = graph.repoEdges.get(node.id);
  if (existing && existing.size > 0) {
    removeReposForUser(node.id);
    toast.show('repos removed');
    infoModal.refresh();
    return;
  }
  for (const [uid] of graph.repoEdges) {
    if (uid !== node.id) removeReposForUser(uid);
  }
  toast.show(`fetching @${node.login} top repos...`);
  try {
    const repos = await GitHub.fetchTopRepos(node.login, 3);
    if (repos.length === 0) { toast.show('no public repos'); return; }
    const now = Date.now();
    const parent = nodeWorldPos(node.id);
    repos.forEach((repo, i) => {
      const rid = graph.addRepo(repo, node.id, now + i * STAGGER_MS);
      const angle = (i / repos.length) * Math.PI * 2;
      addNodeToGraphium(rid, parent.x + Math.cos(angle) * 90, parent.y + Math.sin(angle) * 90);
      ensureLink(node.id, rid);
    });
    refreshFilter();
    graphium.physics.wake();
    infoModal.refresh();
    saveState();
    toast.ok(`+${repos.length} repos`);
  } catch (e) {
    toast.err(`repos failed: ${e.message}`);
  }
}

function removeNode(node) {
  if (!node) return;
  graph.removeNode(node.id);
  graphium.removeNode(node.id);
  if (selected && selected.id === node.id) selectNode(null);
  refreshFilter();
  saveState();
  toast.show(node.type === 'repo' ? `removed ${node.name}` : `removed @${node.login}`);
}

function clearGraph() {
  graph.clear();
  graphium.clear();
  selected = null;
  personFilterIds = null;
  Storage.clear();
  toast.show('graph cleared');
}

// ---------------------------------------------------------------------------
// UI components
// ---------------------------------------------------------------------------
const infoModal = new InfoModal({
  graph,
  onExpand,
  onShowRepos: showRepos,
  onFetchUser: fetchUserProfile,
});

const contextMenu = new ContextMenu({
  onInfo: (node) => infoModal.show(node),
  onExpand,
  onFocus: (node) => focusNode(node),
  onOpenGithub: (node) => window.open(node.html_url, '_blank', 'noopener'),
  onDelete: (node) => removeNode(node),
});

const filterPanel = new FilterPanel({ onChange: applyFilters });

const topbar = new Topbar({
  onLoad: loadUser,
  onClear: clearGraph,
  onFit: fitToView,
  onReheat: () => regenerateLayout(),
  onFilter: applyPersonFilter,
});

// Confirm overlay (quick-click opens GitHub)
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmText = document.getElementById('confirm-text');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
let confirmCallback = null;

function showConfirm(text, onOk) {
  confirmText.textContent = text;
  confirmCallback = onOk;
  confirmOverlay.classList.add('visible');
}

confirmOk.addEventListener('click', () => {
  confirmOverlay.classList.remove('visible');
  if (confirmCallback) { confirmCallback(); confirmCallback = null; }
});
confirmCancel.addEventListener('click', () => {
  confirmOverlay.classList.remove('visible');
  confirmCallback = null;
});
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.remove('visible');
    confirmCallback = null;
  }
});

// ---------------------------------------------------------------------------
// Pointer interaction via Graphium's built-in event system
// ---------------------------------------------------------------------------
let singleClickTimer = null;

graphium.on('click', (p) => {
  if (p.nodeId === undefined) {
    selectNode(null);
    graphium.unfocus();
    return;
  }
  const node = graph.nodeOf(p.nodeId);
  if (!node) return;
  selectNode(node);
  const url = node.html_url;
  const label = node.type === 'repo' ? node.name : `@${node.login}`;
  if (singleClickTimer) clearTimeout(singleClickTimer);
  singleClickTimer = setTimeout(() => {
    showConfirm(`Open ${label} on GitHub?`, () => {
      window.open(url, '_blank', 'noopener');
    });
  }, 300);
});

graphium.on('dblclick', (p) => {
  if (singleClickTimer) { clearTimeout(singleClickTimer); singleClickTimer = null; }
  if (p.nodeId === undefined) return;
  const node = graph.nodeOf(p.nodeId);
  if (!node) return;
  selectNode(node);
  if (node.type === 'user') showRepos(node);
});

graphium.on('longpress', (p) => {
  if (p.nodeId === undefined) return;
  const node = graph.nodeOf(p.nodeId);
  if (!node) return;
  selectNode(node);
  if (node.type === 'user') onExpand(node);
});

graphium.on('contextmenu', () => { /* handled via DOM listener below */ });

const pickBuffer = new Int32Array(256);

function pickNodeIdAtClient(clientX, clientY) {
  const canvas = graphium.renderer.canvas;
  const rect = canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
  const sy = (clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
  const world = graphium.screenToWorld(sx, sy);
  const index = graphium.physics.hash.pick(
    world.x, world.y,
    graphium.model.x, graphium.model.y,
    graphium.model.visualRadius, pickBuffer,
  );
  return index >= 0 ? graphium.model.nodeIdAt(index) : undefined;
}

document.getElementById('canvas').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const nodeId = pickNodeIdAtClient(e.clientX, e.clientY);
  if (nodeId === undefined) {
    selectNode(null);
    return;
  }
  const node = graph.nodeOf(nodeId);
  if (!node) return;
  selectNode(node);
  contextMenu.show(node, e.clientX, e.clientY);
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === 'Escape') {
    selectNode(null);
    graphium.unfocus();
    contextMenu.hide();
    infoModal.hide();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selected) removeNode(selected);
  } else if (e.key === 'f') {
    fitToView();
  } else if (e.key === 'r') {
    regenerateLayout();
  } else if (e.key === 'e') {
    if (selected && selected.type === 'user') onExpand(selected);
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  if (booted) return;
  booted = true;
  const data = Storage.load();
  if (data && data.nodes && data.nodes.length > 0) {
    graph.fromJSON(data);
    syncAllToGraphium(data.positions);
    refreshFilter();
    toast.show(`restored ${graph.nodes.size} nodes`);
    setTimeout(() => { fitToView(); }, 300);
  } else {
    topbar.setValue(BOOT_USER);
    await loadUser(BOOT_USER);
    setTimeout(() => { fitToView(); }, 800);
  }
}

window.__ghc = { graphium, graph, infoModal };

boot();
const onboarding = new Onboarding();
onboarding.maybeShow();
