/**
 * Manages a GPU texture atlas that packs node images into a fixed grid.
 * Images load asynchronously, are drawn into an offscreen canvas using cover
 * or contain framing, and are uploaded in a single texture update per frame.
 */
export class TextureAtlas {
    constructor(gl, size = 1024, grid = 8) {
        this.revision = 0;
        this.loadedCount = 0;
        this.entries = new Map();
        this.pending = new Set();
        this.nextSlot = 0;
        this.onEvent = null;
        this.uploadedRevision = -1;
        this.gl = gl;
        this.size = size;
        this.grid = grid;
        this.cellSize = size / grid;
        this.maxSlots = grid * grid;
        if (typeof OffscreenCanvas !== 'undefined') {
            this.canvas = new OffscreenCanvas(size, size);
            this.context = this.canvas.getContext('2d');
        }
        else {
            this.canvas = document.createElement('canvas');
            this.canvas.width = size;
            this.canvas.height = size;
            this.context = this.canvas.getContext('2d');
        }
        this.texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    /** Returns the GPU texture handle for binding during node rendering. */
    getTexture() {
        return this.texture;
    }
    /** Returns the slot for a URL, requesting the image if it is new. */
    request(url, mode = 'cover') {
        const entry = this.entries.get(url);
        if (entry) {
            entry.used = true;
            entry.mode = mode;
            return entry.slot;
        }
        if (this.nextSlot >= this.maxSlots || typeof Image === 'undefined') {
            return -1;
        }
        const record = {
            slot: this.nextSlot++,
            ready: false,
            failed: false,
            used: true,
            mode,
            image: null,
        };
        this.entries.set(url, record);
        this.pending.add(url);
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            if (!this.entries.has(url)) {
                return;
            }
            record.ready = true;
            record.image = image;
            this.pending.delete(url);
            this.drawEntry(record);
            this.loadedCount++;
            if (this.onEvent) {
                this.onEvent({ type: 'imageload', url, slot: record.slot });
            }
        };
        image.onerror = () => {
            record.failed = true;
            this.pending.delete(url);
            if (this.onEvent) {
                this.onEvent({ type: 'imageerror', url, slot: record.slot });
            }
        };
        image.src = url;
        return record.slot;
    }
    /** Paints one entry into its atlas cell respecting the framing mode. */
    drawEntry(record) {
        const context = this.context;
        const image = record.image;
        if (!context || !image) {
            return;
        }
        const cell = this.cellSize;
        const x = (record.slot % this.grid) * cell;
        const y = Math.floor(record.slot / this.grid) * cell;
        const naturalWidth = image.naturalWidth || image.width;
        const naturalHeight = image.naturalHeight || image.height;
        const scale = record.mode === 'contain' ? Math.min(cell / naturalWidth, cell / naturalHeight) : Math.max(cell / naturalWidth, cell / naturalHeight);
        const width = naturalWidth * scale;
        const height = naturalHeight * scale;
        context.clearRect(x, y, cell, cell);
        context.drawImage(image, x + (cell - width) * 0.5, y + (cell - height) * 0.5, width, height);
        this.revision++;
    }
    /** Uploads the atlas canvas to the GPU when new images arrived. */
    update() {
        if (this.revision === this.uploadedRevision) {
            return false;
        }
        this.uploadedRevision = this.revision;
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        if (this.canvas) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
        }
        return true;
    }
    /** Marks all entries unused and drops the ones ignored for a full frame. */
    sweep() {
        for (const [url, entry] of this.entries) {
            if (!entry.used) {
                this.entries.delete(url);
            }
            else {
                entry.used = false;
            }
        }
    }
    /** Resolves once every pending image finished loading or failed. */
    loadAll() {
        if (this.pending.size === 0) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            const check = () => {
                if (this.pending.size === 0) {
                    resolve();
                    return true;
                }
                return false;
            };
            const previous = this.onEvent;
            this.onEvent = event => {
                if (previous) {
                    previous(event);
                }
                check();
            };
        });
    }
    /** Reports whether a URL finished loading successfully. */
    isReady(url) {
        return this.entries.get(url)?.ready ?? false;
    }
}
//# sourceMappingURL=TextureAtlas.js.map