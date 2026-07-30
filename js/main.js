/**
 * main.js — application entry point.
 */

import { CONFIG } from './config.js';
import { graph } from './graph.js';
import { Storage } from './storage.js';
import { GitHub } from './api.js';
import { SimulationClient } from './simulation/SimulationClient.js';
import { Camera } from './render/camera.js';
import { Renderer } from './render/renderer.js';
import { avatarCache } from './render/avatarCache.js';
import { Topbar } from './ui/topbar.js';
import { InfoPanel } from './ui/infoPanel.js';
import { ContextMenu } from './ui/contextMenu.js';
import { FilterPanel } from './ui/filterPanel.js';
import { toast } from './ui/toast.js';
import './ui/rateLimitBar.js';
import { InputController } from './interaction/input.js';

const BOOT_USER = 'yurialvesbordin';
const STAGGER_MS = 60;

const canvas = document.getElementById('canvas');
const camera = new Camera();
const sim = new SimulationClient();
const renderer = new Renderer(canvas, graph, sim, camera);
const infoPanel = new InfoPanel({ graph, onExpand, onShowRepos: showRepos });
const contextMenu = new ContextMenu({
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
  onReheat: () => { sim.reheat(); toast.show('simulation reheated'); },
});

const input = new InputController({
  canvas,
  camera,
  renderer,
  callbacks: {
    onHover: (node) => {
      renderer.setHovered(node);
      updateInfoPanel();
    },
    onDragNode: (node, x, y) => {
      sim.pin(node.id, x, y);
      const rp = renderer.renderPos.get(node.id);
      if (rp) { rp.x = x; rp.y = y; }
    },
    onEndDragNode: (node) => { sim.unpin(node.id); },
    onQuickClick: (node) => {
      const url = node.html_url || (node.type === 'repo' ? `https://github.com/${node.full_name}` : `https://github.com/${node.login}`);
      window.open(url, '_blank', 'noopener');
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
    onReheat: () => { sim.reheat(); },
    onDeleteSelected: () => { if (selected) removeNode(selected); },
    onExpandSelected: () => { if (selected && selected.type === 'user') onExpand(selected); },
  },
});

let selected = null;
let booted = false;

function applyFilters(state) {
  renderer.setFilter(state.mode);
  renderer.setShowArrows(state.showArrows);
  renderer.setShowLabels(state.showLabels);
}

function selectNode(node) {
  selected = node;
  renderer.setSelected(node);
  updateInfoPanel();
  contextMenu.hide();
}

function updateInfoPanel() {
  infoPanel.setNode(renderer.hovered || selected);
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

async function loadUser(login) {
  toast.show(`loading @${login}…`);
  try {
    const user = await GitHub.fetchUser(login);
    clearGraph();
    const id = graph.addUser(user, Date.now());
    sim.init(renderer.W, renderer.H, Array.from(graph.nodes.values()), []);
    Storage.save(graph);
    selectNode(graph.nodeOf(id));
    toast.ok(`loaded @${login}`);
    setTimeout(fitToView, 200);
  } catch (e) {
    toast.err(`failed: ${e.message}`);
  }
}

async function onExpand(node) {
  if (!node || node.type !== 'user') return;
  if (node.expanded) { toast.show('already expanded'); return; }
  toast.show(`fetching @${node.login} connections…`);
  try {
    const { followers, following } = await GitHub.fetchConnections(node.login);
    graph.markExpanded(node.id);
    const now = Date.now();
    let si = 0;
    const newNodeIds = [], newSimEdges = [];
    for (const u of followers) {
      const isNew = !graph.loginMap.has(u.login);
      const tid = graph.addUser(u, now + si * STAGGER_MS);
      if (isNew) { newNodeIds.push(tid); si++; }
      if (graph.addDirectedEdge(tid, node.id)) newSimEdges.push([tid, node.id]);
    }
    for (const u of following) {
      const isNew = !graph.loginMap.has(u.login);
      const tid = graph.addUser(u, now + si * STAGGER_MS);
      if (isNew) { newNodeIds.push(tid); si++; }
      if (graph.addDirectedEdge(node.id, tid)) newSimEdges.push([node.id, tid]);
    }
    sim.add(newNodeIds.map((id) => graph.nodeOf(id)), newSimEdges);
    sim.reheat(0.4);
    infoPanel.refresh();
    Storage.save(graph);
    toast.ok(`+${followers.length + following.length} connections`);
  } catch (e) {
    toast.err(`expand failed: ${e.message}`);
  }
}

async function showRepos(node) {
  if (!node || node.type !== 'user') return;
  const existing = graph.repoEdges.get(node.id);
  if (existing && existing.size > 0) { toast.show('repos already shown'); return; }
  toast.show(`fetching @${node.login} top repos…`);
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
    sim.reheat(0.3);
    infoPanel.refresh();
    Storage.save(graph);
    toast.ok(`+${repos.length} repos`);
  } catch (e) {
    toast.err(`repos failed: ${e.message}`);
  }
}

function removeNode(node) {
  if (!node) return;
  graph.removeNode(node.id);
  sim.remove(node.id);
  renderer.renderPos.delete(node.id);
  if (selected === node) selectNode(null);
  if (renderer.hovered === node) { renderer.setHovered(null); updateInfoPanel(); }
  Storage.save(graph);
  toast.show(node.type === 'repo' ? `removed ${node.name}` : `removed @${node.login}`);
}

function clearGraph() {
  graph.clear(); sim.clear(); renderer.renderPos.clear(); avatarCache.clear();
  selected = null;
  renderer.setSelected(null); renderer.setHovered(null);
  updateInfoPanel(); Storage.clear();
  toast.show('graph cleared');
}

function boot() {
  if (booted) return;
  booted = true;
  const persisted = Storage.load(Object.getPrototypeOf(graph).constructor);
  if (persisted && persisted.nodes.size > 0) {
    graph.fromJSON(persisted.toJSON());
    const allEdges = [];
    for (const [a, b] of graph.pairs()) allEdges.push([a, b]);
    for (const [uid, rid] of graph.repoPairs()) allEdges.push([uid, rid, 80]);
    sim.init(renderer.W, renderer.H, Array.from(graph.nodes.values()), allEdges);
    toast.show(`restored ${graph.nodes.size} nodes`);
    setTimeout(fitToView, 400);
  } else {
    sim.init(renderer.W, renderer.H, [], []);
    topbar.setValue(BOOT_USER);
    loadUser(BOOT_USER);
  }
}

boot();
window.__ghc = { graph, sim, renderer, camera };