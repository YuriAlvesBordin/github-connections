/**
 * Provides color parsing and packing helpers shared by the model, the theme
 * system and the renderer. All colors are normalized into packed RGBA uint32
 * values so TypedArray storage stays allocation free.
 */
import type { ColorInput } from './types.js';
export declare const DEFAULT_COLOR = 1536028671;
/**
 * Converts any supported color input into a packed RGBA uint32 value.
 * Accepts hex strings, rgb() and rgba() strings, common names, packed
 * integers and normalized channel arrays.
 */
export declare function packRGBA(color: ColorInput | null | undefined, fallback?: number): number;
/** Expands a packed RGBA uint32 into normalized float channels for the GPU. */
export declare function unpackRGBA(packed: number, out: Float32Array, offset: number): void;
/** Returns the red channel byte of a packed RGBA value. */
export declare function redOf(packed: number): number;
/** Returns the green channel byte of a packed RGBA value. */
export declare function greenOf(packed: number): number;
/** Returns the blue channel byte of a packed RGBA value. */
export declare function blueOf(packed: number): number;
/** Returns the alpha channel byte of a packed RGBA value. */
export declare function alphaOf(packed: number): number;
/** Produces a packed RGBA color derived deterministically from a string key. */
export declare function deterministicColor(key: string | number, palette?: number[]): number;
export declare const DEFAULT_PALETTE: number[];
//# sourceMappingURL=colors.d.ts.map