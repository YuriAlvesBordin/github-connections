import { CONFIG } from './config.js';
import { graph } from './graph.js';
import { Storage } from './storage.js';
import { GitHub } from './api.js';
import { SimulationClient } from './simulation/simulationClient.js';
import { Camera } from './render/camera.js';
import { Renderer } from './render/renderer.js';
import { avatarCache } from './render/avatarCache.js';
import { Topbar } from './ui/topbar.js';
import { InfoModal } from './ui/infoPanel.js';
import { ContextMenu } from './ui/contextMenu.js';
import { FilterPanel } from './ui/filterPanel.js';
import { toast } from './ui/toast.js';
import './ui/rateLimitBar.js';
import { Onboarding } from './ui/onboarding.js';
import { InputController } from './interaction/input.js';

const BOOT_USER = 'yurialvesbordin';
const STAGGER_MS = 60;

const canvas = document.getElementById('canvas');
const camera = new Camera();
const sim = new SimulationClient();
const renderer = new Renderer(canvas, graph, sim, camera);
const infoModal = new InfoModal({ graph, onExpand, onShowRepos: showRepos, onFetchUser: fetchUserProfile });
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
});

const input = new InputController({
  canvas,
  camera,
  renderer,
  callbacks: {
    onHover: (node) => { renderer.setHovered(node); },
    onDragNode: (node, x, y) => {
      sim.pin(node.id, x, y);
      const rp = renderer.renderPos.get(node.id);
      if (rp) { rp.x = x; rp.y = y; }
    },
    onEndDragNode: (node) => { sim.unpin(node.id); },
    onQuickClick: (node) => {
      const url = node.html_url || (node.type === 'repo' ? `https://github.com/${node.full_name}` : `https://github.com/${node.login}`);
      const label = node.type === 'repo' ? node.name : `@${node.login}`;
      showConfirm(`Open ${label} on GitHub?`, () => {
        window.open(url, '_blank', 'noopener');
      });
    },
    onLongPress: (node) => {
      if (node.type === 'user') { selectNode(node); onExpand(node); }
      else { selectNode(node); }
    },
    onDoubleClick: (node) => {
      if (node.type === 'user') { selectNode(node); showRepos(node); }
    },
    onClickEmpty: () => { selectNode(null); },
    onRightClick: (node, x, y) => { selectNode(node); contextMenu.show(node, x, y); },
    onEscape: () => { selectNode(null); contextMenu.hide(); },
    onFit: fitToView,
    onReheat: () => { regenerateLayout(); },
    onDeleteSelected: () => { if (selected) removeNode(selected); },
    onExpandSelected: () => { if (selected && selected.type === 'user') onExpand(selected); },
  },
});

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

let selected = null;
let booted = false;

function applyFilters(state) {
  renderer.setFilter(state.mode);
}

function refreshFilter() {
  renderer.setFilter(filterPanel.getState().mode);
}

function selectNode(node) {
  selected = node;
  renderer.setSelected(node);
  contextMenu.hide();
}

function focusNode(node) {
  selectNode(node);
  const p = renderer.renderPos.get(node.id);
  if (p) camera.centerOn(p.x, p.y, renderer.W, renderer.H);
}

function fitToView() {
  const bbox = renderer.bbox();
  if (bbox) camera.fitTo(bbox, renderer.W, renderer.H);
  else toast.show('nothing to fit');
}

function regenerateLayout() {
  const allNodes = Array.from(graph.nodes.values());
  if (allNodes.length === 0) { toast.show('nothing to regenerate'); return; }
  const allEdges = [];
  for (const [a, b] of graph.pairs()) allEdges.push([a, b]);
  for (const [uid, rid] of graph.repoPairs()) allEdges.push([uid, rid, 80]);
  sim.clear();
  const now = Date.now();
  allNodes.forEach((n, i) => { n.addedAt = now + i * 100; });
  sim.init(renderer.W, renderer.H, allNodes, allEdges);
  refreshFilter();
  sim.reheat(1.0);
  toast.show('regenerating layout');
}

async function fetchUserProfile(node) {
  try {
    const user = await GitHub.fetchUser(node.login);
    graph.addUser(user, node.addedAt);
    Storage.save(graph);
  } catch (e) {}
}

async function loadUser(login) {
  const existingId = graph.idOf(login);
  if (existingId !== undefined) {
    selectNode(graph.nodeOf(existingId));
    const p = renderer.renderPos.get(existingId);
    if (p) camera.centerOnSmooth(p.x, p.y);
    toast.show(`@${login} already loaded`);
    return;
  }
  toast.show(`loading @${login}...`);
  try {
    const user = await GitHub.fetchUser(login);
    const now = Date.now();
    const id = graph.addUser(user, now);
    sim.add([graph.nodeOf(id)], []);
    refreshFilter();
    selectNode(graph.nodeOf(id));
    Storage.save(graph);
    toast.ok(`loaded @${login}`);
    const p = renderer.renderPos.get(id);
    if (p) camera.centerOn(p.x, p.y, renderer.W, renderer.H);
    await onExpand(graph.nodeOf(id));
  } catch (e) {
    toast.err(`failed: ${e.message}`);
  }
}

function isFullyExpanded(node) {
  if (!node.expandedCount) return false;
  const total = (node.followers_count || 0) + (node.following_count || 0);
  if (total === 0) return true;
  return node.expandedCount >= total;
}

