import { useFooterNavIsDesktop } from "component/lobby/control/footer/FooterNavIsDesktop";
import { useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { normalizePageUri, parseLocation } from "util/PageUtils";

const LOBBY_CHILD_URIS = ["/play/lobby/c1", "/play/lobby/c2", "/play/lobby/c3"] as const;
const SWIPE_MIN_X = 56;
const SWIPE_X_OVER_Y = 1.25;

type Point = { x: number; y: number; id: number };

export function useLobbySlideChildSwipe(
  rootRef: React.RefObject<HTMLElement | null>,
  options: { enabled: boolean }
) {
  const { openPage } = usePageManager();
  const isDesktop = useFooterNavIsDesktop();
  const startRef = useRef<Point | null>(null);

  useEffect(() => {
    const ele = rootRef.current;
    const active = options.enabled && !isDesktop;
    if (!ele) return;

    const prevTouchAction = ele.style.touchAction;
    if (active) ele.style.touchAction = "pan-y";

    if (!active) {
      ele.style.touchAction = prevTouchAction;
      return;
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      /** 手指移出子页区域（尤其向右滑向边缘）时，保证仍收到 up/cancel */
      try {
        ele.setPointerCapture(e.pointerId);
      } catch {
        /* disconnected 等 */
      }
    };

    const endGesture = (e: PointerEvent) => {
      const start = startRef.current;
      if (!start || start.id !== e.pointerId) return;
      startRef.current = null;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (adx < SWIPE_MIN_X || adx <= ady * SWIPE_X_OVER_Y) {
        return;
      }

      const current = parseLocation();
      const currentUri = normalizePageUri(current?.uri ?? "");
      const idx = LOBBY_CHILD_URIS.findIndex(
        (u) => normalizePageUri(u) === currentUri
      );
      if (idx < 0) return;

      const nextIdx = dx < 0 ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= LOBBY_CHILD_URIS.length) return;

      openPage({ uri: LOBBY_CHILD_URIS[nextIdx] });
    };

    ele.addEventListener("pointerdown", onPointerDown, { passive: true });
    ele.addEventListener("pointerup", endGesture, { passive: true });
    /** 此前仅清空 start，右滑易被浏览器 cancel 导致「无反应」 */
    ele.addEventListener("pointercancel", endGesture, { passive: true });

    return () => {
      startRef.current = null;
      ele.style.touchAction = prevTouchAction;
      ele.removeEventListener("pointerdown", onPointerDown);
      ele.removeEventListener("pointerup", endGesture);
      ele.removeEventListener("pointercancel", endGesture);
    };
  }, [rootRef, options.enabled, isDesktop, openPage]);
}
