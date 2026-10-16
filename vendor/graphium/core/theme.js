/**
 * Resolves user theme options over the built in defaults into the flat
 * packed representation consumed by the model, renderer and label layer.
 */
import { DEFAULT_PALETTE, packRGBA } from './colors.js';
export const DEFAULT_THEME = {
    background: '#0b0e14',
    nodeRadius: 10,
    nodeColor: 0,
    nodeColorPalette: DEFAULT_PALETTE,
    nodeBorderColor: packRGBA('#0b0e14'),
    nodeBorderWidth: 2,
    nodeBorderOpacity: 1,
    nodeOpacity: 1,
    edgeColor: packRGBA('#3d4757'),
    edgeWidth: 1.25,
    edgeOpacity: 0.6,
    edgeCurvature: 0,
    edgeStyle: 'solid',
    edgeArrowEnabled: false,
    edgeArrowSize: 11,
    edgeArrowWidth: 6,
    hoverRingColor: packRGBA('#4f8ef7'),
    hoverRingWidth: 2.5,
    selectedRingColor: packRGBA('#fbbf24'),
    selectedRingWidth: 3,
    fixedRingColor: packRGBA('#94a3b8'),
    fixedRingWidth: 2,
    disabledOpacity: 0.35,
    selectedEdgeColor: packRGBA('#4f8ef7'),
    selectedEdgeWidthMultiplier: 1.8,
    selectedEdgeOpacity: 1,
    labelEnabled: true,
    labelPosition: 'below',
    labelOffset: 8,
    labelSize: 11.5,
    labelColor: '#c9d2e3',
    labelFont: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    labelWeight: 500,
    labelBackground: null,
    labelPadding: [8, 4],
    labelRadius: 6,
};
/** Merges user theme values over defaults into a resolved theme object. */
export function resolveTheme(theme, previous) {
    const resolved = { ...DEFAULT_THEME, ...(previous ?? {}) };
    if (!theme) {
        return resolved;
    }
    if (theme.background !== undefined) {
        resolved.background = theme.background;
    }
    const node = theme.node ?? {};
    if (node.radius !== undefined) {
        resolved.nodeRadius = node.radius;
    }
    if (node.color !== undefined) {
        resolved.nodeColor = packRGBA(node.color);
    }
    if (node.colorPalette !== undefined) {
        resolved.nodeColorPalette = node.colorPalette.map(color => packRGBA(color));
    }
    if (node.borderColor !== undefined) {
        resolved.nodeBorderColor = packRGBA(node.borderColor);
    }
    if (node.borderWidth !== undefined) {
        resolved.nodeBorderWidth = node.borderWidth;
    }
    if (node.borderOpacity !== undefined) {
        resolved.nodeBorderOpacity = node.borderOpacity;
    }
    if (node.opacity !== undefined) {
        resolved.nodeOpacity = node.opacity;
    }
    const edge = theme.edge ?? {};
    if (edge.color !== undefined) {
        resolved.edgeColor = packRGBA(edge.color);
    }
    if (edge.width !== undefined) {
        resolved.edgeWidth = edge.width;
    }
    if (edge.opacity !== undefined) {
        resolved.edgeOpacity = edge.opacity;
    }
    if (edge.curvature !== undefined) {
        resolved.edgeCurvature = edge.curvature;
    }
    if (edge.style !== undefined) {
        resolved.edgeStyle = edge.style;
    }
    if (edge.arrowEnabled !== undefined) {
        resolved.edgeArrowEnabled = edge.arrowEnabled;
    }
    if (edge.arrowSize !== undefined) {
        resolved.edgeArrowSize = edge.arrowSize;
    }
    if (edge.arrowWidth !== undefined) {
        resolved.edgeArrowWidth = edge.arrowWidth;
    }
    const hover = theme.hoverRing ?? {};
    if (hover.color !== undefined) {
        resolved.hoverRingColor = packRGBA(hover.color);
    }
    if (hover.width !== undefined) {
        resolved.hoverRingWidth = hover.width;
    }
    const selected = theme.selectedRing ?? {};
    if (selected.color !== undefined) {
        resolved.selectedRingColor = packRGBA(selected.color);
    }
    if (selected.width !== undefined) {
        resolved.selectedRingWidth = selected.width;
    }
    const fixed = theme.fixedRing ?? {};
    if (fixed.color !== undefined) {
        resolved.fixedRingColor = packRGBA(fixed.color);
    }
    if (fixed.width !== undefined) {
        resolved.fixedRingWidth = fixed.width;
    }
    if (theme.disabledOpacity !== undefined) {
        resolved.disabledOpacity = theme.disabledOpacity;
    }
    const selectedEdge = theme.selectedEdge ?? {};
    if (selectedEdge.color !== undefined) {
        resolved.selectedEdgeColor = packRGBA(selectedEdge.color);
    }
    if (selectedEdge.widthMultiplier !== undefined) {
        resolved.selectedEdgeWidthMultiplier = selectedEdge.widthMultiplier;
    }
    if (selectedEdge.opacity !== undefined) {
        resolved.selectedEdgeOpacity = selectedEdge.opacity;
    }
    const label = theme.label ?? {};
    if (label.enabled !== undefined) {
        resolved.labelEnabled = label.enabled;
    }
    if (label.position !== undefined) {
        resolved.labelPosition = label.position;
    }
    if (label.offset !== undefined) {
        resolved.labelOffset = label.offset;
    }
    if (label.size !== undefined) {
        resolved.labelSize = label.size;
    }
    if (label.color !== undefined) {
        resolved.labelColor = label.color;
    }
    if (label.font !== undefined) {
        resolved.labelFont = label.font;
    }
    if (label.weight !== undefined) {
        resolved.labelWeight = label.weight;
    }
    if (label.background !== undefined) {
        resolved.labelBackground = label.background;
    }
    if (label.padding !== undefined) {
        resolved.labelPadding = label.padding;
    }
    if (label.radius !== undefined) {
        resolved.labelRadius = label.radius;
    }
    return resolved;
}
//# sourceMappingURL=theme.js.map