async function onExpand(node) {
  if (!node || node.type !== 'user') return;
  try {
    if (isFullyExpanded(node)) {
      toast.show('all connections already loaded');
      return;
    }
    renderer.setLoading(node.id, true);
    const isReExpand = (node.expandedCount || 0) > 0;
    toast.show(isReExpand
      ? `refreshing @${node.login} connections...`
      : `fetching @${node.login} connections...`);

    let si = 0;
    let loadedCount = 0;

    await GitHub.fetchConnections(node.login, async (batch, type) => {
      const now = Date.now();
      const newNodeIds = [], newSimEdges = [];
      for (const u of batch) {
        const isNew = !graph.loginMap.has(u.login.toLowerCase());
        const tid = graph.addUser(u, now + si * STAGGER_MS);
        if (isNew) { newNodeIds.push(tid); si++; }
        if (type === 'follower') {
          if (graph.addDirectedEdge(tid, node.id)) newSimEdges.push([tid, node.id]);
        } else {
          if (graph.addDirectedEdge(node.id, tid)) newSimEdges.push([node.id, tid]);
        }
      }
      loadedCount += batch.length;
      if (newNodeIds.length > 0 || newSimEdges.length > 0) {
        sim.add(newNodeIds.map((id) => graph.nodeOf(id)), newSimEdges);
        refreshFilter();
        sim.reheat(0.3);
        infoModal.refresh();
        toast.show(`@${node.login}: ${loadedCount} connections so far...`);
      }
    });

    graph.markExpanded(node.id, loadedCount);
    Storage.save(graph);
    const total = (node.followers_count || 0) + (node.following_count || 0);
    const partial = total > 0 && loadedCount < total;
    toast.ok(partial
      ? `+${loadedCount} connections (partial - expand again for more)`
      : `+${loadedCount} connections`);
  } catch (e) {
    toast.err(`expand failed: ${e.message}`);
  } finally {
    renderer.setLoading(node.id, false);
  }
}

function removeReposForUser(userId) {
  const repos = graph.repoEdges.get(userId);
  if (!repos || repos.size === 0) return;
  for (const rid of Array.from(repos)) {
    graph.removeNode(rid);
    sim.remove(rid);
    renderer.renderPos.delete(rid);
  }
  refreshFilter();
  Storage.save(graph);
}

async function showRepos(node) {
  if (!node || node.type !== 'user') return;
  const existing = graph.repoEdges.get(node.id);
  if (existing && existing.size > 0) {
    removeReposForUser(node.id);
    toast.show('repos removed');
    return;
  }
  for (const [uid] of graph.repoEdges) {
    if (uid !== node.id) removeReposForUser(uid);
  }
  renderer.setLoading(node.id, true);
  toast.show(`fetching @${node.login} top repos...`);
  try {
    const repos = await GitHub.fetchTopRepos(node.login, 3);
    if (repos.length === 0) { toast.show('no public repos'); return; }
    const now = Date.now();
    const newNodeIds = [], newSimEdges = [];
    repos.forEach((repo, i) => {
      const rid = graph.addRepo(repo, node.id, now + i * STAGGER_MS);
      if (rid != null) { newNodeIds.push(rid); newSimEdges.push([node.id, rid, 80]); }
    });
    sim.add(newNodeIds.map((id) => graph.nodeOf(id)), newSimEdges);
    refreshFilter();
    sim.reheat(0.3);
    infoModal.refresh();
    Storage.save(graph);
    toast.ok(`+${repos.length} repos`);
  } catch (e) {
    toast.err(`repos failed: ${e.message}`);
  } finally {
    renderer.setLoading(node.id, false);
  }
}

function removeNode(node) {
  if (!node) return;
  graph.removeNode(node.id);
  sim.remove(node.id);
  renderer.renderPos.delete(node.id);
  if (selected === node) selectNode(null);
  refreshFilter();
  Storage.save(graph);
  toast.show(node.type === 'repo' ? `removed ${node.name}` : `removed @${node.login}`);
}

function clearGraph() {
  graph.clear(); sim.clear(); renderer.renderPos.clear(); avatarCache.clear();
  selected = null;
  renderer.setSelected(null); renderer.setHovered(null);
  Storage.clear();
  toast.show('graph cleared');
}

async function boot() {
  if (booted) return;
  booted = true;
  const data = Storage.load();
  if (data && data.nodes && data.nodes.length > 0) {
    graph.fromJSON(data);
    const allEdges = [];
    for (const [a, b] of graph.pairs()) allEdges.push([a, b]);
    for (const [uid, rid] of graph.repoPairs()) allEdges.push([uid, rid, 80]);
    sim.init(renderer.W, renderer.H, Array.from(graph.nodes.values()), allEdges);
    refreshFilter();
    toast.show(`restored ${graph.nodes.size} nodes`);
    const unsub = sim.on((evt) => {
      if (evt.type === 'tick') {
        unsub();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fitToView();
          });
        });
      }
    });
  } else {
    sim.init(renderer.W, renderer.H, [], []);
    topbar.setValue(BOOT_USER);
    await loadUser(BOOT_USER);
    setTimeout(() => { fitToView(); }, 500);
  }
}

boot();
const onboarding = new Onboarding();
onboarding.maybeShow();
window.__ghc = { graph, sim, renderer, camera, infoModal, onboarding };
