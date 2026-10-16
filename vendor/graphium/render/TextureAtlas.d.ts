/**
 * Manages a GPU texture atlas that packs node images into a fixed grid.
 * Images load asynchronously, are drawn into an offscreen canvas using cover
 * or contain framing, and are uploaded in a single texture update per frame.
 */
export interface AtlasEntry {
    slot: number;
    ready: boolean;
    failed: boolean;
    used: boolean;
    mode: 'cover' | 'contain';
    image: HTMLImageElement | null;
}
export interface AtlasEvent {
    type: 'imageload' | 'imageerror';
    url: string;
    slot: number;
}
export declare class TextureAtlas {
    readonly size: number;
    readonly grid: number;
    readonly cellSize: number;
    readonly maxSlots: number;
    revision: number;
    loadedCount: number;
    private gl;
    private texture;
    private canvas;
    private context;
    private entries;
    private pending;
    private nextSlot;
    onEvent: ((event: AtlasEvent) => void) | null;
    constructor(gl: WebGL2RenderingContext, size?: number, grid?: number);
    /** Returns the GPU texture handle for binding during node rendering. */
    getTexture(): WebGLTexture;
    /** Returns the slot for a URL, requesting the image if it is new. */
    request(url: string, mode?: 'cover' | 'contain'): number;
    /** Paints one entry into its atlas cell respecting the framing mode. */
    private drawEntry;
    /** Uploads the atlas canvas to the GPU when new images arrived. */
    update(): boolean;
    /** Marks all entries unused and drops the ones ignored for a full frame. */
    sweep(): void;
    /** Resolves once every pending image finished loading or failed. */
    loadAll(): Promise<void>;
    /** Reports whether a URL finished loading successfully. */
    isReady(url: string): boolean;
    private uploadedRevision;
}
//# sourceMappingURL=TextureAtlas.d.ts.map