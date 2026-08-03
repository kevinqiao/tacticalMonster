import { normalizePageUri, parseLocation } from "@/host/util/PageUtils";
import { CASUAL_FOOTER_NAV_URI } from "component/lobby/casual/control/FooterNavCasual";
import { useFooterNavIsDesktop } from "component/lobby/tactical/control/footer/FooterNavIsDesktop";
import { usePageManager } from "host/service/PageManager";
import { useEffect, useRef, useState } from "react";

const SWIPE_MIN_X = 56;
const SWIPE_X_OVER_Y = 1.25;

type Point = { x: number; y: number; id: number };

/** 存在触摸屏（含混合设备）时也应启用横滑，与仅看「桌面图标栏」的判定解耦 */
function useSwipeGestureEligible(): boolean {
  const isDesktop = useFooterNavIsDesktop();
  const [anyCoarse, setAnyCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(any-pointer: coarse)");
    const apply = () => setAnyCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return !isDesktop || anyCoarse;
}

/**
 * 与 `useLobbySlideChildSwipe` 同思路：在触摸屏 / 非桌面 HUD 下，横滑切换 5 个 Tab。
 * `pointerdown` 使用 capture，避免可滚动子区域先吞掉触摸。
 */
export function useCasualLobbySlideChildSwipe(
  rootRef: React.RefObject<HTMLElement | null>,
  options: { enabled: boolean }
) {
  const { openPage } = usePageManager();
  const swipeEligible = useSwipeGestureEligible();
  const startRef = useRef<Point | null>(null);

  useEffect(() => {
    const ele = rootRef.current;
    const active = options.enabled && swipeEligible;
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
      try {
        ele.setPointerCapture(e.pointerId);
      } catch {
        /* disconnected */
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
      const idx = CASUAL_FOOTER_NAV_URI.findIndex(
        (u) => normalizePageUri(u) === currentUri
      );
      if (idx < 0) return;

      const nextIdx = dx < 0 ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= CASUAL_FOOTER_NAV_URI.length) return;

      openPage({ uri: CASUAL_FOOTER_NAV_URI[nextIdx] });
    };

    const downOpts: AddEventListenerOptions = { passive: true, capture: true };
    const endOpts: AddEventListenerOptions = { passive: true };
    ele.addEventListener("pointerdown", onPointerDown, downOpts);
    ele.addEventListener("pointerup", endGesture, endOpts);
    ele.addEventListener("pointercancel", endGesture, endOpts);

    return () => {
      startRef.current = null;
      ele.style.touchAction = prevTouchAction;
      ele.removeEventListener("pointerdown", onPointerDown, downOpts);
      ele.removeEventListener("pointerup", endGesture, endOpts);
      ele.removeEventListener("pointercancel", endGesture, endOpts);
    };
  }, [rootRef, options.enabled, swipeEligible, openPage]);
}
