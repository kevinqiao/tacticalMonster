/**
 * Tab hide/show can report 0 or near-zero window sizes via resize / ResizeObserver.
 * Applying layout from those frames permanently shrinks the UI until a later resize.
 */

export const MIN_SAFE_VIEWPORT_PX = 80;

let lastGoodWindowViewport = { width: 1440, height: 1080 };

export function readSafeWindowViewportSize(): {
  width: number;
  height: number;
  usedFallback: boolean;
} {
  if (typeof window === "undefined") {
    return { width: 1440, height: 1080, usedFallback: true };
  }
  const vv = window.visualViewport;
  const width = Math.max(0, Math.floor(vv?.width ?? window.innerWidth ?? 0));
  const height = Math.max(0, Math.floor(vv?.height ?? window.innerHeight ?? 0));
  if (width < MIN_SAFE_VIEWPORT_PX || height < MIN_SAFE_VIEWPORT_PX) {
    return { ...lastGoodWindowViewport, usedFallback: true };
  }
  lastGoodWindowViewport = { width, height };
  return { width, height, usedFallback: false };
}

/** Run `fn` when the document becomes visible again (tab focus). */
export function onDocumentVisible(fn: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const onVisibility = () => {
    if (document.visibilityState === "visible") fn();
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}

/** Schedule `fn` on the next two animation frames (layout often settles after show). */
export function scheduleDoubleRaf(fn: () => void): () => void {
  let outer = 0;
  let inner = 0;
  outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(fn);
  });
  return () => {
    cancelAnimationFrame(outer);
    cancelAnimationFrame(inner);
  };
}
