/**
 * Implements a minimal typed event emitter used across the library. Handlers
 * receive one payload object and may be removed through the returned
 * unsubscribe function or through the emitter API.
 */
export class Emitter {
    constructor() {
        this.handlers = new Map();
    }
    /** Registers a listener for an event type and returns an unsubscribe handle. */
    on(type, listener) {
        const list = this.handlers.get(type);
        if (!list) {
            this.handlers.set(type, [listener]);
        }
        else {
            list.push(listener);
        }
        return () => this.off(type, listener);
    }
    /** Registers a listener that fires once and then removes itself. */
    once(type, listener) {
        const wrapped = payload => {
            unsubscribe();
            listener(payload);
        };
        const unsubscribe = this.on(type, wrapped);
        return unsubscribe;
    }
    /** Removes a specific listener or every listener of a type. */
    off(type, listener) {
        if (!listener) {
            this.handlers.delete(type);
            return this;
        }
        const list = this.handlers.get(type);
        if (list) {
            const index = list.indexOf(listener);
            if (index >= 0) {
                list.splice(index, 1);
            }
            if (list.length === 0) {
                this.handlers.delete(type);
            }
        }
        return this;
    }
    /** Invokes every listener registered for the given event type. */
    emit(type, payload) {
        const list = this.handlers.get(type);
        if (!list) {
            return this;
        }
        for (let index = 0; index < list.length; index++) {
            list[index](payload);
        }
        return this;
    }
    /** Removes all registered listeners and resets the emitter. */
    clear() {
        this.handlers.clear();
    }
}
//# sourceMappingURL=events.js.map