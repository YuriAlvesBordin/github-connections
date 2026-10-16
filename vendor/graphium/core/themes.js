/**
 * Provides ready made themes as plain option objects. Users can apply them
 * with one call and still override any individual value afterwards.
 */
export const BUILT_IN_THEMES = {
    midnight: {
        background: '#0b0e14',
        node: {
            radius: 10,
            borderColor: '#0b0e14',
            borderWidth: 2,
        },
        edge: {
            color: '#3d4757',
            width: 1.25,
            opacity: 0.6,
            arrowEnabled: false,
        },
        hoverRing: { color: '#4f8ef7', width: 2.5 },
        selectedRing: { color: '#fbbf24', width: 3 },
        fixedRing: { color: '#94a3b8', width: 2 },
        selectedEdge: { color: '#4f8ef7' },
        label: {
            color: '#c9d2e3',
            size: 11.5,
            weight: 500,
        },
    },
    light: {
        background: '#f6f7fb',
        node: {
            radius: 10,
            borderColor: '#f6f7fb',
            borderWidth: 2,
        },
        edge: {
            color: '#9aa3b5',
            width: 1.25,
            opacity: 0.65,
            arrowEnabled: false,
        },
        hoverRing: { color: '#2563eb', width: 2.5 },
        selectedRing: { color: '#d97706', width: 3 },
        fixedRing: { color: '#64748b', width: 2 },
        selectedEdge: { color: '#2563eb' },
        label: {
            color: '#334155',
            size: 11.5,
            weight: 500,
        },
    },
    slate: {
        background: '#1a1d23',
        node: {
            radius: 10,
            borderColor: '#1a1d23',
            borderWidth: 2,
        },
        edge: {
            color: '#48505f',
            width: 1.1,
            opacity: 0.55,
            arrowEnabled: false,
        },
        hoverRing: { color: '#38bdf8', width: 2.5 },
        selectedRing: { color: '#a78bfa', width: 3 },
        fixedRing: { color: '#94a3b8', width: 2 },
        selectedEdge: { color: '#38bdf8' },
        label: {
            color: '#b6bfce',
            size: 11.5,
            weight: 500,
        },
    },
    sunset: {
        background: '#160f1c',
        node: {
            radius: 10,
            borderColor: '#160f1c',
            borderWidth: 2,
        },
        edge: {
            color: '#5c4258',
            width: 1.2,
            opacity: 0.6,
            arrowEnabled: false,
        },
        hoverRing: { color: '#fb7185', width: 2.5 },
        selectedRing: { color: '#fbbf24', width: 3 },
        fixedRing: { color: '#a78bfa', width: 2 },
        selectedEdge: { color: '#fb7185' },
        label: {
            color: '#e3c9d8',
            size: 11.5,
            weight: 500,
        },
    },
};
/** Returns the names of every built in theme for user interfaces. */
export function themeNames() {
    return ['midnight', 'light', 'slate', 'sunset'];
}
//# sourceMappingURL=themes.js.map