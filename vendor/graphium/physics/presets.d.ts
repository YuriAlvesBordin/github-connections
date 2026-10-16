/**
 * Declares physics presets that translate one word into a full set of engine
 * parameters. Presets only override what they express, so user supplied
 * values always win over preset defaults.
 */
import type { PhysicsOptions, PhysicsPresetName } from '../core/types.js';
export interface PresetDefinition {
    label: string;
    values: PhysicsOptions;
}
export declare const PRESETS: Record<PhysicsPresetName, PresetDefinition>;
/** Returns the preset list in display order for user interfaces. */
export declare function presetNames(): PhysicsPresetName[];
//# sourceMappingURL=presets.d.ts.map