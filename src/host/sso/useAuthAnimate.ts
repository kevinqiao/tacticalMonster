/** 页面切换动画（初始化定位 + 打开动画调度） */
import { useSharedValue } from "host/service/SharedPageDataManager";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContainer } from "./SSOController";

export interface AuthEffect {
  name: string;
  orientation?: "portrait" | "landscape" | "both";
  args?: any;
}
function killModalTweens(container: AuthContainer) {
  gsap.killTweensOf([container.ele, container.mask, container.closeEle].filter(Boolean));
}

/** Bumped on every playOpen; stale playClose onComplete must not hide a newer open. */
let ssoOpenGeneration = 0;
/** True while SSO layer is open — blocks re-playOpen from effect dep churn (mask flicker). */
let ssoLayerOpen = false;

function toCssSize(value: unknown, fallback: string) {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim().length > 0) return value;
  return fallback;
}

const OPEN_EFFECTS = new Set(["popCenter", "popCenterIn", "swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);
const CLOSE_EFFECTS = new Set(["popCenter", "popCenterIn", "swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);
export const AUTH_EFFECTS: AuthEffect[] = [{
  name: "swipeRight",
  orientation: "portrait",
  args: { width: "100%" },
}, {
  name: "swipeRight",
  orientation: "landscape",
  args: { width: "30%" },
}];

function inferAuthOrientation(): "portrait" | "landscape" {
  if (typeof window === "undefined") return "landscape";
  return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
}

export const useAuthAnimate = ({ container }: { container: AuthContainer }) => {
  const sharedOrientation = useSharedValue("lobby.layout.orientation");
  const [viewportOrientation, setViewportOrientation] = useState(inferAuthOrientation);
  /** 关闭动画与打开成对（旋转或共享 orientation 晚到时不混用两套 name） */
  const openedEffectRef = useRef<AuthEffect | null>(null);

  useEffect(() => {
    if (sharedOrientation) return;
    const mq = window.matchMedia("(orientation: portrait)");
    const sync = () => setViewportOrientation(mq.matches ? "portrait" : "landscape");
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sharedOrientation]);

  const resolveOrientation = useCallback((): "portrait" | "landscape" => {
    return sharedOrientation ?? viewportOrientation ?? inferAuthOrientation();
  }, [sharedOrientation, viewportOrientation]);

  const resolveEffect = useCallback((): AuthEffect => {
    const orientation = resolveOrientation();
    return AUTH_EFFECTS.find((e) => e.orientation === orientation) ?? AUTH_EFFECTS[0];
  }, [resolveOrientation]);
  const syncModalLayout = useCallback(
    (orientation: string) => {
      if (!container.ele) return;
      killModalTweens(container);
      const effect = AUTH_EFFECTS.find((effect) => effect.orientation === orientation) ?? AUTH_EFFECTS[0];
      gsap.set(container.ele, { clearProps: "transform,transformOrigin" });
      switch (effect.name) {
        case "popCenter":
          {
            const width = toCssSize(effect.args?.width, "80%");
            const height = toCssSize(effect.args?.height, "80%");
            gsap.set(container.ele, {
              top: "50%",
              left: "50%",
              right: "auto",
              bottom: "auto",
              width,
              height,
              xPercent: -50,
              yPercent: -50,
              x: 0,
              y: 0,
              scale: 1,
              transformOrigin: "center center",
            });
          }
          break;
        case "swipeRight":
          // 与 swipeLeft 镜像：靠右贴齐用 right + x，不用 left:100%（少一种 left/width 联算）

          gsap.set(container.ele, {
            top: 0,
            left: "auto",
            height: "100%",
            right: 0,
            width: effect.args?.width ? `${effect.args.width}` : "50%",
            x: 0,
            y: 0,
          });
          break;
        case "swipeLeft":
          // 与 swipeRight 对称：只用 left + x
          gsap.set(container.ele, {
            top: 0,
            left: 0,
            right: "auto",
            height: "100%",
            width: effect.args?.width ? `${effect.args.width}` : "50%",
            x: 0,
            y: 0,
          });
          break;
        case "swipeTop":
          // 与 swipeBottom 对称：用 top + y，不用 bottom，避免与 height 百分比混算错位
          gsap.set(container.ele, {
            top: 0,
            left: 0,
            width: "100%",
            bottom: "auto",
            height: effect.args?.height ? `${effect.args.height}` : "50%",
            x: 0,
            y: 0,
          });
          break;
        case "swipeBottom":
          gsap.set(container.ele, {
            top: "100%",
            left: 0,
            width: "100%",
            height: effect.args?.height ? `${effect.args.height}` : "50%",
            x: 0,
            y: "-100%",
          });
          break;
        default:
          return;
      }
    },
    [container]
  );

  const playOpen = useCallback(
    ({
      closeAble,
      onComplete,
      layout,
    }: {
      closeAble?: boolean;
      onComplete?: () => void | Promise<void>;
      /** Staff consoles: skip swipe (can leave panel off-screen if interrupted). */
      layout?: "default" | "staffFull";
    }) => {
      if (!container.ele) return;

      if (layout === "staffFull") {
        killModalTweens(container);
        ssoOpenGeneration += 1;
        ssoLayerOpen = true;
        openedEffectRef.current = { name: "popCenter", orientation: "both" };
        gsap.set(container.ele, {
          clearProps: "transform,transformOrigin",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          x: 0,
          y: 0,
          xPercent: 0,
          yPercent: 0,
          scale: 1,
          autoAlpha: 1,
        });
        // Full solid mask — never fade opacity (flickers with GPU compositing).
        if (container.mask) {
          gsap.set(container.mask, { autoAlpha: 1 });
        }
        if (container.closeEle) {
          gsap.set(container.closeEle, { autoAlpha: closeAble ? 1 : 0 });
        }
        onComplete?.();
        return;
      }

      const effect = resolveEffect();

      if (!OPEN_EFFECTS.has(effect.name)) {
        onComplete?.();
        return;
      }
      // Already open: ignore re-entrant opens from orientation / callback identity churn.
      if (ssoLayerOpen) {
        if (container.closeEle) {
          gsap.set(container.closeEle, { autoAlpha: closeAble ? 1 : 0 });
        }
        onComplete?.();
        return;
      }
      ssoOpenGeneration += 1;
      ssoLayerOpen = true;
      openedEffectRef.current = effect;
      killModalTweens(container);
      const tl = gsap.timeline({
        onComplete: () => {
          // applyModalOpenRestLayout(container, effect);
          onComplete?.();
        },
      });
      gsap.set(container.ele, { clearProps: "transform,transformOrigin" });
      if (container.mask) {
        gsap.set(container.mask, { autoAlpha: 1 });
      }
      switch (effect.name) {
        case "popCenter":
          {
            const width = toCssSize(effect.args?.width, "80%");
            const height = toCssSize(effect.args?.height, "80%");
            gsap.set(container.ele, {
              top: "50%",
              left: "50%",
              right: "auto",
              bottom: "auto",
              width,
              height,
              xPercent: -50,
              yPercent: -50,
              x: 0,
              y: 0,
              scale: 0.5,
              autoAlpha: 0,
            });
          }
          tl.to(container.ele, {
            scale: 1,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut",
          });
          break;
        case "swipeRight":
          // 勿与 x 写在同一次 set：clearProps 会清掉 transform，导致起始 x 仍为 0、无滑动

          gsap.set(container.ele, {
            top: 0,
            height: "100%",
            left: "auto",
            right: 0,
            width: effect.args?.width ? `${effect.args.width}` : "50%",
            x: "100%",
            y: 0,
            autoAlpha: 1,
          });
          tl.to(container.ele, { x: 0, duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeLeft":
          gsap.set(container.ele, {
            top: 0,
            left: 0,
            right: "auto",
            height: "100%",
            width: effect.args?.width ? `${effect.args.width}` : "50%",
            x: "-100%",
            y: 0,
            autoAlpha: 1,
          });
          tl.to(container.ele, { x: 0, duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeTop":
          gsap.set(container.ele, {
            top: 0,
            left: 0,
            width: "100%",
            bottom: "auto",
            height: effect.args?.height ? `${effect.args.height}` : "50%",
            x: 0,
            y: "-100%",
            autoAlpha: 1,
          });
          tl.to(container.ele, { y: 0, duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeBottom":
          gsap.set(container.ele, {
            top: "100%",
            left: 0,
            width: "100%",
            height: effect.args?.height ? `${effect.args.height}` : "50%",
            x: 0,
            y: 0,
            autoAlpha: 1,
          });
          tl.to(container.ele, { y: "-100%", duration: 0.5, ease: "power2.inOut" });
          break;
      }

      if (container.closeEle && closeAble) {
        gsap.set(container.closeEle, { autoAlpha: 0 });
        tl.to(container.closeEle, { autoAlpha: 1, duration: 0.28, ease: "power2.out" });
      } else if (container.closeEle) {
        gsap.set(container.closeEle, { autoAlpha: 0 });
      }
      tl.play();
    },
    [resolveEffect, container]
  );

  const playClose = useCallback(
    ({ onComplete }: { onComplete?: () => void | Promise<void> }) => {
      const effect = openedEffectRef.current ?? resolveEffect();
      const closeGen = ssoOpenGeneration;
      if (!container.ele) {
        ssoLayerOpen = false;
        openedEffectRef.current = null;
        onComplete?.();
        return;
      }

      if (!CLOSE_EFFECTS.has(effect.name)) {
        ssoLayerOpen = false;
        if (container.mask) gsap.set(container.mask, { autoAlpha: 0 });
        openedEffectRef.current = null;
        onComplete?.();
        return;
      }
      killModalTweens(container);

      const runLayerExit = () => {
        const tl = gsap.timeline({
          onComplete: () => {
            // A newer playOpen won the race (e.g. restore playClose vs staff forceReauth).
            if (closeGen !== ssoOpenGeneration) {
              onComplete?.();
              return;
            }
            if (container.ele) gsap.set(container.ele, { x: 0, y: 0, autoAlpha: 0 });
            // Hide mask only after panel is gone — no opacity fade (GPU flicker).
            if (container.mask) gsap.set(container.mask, { autoAlpha: 0 });
            if (container.closeEle) gsap.set(container.closeEle, { autoAlpha: 0 });
            ssoLayerOpen = false;
            openedEffectRef.current = null;
            onComplete?.();
          },
        });
        switch (effect.name) {
          case "popCenter":
            tl.to(container.ele, { scale: 0.5, autoAlpha: 0, duration: 0.5, ease: "power2.inOut" });
            break;
          case "swipeTop":
            tl.to(container.ele, { y: "-100%", duration: 0.5, ease: "power2.inOut" });
            break;
          case "swipeBottom":
            tl.to(container.ele, { y: 0, duration: 0.5, ease: "power2.inOut" });
            break;
          case "swipeRight":
            tl.to(container.ele, { x: "100%", duration: 0.5, ease: "power2.inOut" });
            break;
          case "swipeLeft":
            tl.to(container.ele, { x: "-100%", duration: 0.5, ease: "power2.inOut" });
            break;
        }
        tl.play();
      };

      runLayerExit();
    },
    [resolveEffect, container]
  );

  useEffect(() => {
    syncModalLayout(resolveOrientation());
  }, [resolveOrientation, syncModalLayout]);

  return { playOpen, playClose };
};
