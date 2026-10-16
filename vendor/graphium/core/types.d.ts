/**
 * Defines every public contract used by the Graphium public API, the physics
 * engine and the renderer. Keeping all option shapes in one module makes the
 * library surface searchable and refactors predictable.
 */
export type NodeId = string | number;
export type LinkId = string | number;
export type NodeStateName = 'normal' | 'hover' | 'selected' | 'dragging' | 'fixed' | 'disabled';
export type LinkStyleName = 'solid' | 'dashed';
export type ColorInput = string | number | [number, number, number] | [number, number, number, number];
export interface NodeOptions {
    id?: NodeId;
    x?: number;
    y?: number;
    label?: string | null;
    color?: ColorInput;
    borderColor?: ColorInput;
    borderWidth?: number;
    borderOpacity?: number;
    opacity?: number;
    radius?: number;
    visualRadius?: number;
    mass?: number;
    image?: string | null;
    imageMode?: 'cover' | 'contain';
    fixed?: boolean;
    state?: NodeStateName;
    disabled?: boolean;
    hidden?: boolean;
    data?: Record<string, unknown>;
}
export interface LinkOptions {
    id?: LinkId;
    source?: NodeId;
    target?: NodeId;
    color?: ColorInput;
    width?: number;
    opacity?: number;
    curvature?: number;
    style?: LinkStyleName;
    dashPattern?: [number, number];
    dashOffset?: number;
    dashWorldScale?: boolean;
    arrow?: boolean;
    arrowSize?: number;
    arrowWidth?: number;
    strength?: number;
    restLength?: number;
    hidden?: boolean;
    data?: Record<string, unknown>;
}
export interface PhysicsOptions {
    preset?: PhysicsPresetName;
    repulsion?: number;
    repulsionRadius?: number;
    degreeFactor?: number;
    degreeExponent?: number;
    springStrength?: number;
    gravity?: number;
    damping?: number;
    maxSpeed?: number;
    collisionStrength?: number;
    positionIterations?: number;
    temperature?: number;
    cooling?: number;
    minTemperature?: number;
    sleepEnergy?: number;
    sleepFrames?: number;
    maxNeighbors?: number;
    edgeSeparation?: number;
    dragSmooth?: number;
    throwFactor?: number;
}
export type PhysicsPresetName = 'silk' | 'bouncy' | 'crystal' | 'liquid';
export interface ThemeOptions {
    background?: string;
    node?: {
        radius?: number;
        color?: ColorInput;
        colorPalette?: ColorInput[];
        borderColor?: ColorInput;
        borderWidth?: number;
        borderOpacity?: number;
        opacity?: number;
    };
    edge?: {
        color?: ColorInput;
        width?: number;
        opacity?: number;
        curvature?: number;
        style?: LinkStyleName;
        arrowEnabled?: boolean;
        arrowSize?: number;
        arrowWidth?: number;
    };
    hoverRing?: {
        color?: ColorInput;
        width?: number;
    };
    selectedRing?: {
        color?: ColorInput;
        width?: number;
    };
    fixedRing?: {
        color?: ColorInput;
        width?: number;
    };
    disabledOpacity?: number;
    selectedEdge?: {
        color?: ColorInput;
        widthMultiplier?: number;
        opacity?: number;
    };
    label?: {
        enabled?: boolean;
        position?: 'above' | 'below' | 'center';
        offset?: number;
        size?: number;
        color?: string;
        font?: string;
        weight?: number | string;
        background?: string | null;
        padding?: [number, number];
        radius?: number;
    };
}
export interface InteractionOptions {
    enabled?: boolean;
    wheelZoomSpeed?: number;
    dragThreshold?: number;
    longPressMs?: number;
    linkHitRadius?: number;
    hoverEnabled?: boolean;
    panEnabled?: boolean;
    zoomEnabled?: boolean;
    dragEnabled?: boolean;
}
export interface RendererOptions {
    clearColor?: string;
    antialias?: boolean;
    maxPixelRatio?: number;
    fadeZoom?: number;
}
export interface GraphiumOptions {
    canvas?: HTMLCanvasElement | null;
    container?: HTMLElement | null;
    autoStart?: boolean;
    autoResize?: boolean;
    autoFit?: boolean;
    nodeCapacity?: number;
    linkCapacity?: number;
    physics?: PhysicsOptions;
    theme?: ThemeOptions;
    interaction?: boolean | InteractionOptions;
    renderer?: RendererOptions;
    camera?: {
        minZoom?: number;
        maxZoom?: number;
        x?: number;
        y?: number;
        zoom?: number;
    };
}
export interface GraphData {
    nodes?: Array<NodeOptions & {
        id: NodeId;
    }>;
    links?: Array<LinkOptions & {
        source: NodeId;
        target: NodeId;
    }>;
}
export interface NodeSnapshot {
    id: NodeId;
    index: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    visualRadius: number;
    mass: number;
    degree: number;
    color: number;
    borderColor: number;
    borderWidth: number;
    opacity: number;
    image: string | null;
    label: string | null;
    state: NodeStateName;
    fixed: boolean;
    hidden: boolean;
    disabled: boolean;
    data: Record<string, unknown>;
}
export interface LinkSnapshot {
    id: LinkId;
    index: number;
    source: NodeId;
    target: NodeId;
    sourceIndex: number;
    targetIndex: number;
    color: number;
    width: number;
    opacity: number;
    curvature: number;
    style: LinkStyleName;
    dashPattern: [number, number];
    dashOffset: number;
    arrow: boolean | undefined;
    arrowSize: number;
    arrowWidth: number;
    strength: number;
    restLength: number;
    hidden: boolean;
    data: Record<string, unknown>;
}
export interface PointerEventPayload {
    type: string;
    originalEvent: PointerEvent | WheelEvent | MouseEvent;
    nodeIndex: number;
    nodeId?: NodeId;
    linkIndex: number;
    linkId?: LinkId;
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
}
export interface SelectionEventPayload {
    nodes: NodeId[];
    links: LinkId[];
}
export interface PhysicsRuntime {
    energy: number;
    sleeping: boolean;
    temperature: number;
    iteration: number;
}
export interface StatsSnapshot {
    nodeCount: number;
    linkCount: number;
    fps: number;
    frameMs: number;
    physicsMs: number;
    renderMs: number;
    sleeping: boolean;
}
export interface ThemeResolved {
    background: string;
    nodeRadius: number;
    nodeColor: number;
    nodeColorPalette: number[];
    nodeBorderColor: number;
    nodeBorderWidth: number;
    nodeBorderOpacity: number;
    nodeOpacity: number;
    edgeColor: number;
    edgeWidth: number;
    edgeOpacity: number;
    edgeCurvature: number;
    edgeStyle: LinkStyleName;
    edgeArrowEnabled: boolean;
    edgeArrowSize: number;
    edgeArrowWidth: number;
    hoverRingColor: number;
    hoverRingWidth: number;
    selectedRingColor: number;
    selectedRingWidth: number;
    fixedRingColor: number;
    fixedRingWidth: number;
    disabledOpacity: number;
    selectedEdgeColor: number;
    selectedEdgeWidthMultiplier: number;
    selectedEdgeOpacity: number;
    labelEnabled: boolean;
    labelPosition: 'above' | 'below' | 'center';
    labelOffset: number;
    labelSize: number;
    labelColor: string;
    labelFont: string;
    labelWeight: number | string;
    labelBackground: string | null;
    labelPadding: [number, number];
    labelRadius: number;
}
//# sourceMappingURL=types.d.ts.map