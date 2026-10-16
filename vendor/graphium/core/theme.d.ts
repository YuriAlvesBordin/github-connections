/**
 * Resolves user theme options over the built in defaults into the flat
 * packed representation consumed by the model, renderer and label layer.
 */
import type { ThemeOptions, ThemeResolved } from './types.js';
export declare const DEFAULT_THEME: ThemeResolved;
/** Merges user theme values over defaults into a resolved theme object. */
export declare function resolveTheme(theme: ThemeOptions | undefined, previous?: ThemeResolved): ThemeResolved;
//# sourceMappingURL=theme.d.ts.map