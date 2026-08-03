/**
 * Mobile browsers (esp. iOS Safari) ignore viewport user-scalable=no.
 * Block pinch / Safari gesture zoom at the event layer for the game shell.
 */
const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover";

function lockViewportMeta() {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    document.head.appendChild(meta);
  }
  if (meta.getAttribute("content") !== VIEWPORT_CONTENT) {
    meta.setAttribute("content", VIEWPORT_CONTENT);
  }
}

function preventMultiTouchZoom(event: TouchEvent) {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
}

function preventGestureZoom(event: Event) {
  event.preventDefault();
}

function preventCtrlWheelZoom(event: WheelEvent) {
  if (event.ctrlKey) {
    event.preventDefault();
  }
}

/** Double-tap zoom: ignore rapid successive taps on non-editable targets. */
let lastTouchEndAt = 0;
function preventDoubleTapZoom(event: TouchEvent) {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.closest("input, textarea, select, [contenteditable='true']") ||
      target.isContentEditable)
  ) {
    lastTouchEndAt = Date.now();
    return;
  }
  const now = Date.now();
  if (now - lastTouchEndAt <= 320) {
    event.preventDefault();
  }
  lastTouchEndAt = now;
}

function keepPageUnscrolled() {
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  const root = document.documentElement;
  if (root.scrollLeft !== 0 || root.scrollTop !== 0) {
    root.scrollLeft = 0;
    root.scrollTop = 0;
  }
}

let installed = false;

export function lockMobileViewportZoom() {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  lockViewportMeta();

  document.addEventListener("touchmove", preventMultiTouchZoom, { passive: false, capture: true });
  document.addEventListener("gesturestart", preventGestureZoom, { passive: false, capture: true } as AddEventListenerOptions);
  document.addEventListener("gesturechange", preventGestureZoom, { passive: false, capture: true } as AddEventListenerOptions);
  document.addEventListener("gestureend", preventGestureZoom, { passive: false, capture: true } as AddEventListenerOptions);
  document.addEventListener("wheel", preventCtrlWheelZoom, { passive: false, capture: true });
  document.addEventListener("touchend", preventDoubleTapZoom, { passive: false, capture: true });

  window.addEventListener("scroll", keepPageUnscrolled, { passive: true });
  window.visualViewport?.addEventListener("resize", keepPageUnscrolled);
  window.visualViewport?.addEventListener("scroll", keepPageUnscrolled);

  // Some WebViews rewrite viewport after load — re-assert.
  window.addEventListener("load", lockViewportMeta);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") lockViewportMeta();
  });
}
