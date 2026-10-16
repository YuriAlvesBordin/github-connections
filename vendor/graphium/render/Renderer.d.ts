/**
 * Draws the graph with three instanced WebGL2 passes: bezier edges, arrow
 * heads and circular nodes with atlas images. Instance buffers are filled
 * from the model on demand and all state uniforms come from the theme.
 */
import { GraphModel } from '../core/GraphModel.js';
import type { ThemeResolved } from '../core/types.js';
import { Camera } from './Camera.js';
import { TextureAtlas } from './TextureAtlas.js';
export interface RendererOptions {
    antialias?: boolean;
    maxPixelRatio?: number;
    fadeZoom?: number;
}
export declare class Renderer {
    readonly canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext | null;
    theme: ThemeResolved;
    atlas: TextureAtlas | null;
    lastRenderMs: number;
    fadeZoom: number;
    maxPixelRatio: number;
    private camera;
    private nodeProgram;
    private edgeProgram;
    private arrowProgram;
    private cornerBuffer;
    private curveCornerBuffer;
    private nodeVAO;
    private nodeBuffer;
    private edgeVAO;
    private edgeBuffer;
    private edgeCurveVAO;
    private edgeCurveBuffer;
    private arrowVAO;
    private arrowBuffer;
    private nodeData;
    private edgeData;
    private edgeCurveData;
    private arrowData;
    private nodeDrawCount;
    private edgeDrawCount;
    private edgeCurveDrawCount;
    private arrowDrawCount;
    private clearColor;
    private controlScratch;
    constructor(canvas: HTMLCanvasElement, theme: ThemeResolved, options?: RendererOptions);
    /** Creates shader programs, vertex arrays and static corner buffers. */
    private initGL;
    /** Registers the camera used for matrices during rendering. */
    setCamera(camera: Camera): void;
    /** Attaches the texture atlas used for node image fills. */
    setAtlas(atlas: TextureAtlas): void;
    /** Applies a resolved theme and refreshes the clear color. */
    setTheme(theme: ThemeResolved): void;
    /** Resizes the drawing buffer with a capped device pixel ratio. */
    resize(width: number, height: number, pixelRatio: number): this;
    /** Grows an instance buffer when the graph requires more instances. */
    private ensure;
    /** Writes one edge instance into the target bucket buffer. */
    private writeEdgeInstance;
    /** Fills straight and curved edge buckets with their instance data. */
    private fillEdgeData;
    /** Fills the instanced arrow buffer using curve tangent directions. */
    private fillArrowData;
    /** Fills the instanced node buffer with colors, states and image slots. */
    private fillNodeData;
    /** Renders one complete frame of edges, arrows and nodes. */
    render(model: GraphModel): this;
    /** Releases every GL resource owned by the renderer. */
    destroy(): void;
}
//# sourceMappingURL=Renderer.d.ts.map