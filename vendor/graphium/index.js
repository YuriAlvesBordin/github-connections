/**
 * Public entry point of the Graphium library. Everything a consumer needs is
 * re-exported here while internal modules stay private.
 */
export { Graphium } from './Graphium.js';
export { GraphModel, NODE_FIXED, NODE_SELECTED, NODE_DRAGGED, NODE_HIDDEN, NODE_DISABLED, NODE_DIM, LINK_SELECTED, LINK_HIDDEN, LINK_DIM, STATE_NORMAL, STATE_HOVER, STATE_SELECTED, STATE_DRAGGING, STATE_FIXED, STATE_DISABLED } from './core/GraphModel.js';
export { NodeHandle, LinkHandle } from './core/handles.js';
export { Emitter } from './core/events.js';
export { packRGBA, unpackRGBA, deterministicColor } from './core/colors.js';
export { BUILT_IN_THEMES, themeNames } from './core/themes.js';
export { PhysicsEngine } from './physics/PhysicsEngine.js';
export { PRESETS, presetNames } from './physics/presets.js';
export { SpatialHash } from './physics/SpatialHash.js';
export { Camera } from './render/Camera.js';
export { Renderer } from './render/Renderer.js';
export { TextureAtlas } from './render/TextureAtlas.js';
export { LabelLayer } from './render/LabelLayer.js';
export { PointerController } from './interaction/PointerController.js';
export { controlPoint, bezierPoint, bezierLength, distanceToEdge, distanceToSegment } from './render/geometry.js';
//# sourceMappingURL=index.js.map