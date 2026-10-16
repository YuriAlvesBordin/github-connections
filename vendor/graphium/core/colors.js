/**
 * Provides color parsing and packing helpers shared by the model, the theme
 * system and the renderer. All colors are normalized into packed RGBA uint32
 * values so TypedArray storage stays allocation free.
 */
const NAMED_COLORS = {
    black: 0x000000ff,
    white: 0xffffffff,
    red: 0xff0000ff,
    green: 0x00ff00ff,
    blue: 0x0000ffff,
    yellow: 0xffff00ff,
    orange: 0xffa500ff,
    purple: 0x8000ffff,
    gray: 0x808080ff,
    grey: 0x808080ff,
    transparent: 0x00000000,
};
export const DEFAULT_COLOR = 0x5b8defff;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const clamp255 = (value) => Math.max(0, Math.min(255, Math.round(value)));
/**
 * Converts any supported color input into a packed RGBA uint32 value.
 * Accepts hex strings, rgb() and rgba() strings, common names, packed
 * integers and normalized channel arrays.
 */
export function packRGBA(color, fallback = DEFAULT_COLOR) {
    if (color === null || color === undefined) {
        return fallback;
    }
    if (typeof color === 'number') {
        return color >>> 0;
    }
    if (Array.isArray(color)) {
        const channels = color;
        const r = clamp01(channels[0] ?? 0) * 255;
        const g = clamp01(channels[1] ?? 0) * 255;
        const b = clamp01(channels[2] ?? 0) * 255;
        const a = clamp01(channels.length > 3 ? channels[3] ?? 1 : 1) * 255;
        return ((clamp255(r) << 24) | (clamp255(g) << 16) | (clamp255(b) << 8) | clamp255(a)) >>> 0;
    }
    const text = String(color).trim().toLowerCase();
    const named = NAMED_COLORS[text];
    if (named !== undefined) {
        return named;
    }
    if (text.startsWith('#')) {
        return parseHex(text) ?? fallback;
    }
    if (text.startsWith('rgb')) {
        return parseRgbFunction(text) ?? fallback;
    }
    return fallback;
}
/** Parses hexadecimal color text of length 3, 4, 6 or 8 into packed RGBA. */
function parseHex(text) {
    const body = text.slice(1);
    if (body.length === 3 || body.length === 4) {
        const expanded = body
            .split('')
            .map(char => char + char)
            .join('');
        return hexToPacked(expanded);
    }
    if (body.length === 6 || body.length === 8) {
        return hexToPacked(body);
    }
    return null;
}
/** Converts a full hexadecimal channel string into packed RGBA bytes. */
function hexToPacked(body) {
    const r = parseInt(body.slice(0, 2), 16);
    const g = parseInt(body.slice(2, 4), 16);
    const b = parseInt(body.slice(4, 6), 16);
    const a = body.length >= 8 ? parseInt(body.slice(6, 8), 16) : 255;
    return (((r || 0) << 24) | ((g || 0) << 16) | ((b || 0) << 8) | (a || 0)) >>> 0;
}
/** Parses an rgb() or rgba() function string into packed RGBA bytes. */
function parseRgbFunction(text) {
    const match = text.match(/rgba?\(([^)]+)\)/);
    if (!match) {
        return null;
    }
    const parts = match[1].split(/[,/\s]+/).filter(part => part.length > 0);
    if (parts.length < 3) {
        return null;
    }
    const parse = (value, scale) => {
        if (value.includes('%')) {
            return clamp255((Number(value.replace('%', '')) / 100) * 255);
        }
        return clamp255(Number(value) * scale);
    };
    const a = parts.length > 3 ? Number(parts[3]) : 1;
    return ((parse(parts[0], 1) << 24) | (parse(parts[1], 1) << 16) | (parse(parts[2], 1) << 8) | clamp255(clamp01(a) * 255)) >>> 0;
}
/** Expands a packed RGBA uint32 into normalized float channels for the GPU. */
export function unpackRGBA(packed, out, offset) {
    const value = packed >>> 0;
    out[offset] = ((value >>> 24) & 0xff) / 255;
    out[offset + 1] = ((value >>> 16) & 0xff) / 255;
    out[offset + 2] = ((value >>> 8) & 0xff) / 255;
    out[offset + 3] = (value & 0xff) / 255;
}
/** Returns the red channel byte of a packed RGBA value. */
export function redOf(packed) {
    return (packed >>> 24) & 0xff;
}
/** Returns the green channel byte of a packed RGBA value. */
export function greenOf(packed) {
    return (packed >>> 16) & 0xff;
}
/** Returns the blue channel byte of a packed RGBA value. */
export function blueOf(packed) {
    return (packed >>> 8) & 0xff;
}
/** Returns the alpha channel byte of a packed RGBA value. */
export function alphaOf(packed) {
    return packed & 0xff;
}
/** Produces a packed RGBA color derived deterministically from a string key. */
export function deterministicColor(key, palette = DEFAULT_PALETTE) {
    const text = String(key);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return palette[(hash >>> 0) % palette.length];
}
export const DEFAULT_PALETTE = [
    0x4f8ef7ff,
    0x2dd4bfff,
    0xa78bfaff,
    0xfb7185ff,
    0xfbbf24ff,
    0x34d399ff,
    0x60a5faff,
    0xf472b6ff,
];
//# sourceMappingURL=colors.js.map