/**
 * Translates pointer and wheel activity into graph gestures. The controller
 * handles node dragging through the physics engine so releases carry
 * momentum, supports pinch zoom, hover picking, click detection and long
 * presses, and emits normalized event payloads.
 */
import { NODE_DRAGGED, NODE_SELECTED, STATE_DRAGGING } from '../core/GraphModel.js';
export class PointerController {
    constructor(element, camera, model, physics, hash, emitter, options = {}) {
        this.enabled = false;
        this.pointers = new Map();
        this.dragNode = -1;
        this.activeLink = -1;
        this.isPanning = false;
        this.downX = 0;
        this.downY = 0;
        this.moved = false;
        this.longPressTimer = 0;
        this.pickBuffer = new Int32Array(256);
        this.world = { x: 0, y: 0 };
        this.lastClickTime = 0;
        this.lastClickButton = -1;
        this.boundDown = (event) => this.onPointerDown(event);
        this.boundMove = (event) => this.onPointerMove(event);
        this.boundUp = (event) => this.onPointerUp(event);
        this.boundWheel = (event) => this.onWheel(event);
        this.boundLeave = () => this.onLeave();
        this.boundContext = (event) => {
            event.preventDefault();
            const { screenX, screenY } = this.updateWorld(event.clientX, event.clientY);
            this.emit('contextmenu', event, -1, -1, screenX, screenY);
        };
        this.pinchDistance = 0;
        this.pinchCenterX = 0;
        this.pinchCenterY = 0;
        this.element = element;
        this.camera = camera;
        this.model = model;
        this.physics = physics;
        this.hash = hash;
        this.emitter = emitter;
        this.options = {
            wheelZoomSpeed: options.wheelZoomSpeed ?? 1.12,
            dragThreshold: options.dragThreshold ?? 4,
            longPressMs: options.longPressMs ?? 550,
            linkHitRadius: options.linkHitRadius ?? 8,
            hoverEnabled: options.hoverEnabled ?? true,
            panEnabled: options.panEnabled ?? true,
            zoomEnabled: options.zoomEnabled ?? true,
            dragEnabled: options.dragEnabled ?? true,
            pickLink: options.pickLink,
        };
        this.enable();
    }
    /** Converts client coordinates into camera space and world space. */
    updateWorld(clientX, clientY) {
        const rect = this.element.getBoundingClientRect();
        const scaleX = this.camera.width / Math.max(1, rect.width);
        const scaleY = this.camera.height / Math.max(1, rect.height);
        const screenX = (clientX - rect.left) * scaleX;
        const screenY = (clientY - rect.top) * scaleY;
        this.camera.screenToWorld(screenX, screenY, this.world);
        return { screenX, screenY };
    }
    /** Finds the topmost node under a world position. */
    pickNode(worldX, worldY) {
        if (this.pickBuffer.length < this.model.nodeCount) {
            this.pickBuffer = new Int32Array(Math.max(256, this.model.nodeCount * 2));
        }
        return this.hash.pick(worldX, worldY, this.model.x, this.model.y, this.model.visualRadius, this.pickBuffer);
    }
    /** Resolves the link under a world position through the host callback. */
    pickLinkAt(worldX, worldY) {
        return this.options.pickLink ? this.options.pickLink(worldX, worldY, this.options.linkHitRadius) : -1;
    }
    /** Emits a normalized payload to the shared event emitter. */
    emit(type, originalEvent, nodeIndex, linkIndex = -1, screenX = 0, screenY = 0) {
        const payload = {
            type,
            originalEvent,
            nodeIndex,
            nodeId: nodeIndex >= 0 ? this.model.nodeIdAt(nodeIndex) : undefined,
            linkIndex,
            linkId: linkIndex >= 0 ? this.model.linkIdAt(linkIndex) : undefined,
            screenX,
            screenY,
            worldX: this.world.x,
            worldY: this.world.y,
        };
        this.emitter.emit(type, payload);
    }
    /** Handles pointer press by picking nodes, links or starting a pan. */
    onPointerDown(event) {
        const position = this.updateWorld(event.clientX, event.clientY);
        this.pointers.set(event.pointerId, { x: position.screenX, y: position.screenY });
        if (this.pointers.size === 1) {
            this.downX = position.screenX;
            this.downY = position.screenY;
            this.moved = false;
            const node = this.pickNode(this.world.x, this.world.y);
            if (node >= 0 && event.button !== 2 && this.options.dragEnabled) {
                this.dragNode = node;
                this.model.flags[node] |= NODE_DRAGGED | NODE_SELECTED;
                this.model.state[node] = STATE_DRAGGING;
                this.physics.beginDrag(node, this.world.x, this.world.y);
                this.emit('pointerdown', event, node, -1, position.screenX, position.screenY);
            }
            else {
                this.dragNode = -1;
                this.activeLink = this.pickLinkAt(this.world.x, this.world.y);
                this.isPanning = this.activeLink < 0 && this.options.panEnabled;
                this.emit('pointerdown', event, -1, this.activeLink, position.screenX, position.screenY);
            }
            clearTimeout(this.longPressTimer);
            this.longPressTimer = window.setTimeout(() => {
                if (!this.moved) {
                    this.emit('longpress', event, this.dragNode, -1, position.screenX, position.screenY);
                }
            }, this.options.longPressMs);
        }
        else if (this.pointers.size === 2) {
            this.isPanning = false;
            if (this.dragNode >= 0) {
                this.releaseDrag();
            }
            clearTimeout(this.longPressTimer);
        }
        if (this.element.setPointerCapture) {
            this.element.setPointerCapture(event.pointerId);
        }
    }
    /** Handles pointer motion for dragging, panning, pinching and hovering. */
    onPointerMove(event) {
        const tracked = this.pointers.get(event.pointerId);
        if (!tracked) {
            if (this.options.hoverEnabled) {
                const position = this.updateWorld(event.clientX, event.clientY);
                this.emit('hover', event, this.pickNode(this.world.x, this.world.y), -1, position.screenX, position.screenY);
            }
            return;
        }
        const position = this.updateWorld(event.clientX, event.clientY);
        const dx = position.screenX - tracked.x;
        const dy = position.screenY - tracked.y;
        tracked.x = position.screenX;
        tracked.y = position.screenY;
        if (Math.hypot(position.screenX - this.downX, position.screenY - this.downY) > this.options.dragThreshold) {
            this.moved = true;
            clearTimeout(this.longPressTimer);
        }
        if (this.pointers.size >= 2) {
            const values = Array.from(this.pointers.values());
            const distance = Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y);
            const centerX = (values[0].x + values[1].x) * 0.5;
            const centerY = (values[0].y + values[1].y) * 0.5;
            if (this.options.zoomEnabled && this.pinchDistance > 0) {
                this.camera.zoomAt(distance / this.pinchDistance, centerX, centerY);
            }
            if (this.options.panEnabled) {
                this.camera.pan(this.pinchCenterX - centerX, this.pinchCenterY - centerY);
            }
            this.pinchDistance = distance;
            this.pinchCenterX = centerX;
            this.pinchCenterY = centerY;
            this.emit('pinch', event, -1, -1, position.screenX, position.screenY);
            return;
        }
        if (this.dragNode >= 0) {
            this.physics.dragTo(this.world.x, this.world.y);
            this.emit('drag', event, this.dragNode, -1, position.screenX, position.screenY);
        }
        else if (this.isPanning) {
            this.camera.pan(-dx, -dy);
            this.emit('pan', event, -1, -1, position.screenX, position.screenY);
        }
        if (this.options.hoverEnabled) {
            const position = this.updateWorld(event.clientX, event.clientY);
            const hovered = this.dragNode >= 0 ? this.dragNode : this.pickNode(this.world.x, this.world.y);
            this.emit('hover', event, hovered, hovered < 0 ? this.pickLinkAt(this.world.x, this.world.y) : -1, position.screenX, position.screenY);
        }
    }
    /** Clears drag flags and lets the physics engine keep the momentum. */
    releaseDrag() {
        const node = this.dragNode;
        this.model.flags[node] &= ~NODE_DRAGGED;
        if (this.model.state[node] === STATE_DRAGGING) {
            this.model.state[node] = 2;
        }
        this.physics.endDrag();
        this.dragNode = -1;
    }
    /** Handles pointer release, click synthesis and double click detection. */
    onPointerUp(event) {
        this.pointers.delete(event.pointerId);
        clearTimeout(this.longPressTimer);
        const position = this.updateWorld(event.clientX, event.clientY);
        if (this.dragNode >= 0) {
            const node = this.dragNode;
            this.releaseDrag();
            this.emit('dragend', event, node, -1, position.screenX, position.screenY);
            if (!this.moved) {
                this.emitClick(event, node, -1, position.screenX, position.screenY);
            }
            this.dragNode = -1;
        }
        else if (this.activeLink >= 0) {
            if (!this.moved) {
                this.emitClick(event, -1, this.activeLink, position.screenX, position.screenY);
                this.emitter.emit('linkclick', { linkIndex: this.activeLink, linkId: this.model.linkIdAt(this.activeLink) });
            }
            this.activeLink = -1;
        }
        else if (this.isPanning) {
            this.isPanning = false;
            if (!this.moved) {
                this.emitClick(event, -1, -1, position.screenX, position.screenY);
            }
        }
        if (this.pointers.size === 0) {
            this.isPanning = false;
        }
        if (this.element.releasePointerCapture) {
            try {
                this.element.releasePointerCapture(event.pointerId);
            }
            catch { }
        }
        this.emit('pointerup', event, -1, -1, position.screenX, position.screenY);
    }
    /** Emits click or dblclick depending on timing of consecutive clicks. */
    emitClick(event, nodeIndex, linkIndex, screenX, screenY) {
        const now = performance.now();
        if (now - this.lastClickTime < 320 && this.lastClickButton === event.button) {
            this.lastClickTime = 0;
            this.emit('dblclick', event, nodeIndex, linkIndex, screenX, screenY);
            return;
        }
        this.lastClickTime = now;
        this.lastClickButton = event.button;
        this.emit('click', event, nodeIndex, linkIndex, screenX, screenY);
    }
    /** Zooms the view around the wheel position. */
    onWheel(event) {
        if (!this.options.zoomEnabled) {
            return;
        }
        event.preventDefault();
        const position = this.updateWorld(event.clientX, event.clientY);
        const factor = Math.pow(this.options.wheelZoomSpeed, -(event.deltaY || 0) / 100);
        this.camera.zoomAt(factor, position.screenX, position.screenY);
        this.emit('zoom', event, -1, -1, position.screenX, position.screenY);
    }
    /** Ends hover tracking when the pointer leaves the canvas. */
    onLeave() {
        this.emit('hover', null, -1, -1, 0, 0);
    }
    /** Attaches all DOM listeners and activates gesture handling. */
    enable() {
        if (this.enabled) {
            return this;
        }
        this.enabled = true;
        this.element.addEventListener('pointerdown', this.boundDown);
        this.element.addEventListener('pointermove', this.boundMove);
        this.element.addEventListener('pointerup', this.boundUp);
        this.element.addEventListener('pointercancel', this.boundUp);
        this.element.addEventListener('pointerleave', this.boundLeave);
        this.element.addEventListener('wheel', this.boundWheel, { passive: false });
        this.element.addEventListener('contextmenu', this.boundContext);
        return this;
    }
    /** Detaches all DOM listeners and stops gesture handling. */
    disable() {
        if (!this.enabled) {
            return this;
        }
        this.enabled = false;
        this.element.removeEventListener('pointerdown', this.boundDown);
        this.element.removeEventListener('pointermove', this.boundMove);
        this.element.removeEventListener('pointerup', this.boundUp);
        this.element.removeEventListener('pointercancel', this.boundUp);
        this.element.removeEventListener('pointerleave', this.boundLeave);
        this.element.removeEventListener('wheel', this.boundWheel);
        this.element.removeEventListener('contextmenu', this.boundContext);
        clearTimeout(this.longPressTimer);
        return this;
    }
    /** Fully releases controller resources. */
    destroy() {
        this.disable();
        this.pointers.clear();
    }
}
//# sourceMappingURL=PointerController.js.map