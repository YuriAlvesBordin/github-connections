export function createInteractionHandlers({ onTap, onLongPress, onDoubleTap }) {
    let pressTimer = null;
    let lastTapTime = 0;
    let startX = 0;
    let startY = 0;
    let activePointerId = null;
    let moved = false;

    function clearPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }

    function onPointerDown(event) {
        activePointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        moved = false;

        clearPressTimer();
        pressTimer = setTimeout(() => {
            if (!moved) onLongPress?.(event);
        }, 450);
    }

    function onPointerMove(event) {
        if (activePointerId !== event.pointerId) return;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (dx * dx + dy * dy > 16) {
            moved = true;
            clearPressTimer();
        }
    }

    function onPointerUp(event) {
        if (activePointerId !== event.pointerId) return;

        const now = Date.now();
        clearPressTimer();
        activePointerId = null;

        if (moved) return;

        if (now - lastTapTime < 300) {
            lastTapTime = 0;
            onDoubleTap?.(event);
            return;
        }

        lastTapTime = now;
        onTap?.(event);
    }

    function onPointerCancel(event) {
        if (activePointerId !== event.pointerId) return;

        clearPressTimer();
        activePointerId = null;
        moved = false;
    }

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel
    };
}
