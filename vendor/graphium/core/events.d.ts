/**
 * Implements a minimal typed event emitter used across the library. Handlers
 * receive one payload object and may be removed through the returned
 * unsubscribe function or through the emitter API.
 */
export type EventListener<T = unknown> = (payload: T) => void;
export type Unsubscribe = () => void;
export declare class Emitter {
    private handlers;
    /** Registers a listener for an event type and returns an unsubscribe handle. */
    on<T>(type: string, listener: EventListener<T>): Unsubscribe;
    /** Registers a listener that fires once and then removes itself. */
    once<T>(type: string, listener: EventListener<T>): Unsubscribe;
    /** Removes a specific listener or every listener of a type. */
    off<T>(type: string, listener?: EventListener<T>): this;
    /** Invokes every listener registered for the given event type. */
    emit<T>(type: string, payload: T): this;
    /** Removes all registered listeners and resets the emitter. */
    clear(): void;
}
//# sourceMappingURL=events.d.ts.map