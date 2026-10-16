/**
 * Draws the graph with three instanced WebGL2 passes: bezier edges, arrow
 * heads and circular nodes with atlas images. Instance buffers are filled
 * from the model on demand and all state uniforms come from the theme.
 */
import { LINK_HIDDEN, LINK_DIM, LINK_SELECTED, NODE_DISABLED, NODE_DRAGGED, NODE_DIM, NODE_FIXED, NODE_HIDDEN, NODE_SELECTED } from '../core/GraphModel.js';
import { packRGBA, unpackRGBA } from '../core/colors.js';
import { bezierLength, controlPoint } from './geometry.js';
import { ARROW_FRAGMENT, ARROW_VERTEX, EDGE_FRAGMENT, EDGE_VERTEX, NODE_FRAGMENT, NODE_VERTEX } from './shaders.js';
const NODE_FLOATS = 20;
const EDGE_FLOATS = 16;
const ARROW_FLOATS = 9;
const CURVE_SEGMENTS = 18;
function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error('Graphium could not create a shader.');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Graphium shader error: ${log}`);
    }
    return shader;
}
function link(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    if (!program) {
        throw new Error('Graphium could not create a program.');
    }
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Graphium program error: ${log}`);
    }
    return program;
}
export class Renderer {
    constructor(canvas, theme, options = {}) {
        this.atlas = null;
        this.lastRenderMs = 0;
        this.camera = null;
        this.nodeProgram = null;
        this.edgeProgram = null;
        this.arrowProgram = null;
        this.cornerBuffer = null;
        this.curveCornerBuffer = null;
        this.nodeVAO = null;
        this.nodeBuffer = null;
        this.edgeVAO = null;
        this.edgeBuffer = null;
        this.edgeCurveVAO = null;
        this.edgeCurveBuffer = null;
        this.arrowVAO = null;
        this.arrowBuffer = null;
        this.nodeData = new Float32Array(256 * NODE_FLOATS);
        this.edgeData = new Float32Array(512 * EDGE_FLOATS);
        this.edgeCurveData = new Float32Array(256 * EDGE_FLOATS);
        this.arrowData = new Float32Array(256 * ARROW_FLOATS);
        this.nodeDrawCount = 0;
        this.edgeDrawCount = 0;
        this.edgeCurveDrawCount = 0;
        this.arrowDrawCount = 0;
        this.clearColor = [0.043, 0.047, 0.071, 1];
        this.controlScratch = { x: 0, y: 0 };
        this.canvas = canvas;
        this.theme = theme;
        this.fadeZoom = options.fadeZoom ?? 0.18;
        this.maxPixelRatio = options.maxPixelRatio ?? 2;
        const attributes = { antialias: options.antialias ?? true, alpha: true, premultipliedAlpha: true };
        this.gl = canvas.getContext('webgl2', attributes);
        if (this.gl) {
            this.initGL();
        }
    }
    /** Creates shader programs, vertex arrays and static corner buffers. */
    initGL() {
        const gl = this.gl;
        this.nodeProgram = link(gl, NODE_VERTEX, NODE_FRAGMENT);
        this.edgeProgram = link(gl, EDGE_VERTEX, EDGE_FRAGMENT);
        this.arrowProgram = link(gl, ARROW_VERTEX, ARROW_FRAGMENT);
        this.cornerBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
        this.nodeVAO = gl.createVertexArray();
        this.nodeBuffer = gl.createBuffer();
        gl.bindVertexArray(this.nodeVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, NODE_FLOATS * 4, gl.DYNAMIC_DRAW);
        for (let attribute = 1; attribute <= 5; attribute++) {
            gl.enableVertexAttribArray(attribute);
            gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, NODE_FLOATS * 4, (attribute - 1) * 16);
            gl.vertexAttribDivisor(attribute, 1);
        }
        this.edgeVAO = gl.createVertexArray();
        this.edgeBuffer = gl.createBuffer();
        gl.bindVertexArray(this.edgeVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, EDGE_FLOATS * 4, gl.DYNAMIC_DRAW);
        for (let attribute = 1; attribute <= 4; attribute++) {
            gl.enableVertexAttribArray(attribute);
            gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, EDGE_FLOATS * 4, (attribute - 1) * 16);
            gl.vertexAttribDivisor(attribute, 1);
        }
        this.edgeCurveVAO = gl.createVertexArray();
        this.edgeCurveBuffer = gl.createBuffer();
        this.curveCornerBuffer = gl.createBuffer();
        const stripCorners = new Float32Array((CURVE_SEGMENTS + 1) * 2 * 2);
        for (let step = 0; step <= CURVE_SEGMENTS; step++) {
            const t = (step / CURVE_SEGMENTS) * 2 - 1;
            stripCorners[step * 4] = t;
            stripCorners[step * 4 + 1] = -1;
            stripCorners[step * 4 + 2] = t;
            stripCorners[step * 4 + 3] = 1;
        }
        gl.bindVertexArray(this.edgeCurveVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.curveCornerBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, stripCorners, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeCurveBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, EDGE_FLOATS * 4, gl.DYNAMIC_DRAW);
        for (let attribute = 1; attribute <= 4; attribute++) {
            gl.enableVertexAttribArray(attribute);
            gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, EDGE_FLOATS * 4, (attribute - 1) * 16);
            gl.vertexAttribDivisor(attribute, 1);
        }
        this.arrowVAO = gl.createVertexArray();
        this.arrowBuffer = gl.createBuffer();
        gl.bindVertexArray(this.arrowVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.arrowBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, ARROW_FLOATS * 4, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, ARROW_FLOATS * 4, 0);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, ARROW_FLOATS * 4, 4 * 4);
        gl.vertexAttribDivisor(2, 1);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 1, gl.FLOAT, false, ARROW_FLOATS * 4, 8 * 4);
        gl.vertexAttribDivisor(3, 1);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
    /** Registers the camera used for matrices during rendering. */
    setCamera(camera) {
        this.camera = camera;
    }
    /** Attaches the texture atlas used for node image fills. */
    setAtlas(atlas) {
        this.atlas = atlas;
    }
    /** Applies a resolved theme and refreshes the clear color. */
    setTheme(theme) {
        this.theme = theme;
        const packed = packRGBA(theme.background, 0x0b0e14ff);
        this.clearColor = [((packed >>> 24) & 0xff) / 255, ((packed >>> 16) & 0xff) / 255, ((packed >>> 8) & 0xff) / 255, (packed & 0xff) / 255];
    }
    /** Resizes the drawing buffer with a capped device pixel ratio. */
    resize(width, height, pixelRatio) {
        const ratio = Math.max(0.5, Math.min(this.maxPixelRatio, pixelRatio || 1));
        this.canvas.width = Math.max(1, Math.floor(width * ratio));
        this.canvas.height = Math.max(1, Math.floor(height * ratio));
        if (this.camera) {
            this.camera.setViewport(this.canvas.width, this.canvas.height);
        }
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
        return this;
    }
    /** Grows an instance buffer when the graph requires more instances. */
    ensure(data, floats, required) {
        if (required <= data.length / floats) {
            return data;
        }
        let capacity = data.length / floats;
        while (capacity < required) {
            capacity *= 2;
        }
        return new Float32Array(capacity * floats);
    }
    /** Writes one edge instance into the target bucket buffer. */
    writeEdgeInstance(target, write, model, link, zoom) {
        const source = model.source[link];
        const target2 = model.target[link];
        const ax = model.x[source];
        const ay = model.y[source];
        const bx = model.x[target2];
        const by = model.y[target2];
        const dx = bx - ax;
        const dy = by - ay;
        const chord = Math.hypot(dx, dy);
        if (chord < 0.0001) {
            return write;
        }
        const curvature = model.linkCurvature[link];
        controlPoint(ax, ay, bx, by, curvature, this.controlScratch);
        const selected = (model.linkFlags[link] & LINK_SELECTED) !== 0;
        const packed = selected ? this.theme.selectedEdgeColor : model.linkColor[link];
        const dimmed = (model.linkFlags[link] & LINK_DIM) !== 0 ? 0.12 : 1;
        const opacity = model.linkOpacity[link] * (selected ? this.theme.selectedEdgeOpacity : 1) * dimmed;
        const dashed = model.linkStyle[link] === 1 ? 1 : 0;
        const arcLength = dashed && curvature !== 0 ? bezierLength(ax, ay, this.controlScratch.x, this.controlScratch.y, bx, by) : chord;
        const offset = write * EDGE_FLOATS;
        target[offset] = ax;
        target[offset + 1] = ay;
        target[offset + 2] = bx;
        target[offset + 3] = by;
        unpackRGBA(packed, target, offset + 4);
        target[offset + 7] *= opacity;
        target[offset + 8] = model.linkWidth[link] * (selected ? this.theme.selectedEdgeWidthMultiplier : 1);
        target[offset + 9] = model.dashLength[link];
        target[offset + 10] = model.dashGap[link];
        target[offset + 11] = model.dashOffset[link];
        target[offset + 12] = curvature;
        target[offset + 13] = dashed;
        target[offset + 14] = model.dashWorldScale[link];
        target[offset + 15] = arcLength;
        return write + 1;
    }
    /** Fills straight and curved edge buckets with their instance data. */
    fillEdgeData(model, zoom) {
        let visible = 0;
        let curvedCount = 0;
        for (let link = 0; link < model.linkCount; link++) {
            if (model.linkFlags[link] & LINK_HIDDEN) {
                continue;
            }
            visible++;
            if (model.linkCurvature[link] !== 0) {
                curvedCount++;
            }
        }
        const straightCount = visible - curvedCount;
        let edgeData = this.ensure(this.edgeData, EDGE_FLOATS, straightCount);
        let edgeCurveData = this.ensure(this.edgeCurveData, EDGE_FLOATS, curvedCount);
        let straightWrite = 0;
        let curvedWrite = 0;
        for (let link = 0; link < model.linkCount; link++) {
            if (model.linkFlags[link] & LINK_HIDDEN) {
                continue;
            }
            if (model.linkCurvature[link] !== 0) {
                curvedWrite = this.writeEdgeInstance(edgeCurveData, curvedWrite, model, link, zoom);
            }
            else {
                straightWrite = this.writeEdgeInstance(edgeData, straightWrite, model, link, zoom);
            }
        }
        this.edgeData = edgeData;
        this.edgeCurveData = edgeCurveData;
        this.edgeDrawCount = straightWrite;
        this.edgeCurveDrawCount = curvedWrite;
    }
    /** Fills the instanced arrow buffer using curve tangent directions. */
    fillArrowData(model, zoom) {
        const globalEnabled = this.theme.edgeArrowEnabled;
        let capacity = 0;
        for (let link = 0; link < model.linkCount; link++) {
            if (model.linkFlags[link] & LINK_HIDDEN) {
                continue;
            }
            const mode = model.arrowMode[link];
            if (mode === 1 || (mode === 0 && globalEnabled)) {
                capacity++;
            }
        }
        let arrowData = this.ensure(this.arrowData, ARROW_FLOATS, capacity);
        let write = 0;
        for (let link = 0; link < model.linkCount; link++) {
            if (model.linkFlags[link] & LINK_HIDDEN) {
                continue;
            }
            const mode = model.arrowMode[link];
            if (!(mode === 1 || (mode === 0 && globalEnabled))) {
                continue;
            }
            const source = model.source[link];
            const target = model.target[link];
            const ax = model.x[source];
            const ay = model.y[source];
            const bx = model.x[target];
            const by = model.y[target];
            const curvature = model.linkCurvature[link];
            controlPoint(ax, ay, bx, by, curvature, this.controlScratch);
            let dx = bx - this.controlScratch.x;
            let dy = by - this.controlScratch.y;
            const length = Math.hypot(dx, dy);
            const arrowSize = model.arrowSize[link] / zoom;
            if (length < 0.0001 || arrowSize <= 0) {
                continue;
            }
            dx /= length;
            dy /= length;
            const radius = model.visualRadius[target];
            const tipOffset = radius + arrowSize * 0.15;
            const tipX = bx - dx * tipOffset;
            const tipY = by - dy * tipOffset;
            const baseX = tipX - dx * arrowSize;
            const baseY = tipY - dy * arrowSize;
            const selected = (model.linkFlags[link] & LINK_SELECTED) !== 0;
            const packed = selected ? this.theme.selectedEdgeColor : model.linkColor[link];
            const opacity = selected ? this.theme.selectedEdgeOpacity : 1;
            const offset = write * ARROW_FLOATS;
            arrowData[offset] = baseX;
            arrowData[offset + 1] = baseY;
            arrowData[offset + 2] = tipX;
            arrowData[offset + 3] = tipY;
            unpackRGBA(packed, arrowData, offset + 4);
            arrowData[offset + 7] *= opacity;
            arrowData[offset + 8] = Math.max(0.5, (model.arrowWidth[link] / 2 / zoom));
            write++;
        }
        this.arrowData = arrowData;
        this.arrowDrawCount = write;
    }
    /** Fills the instanced node buffer with colors, states and image slots. */
    fillNodeData(model, zoom) {
        let nodeData = this.ensure(this.nodeData, NODE_FLOATS, model.nodeCount);
        const theme = this.theme;
        const maxRing = Math.max(theme.hoverRingWidth, theme.selectedRingWidth, theme.fixedRingWidth);
        const ringFade = zoom < this.fadeZoom ? Math.max(0, zoom / Math.max(0.0001, this.fadeZoom)) : 1;
        const ringExtent = maxRing / Math.max(zoom, 0.0001) + 2 / Math.max(zoom, 0.0001);
        let write = 0;
        for (let index = 0; index < model.nodeCount; index++) {
            if (model.flags[index] & NODE_HIDDEN) {
                continue;
            }
            const state = model.flags[index] & NODE_DISABLED
                ? 5
                : model.flags[index] & NODE_DRAGGED
                    ? 3
                    : model.flags[index] & NODE_SELECTED
                        ? 2
                        : model.flags[index] & NODE_FIXED
                            ? 4
                            : model.state[index];
            const radius = model.visualRadius[index];
            const extent = radius + ringExtent;
            const offset = write * NODE_FLOATS;
            nodeData[offset] = model.x[index];
            nodeData[offset + 1] = model.y[index];
            nodeData[offset + 2] = radius;
            nodeData[offset + 3] = extent;
            unpackRGBA(model.color[index], nodeData, offset + 4);
            nodeData[offset + 7] *= model.nodeOpacity[index] * ((model.flags[index] & NODE_DIM) !== 0 ? 0.15 : 1);
            unpackRGBA(model.borderColor[index], nodeData, offset + 8);
            nodeData[offset + 11] *= theme.nodeBorderOpacity;
            nodeData[offset + 12] = radius;
            nodeData[offset + 13] = model.borderWidth[index];
            nodeData[offset + 14] = state;
            nodeData[offset + 15] = extent;
            const url = model.nodeImage[index];
            let slot = -1;
            let ready = 0;
            if (url && this.atlas) {
                slot = this.atlas.request(url, model.nodeImageMode[index] === 1 ? 'contain' : 'cover');
                ready = this.atlas.isReady(url) ? 1 : 0;
            }
            nodeData[offset + 16] = slot < 0 ? 0 : slot;
            nodeData[offset + 17] = ready;
            nodeData[offset + 18] = 0;
            nodeData[offset + 19] = 0;
            write++;
        }
        this.nodeData = nodeData;
        this.nodeDrawCount = write;
    }
    /** Renders one complete frame of edges, arrows and nodes. */
    render(model) {
        const gl = this.gl;
        const camera = this.camera;
        if (!gl || !camera || !this.edgeProgram || !this.nodeProgram || !this.arrowProgram) {
            return this;
        }
        const started = performance.now();
        const zoom = camera.zoom;
        if (this.atlas) {
            this.atlas.update();
        }
        this.fillEdgeData(model, zoom);
        this.fillArrowData(model, zoom);
        this.fillNodeData(model, zoom);
        gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.edgeProgram);
        gl.uniformMatrix3fv(gl.getUniformLocation(this.edgeProgram, 'uCamera'), false, camera.matrix);
        gl.uniform1f(gl.getUniformLocation(this.edgeProgram, 'uZoom'), zoom);
        if (this.edgeDrawCount > 0) {
            gl.bindVertexArray(this.edgeVAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.edgeData.subarray(0, this.edgeDrawCount * EDGE_FLOATS), gl.DYNAMIC_DRAW);
            gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this.edgeDrawCount);
        }
        if (this.edgeCurveDrawCount > 0) {
            gl.bindVertexArray(this.edgeCurveVAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeCurveBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.edgeCurveData.subarray(0, this.edgeCurveDrawCount * EDGE_FLOATS), gl.DYNAMIC_DRAW);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (CURVE_SEGMENTS + 1) * 2, this.edgeCurveDrawCount);
        }
        if (this.arrowDrawCount > 0) {
            gl.useProgram(this.arrowProgram);
            gl.uniformMatrix3fv(gl.getUniformLocation(this.arrowProgram, 'uCamera'), false, camera.matrix);
            gl.bindVertexArray(this.arrowVAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.arrowBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.arrowData.subarray(0, this.arrowDrawCount * ARROW_FLOATS), gl.DYNAMIC_DRAW);
            gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this.arrowDrawCount);
        }
        gl.useProgram(this.nodeProgram);
        const theme = this.theme;
        const ringFade = zoom < this.fadeZoom ? Math.max(0, zoom / Math.max(0.0001, this.fadeZoom)) : 1;
        gl.uniformMatrix3fv(gl.getUniformLocation(this.nodeProgram, 'uCamera'), false, camera.matrix);
        gl.uniform1f(gl.getUniformLocation(this.nodeProgram, 'uZoom'), zoom);
        gl.uniform4fv(gl.getUniformLocation(this.nodeProgram, 'uHoverRing'), unpackedColor(theme.hoverRingColor));
        gl.uniform4fv(gl.getUniformLocation(this.nodeProgram, 'uSelectedRing'), unpackedColor(theme.selectedRingColor));
        gl.uniform4fv(gl.getUniformLocation(this.nodeProgram, 'uFixedRing'), unpackedColor(theme.fixedRingColor));
        gl.uniform1f(gl.getUniformLocation(this.nodeProgram, 'uHoverRingWidth'), theme.hoverRingWidth * ringFade);
        gl.uniform1f(gl.getUniformLocation(this.nodeProgram, 'uSelectedRingWidth'), theme.selectedRingWidth * ringFade);
        gl.uniform1f(gl.getUniformLocation(this.nodeProgram, 'uFixedRingWidth'), theme.fixedRingWidth * ringFade);
        gl.uniform1f(gl.getUniformLocation(this.nodeProgram, 'uDisabledOpacity'), theme.disabledOpacity);
        if (this.atlas) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.atlas.getTexture());
            gl.uniform1i(gl.getUniformLocation(this.nodeProgram, 'uAtlas'), 0);
        }
        gl.bindVertexArray(this.nodeVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.nodeData.subarray(0, this.nodeDrawCount * NODE_FLOATS), gl.DYNAMIC_DRAW);
        gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this.nodeDrawCount);
        gl.bindVertexArray(null);
        if (this.atlas) {
            this.atlas.sweep();
        }
        this.lastRenderMs = performance.now() - started;
        return this;
    }
    /** Releases every GL resource owned by the renderer. */
    destroy() {
        const gl = this.gl;
        if (!gl) {
            return;
        }
        if (this.nodeProgram) {
            gl.deleteProgram(this.nodeProgram);
        }
        if (this.edgeProgram) {
            gl.deleteProgram(this.edgeProgram);
        }
        if (this.arrowProgram) {
            gl.deleteProgram(this.arrowProgram);
        }
        if (this.nodeBuffer) {
            gl.deleteBuffer(this.nodeBuffer);
        }
        if (this.edgeBuffer) {
            gl.deleteBuffer(this.edgeBuffer);
        }
        if (this.arrowBuffer) {
            gl.deleteBuffer(this.arrowBuffer);
        }
        if (this.cornerBuffer) {
            gl.deleteBuffer(this.cornerBuffer);
        }
        if (this.nodeVAO) {
            gl.deleteVertexArray(this.nodeVAO);
        }
        if (this.edgeVAO) {
            gl.deleteVertexArray(this.edgeVAO);
        }
        if (this.edgeCurveVAO) {
            gl.deleteVertexArray(this.edgeCurveVAO);
        }
        if (this.edgeCurveBuffer) {
            gl.deleteBuffer(this.edgeCurveBuffer);
        }
        if (this.curveCornerBuffer) {
            gl.deleteBuffer(this.curveCornerBuffer);
        }
        if (this.arrowVAO) {
            gl.deleteVertexArray(this.arrowVAO);
        }
        this.gl = null;
    }
}
/** Converts a packed color into a 4 component float tuple. */
function unpackedColor(packed) {
    const out = new Float32Array(4);
    unpackRGBA(packed, out, 0);
    return out;
}
//# sourceMappingURL=Renderer.js.map