# GitHub Connections

An interactive, force-directed graph visualization of GitHub user connections. Explore followers, following, and repository relationships in real-time.

![Showcase](assets/Showcase.gif)

<!-- ADD A SCREENSHOT OF THE MAIN GRAPH VIEW HERE -->
<!-- Example: ![Main Graph View](assets/images/main-graph.png) -->

## Features

### 🔍 **User Exploration**
- Search any GitHub username to load their node
- Nodes display avatar, username, and connection counts
- Click and hold (or right-click → "Expand connections") to fetch followers/following

### 🕸️ **Interactive Graph**
- **Force-directed layout** — nodes repel, edges act as springs
- **Drag nodes** to reposition
- **Scroll to zoom**, drag background to pan
- **Double-click** a user to show their top repositories
- **Right-click** for context menu (info, expand, focus, open on GitHub, delete)

### 🔗 **Connection Types**
- **Mutual** (green) — both users follow each other
- **One-way** (orange) — only one follows the other
- **Repositories** (purple) — user's top repos linked to their node

### 🎯 **Smart Filtering**
- **Connection filter** (topbar button): cycle between All / Mutual only / One-way only
- **Person filter** (type in username input): when typing a username that's already loaded, dims all unrelated nodes — only that person's connections stay visible

<!-- ADD A GIF SHOWING THE PERSON FILTER IN ACTION -->
<!-- Example: ![Person Filter Demo](assets/images/person-filter.gif) -->

### 💾 **Persistence**
- Graph state saved to `localStorage` — survives refresh
- GitHub token support for 5,000 req/hr (vs 60 without)

### 🎮 **Controls**
| Action | Key / Button |
|--------|--------------|
| Load user | Enter in input / Load button |
| Clear graph | Clear button |
| Fit to view | Fit button |
| Regenerate layout | Shuffle button |
| Filter connections | Filter button (cycles modes) |
| Person filter | Type username in input |
| Delete node | Delete key / context menu |
| Expand connections | Long press / context menu |
| Show repos | Double-click user |
| Open on GitHub | Context menu / quick click |

## Quick Start

```bash
# Serve locally (any static server)
python3 -m http.server 8080
# or
npx serve .

# Open http://localhost:8080
```

No build step required — vanilla ES modules.

## Architecture

```
├── index.html          # UI structure
├── css/
│   ├── main.css        # Core styles
│   └── ui.css          # Component styles
├── js/
│   ├── main.js         # App orchestration
│   ├── config.js       # Physics & render constants
│   ├── graph.js        # Graph data structure
│   ├── api.js          # GitHub API client
│   ├── storage.js      # localStorage persistence
│   ├── simulation/
│   │   └── simulationClient.js  # WebWorker bridge
│   ├── physics.worker.js        # Force-directed physics (off-main-thread)
│   ├── render/
│   │   ├── renderer.js          # Canvas rendering loop
│   │   ├── camera.js            # Pan/zoom camera
│   │   └── avatarCache.js       # Avatar image caching
│   └── ui/
│       ├── topbar.js        # Search, buttons
│       ├── filterPanel.js   # Connection type filter
│       ├── infoPanel.js     # Node detail modal
│       ├── contextMenu.js   # Right-click menu
│       ├── tokenModal.js    # GitHub token input
│       ├── toast.js         # Notifications
│       ├── rateLimitBar.js  # API rate limit indicator
│       └── onboarding.js    # 4-step guided tour
└── assets/
    ├── Showcase.gif         # Demo animation
    └── images/              # Favicons, screenshots
```

### Physics (WebWorker)
- Barnes-Hut quadtree for O(n log n) repulsion
- Spring forces for edges with degree-based rest length
- Collision prevention, edge crossing reduction
- LOD slicing for large graphs (>800 nodes)
- Automatic sleep/wake based on velocity

### Rendering
- Canvas 2D, 60fps target
- Device pixel ratio aware (capped at 2x)
- Pop-in animation for new nodes
- Loading spinners during fetch
- Smooth camera lerp

## GitHub Token

Click the **key icon** (topbar) to add a Personal Access Token:
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate new token (classic) — no scopes needed for public data
3. Paste token → Save

Token stored only in browser memory, cleared on tab close.

<!-- ADD A SCREENSHOT OF THE TOKEN MODAL -->
<!-- Example: ![Token Modal](assets/images/token-modal.png) -->

## Onboarding

First-time users see a 4-step guided tour:
1. Load a user
2. Expand connections
3. Explore the graph
4. Filter connections

<!-- ADD A GIF OF THE ONBOARDING FLOW -->
<!-- Example: ![Onboarding](assets/images/onboarding.gif) -->

## Rate Limits

- **Without token**: 60 requests/hour
- **With token**: 5,000 requests/hour

Topbar shows remaining quota with color-coded bar (green → yellow → red).

## Browser Support

- Modern browsers with ES modules, WebWorkers, Canvas 2D
- Tested: Chrome 100+, Firefox 95+, Safari 15+, Edge 100+

## License

MIT — feel free to use, modify, distribute.

---

*Built with vanilla JS, no framework dependencies.*