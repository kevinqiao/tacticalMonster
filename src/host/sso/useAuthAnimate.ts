/** 页面切换动画（初始化定位 + 打开动画调度） */
import { useSharedValue } from "host/service/SharedPageDataManager";
import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { AuthContainer } from "./SSOController";

export interface AuthEffect {
  name: string;
  orientation?: "portrait" | "landscape" | "both";
  args?: any;
}
function killModalTweens(container: AuthContainer) {
  gsap.killTweensOf([container.ele, container.mask, container.closeEle].filter(Boolean));
}

function toCssSize(value: unknown, fallback: string) {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim().length > 0) return value;
  return fallback;
}

const OPEN_EFFECTS = new Set(["popCenter", "popCenterIn", "swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);
const CLOSE_EFFECTS = new Set(["popCenter", "popCenterIn", "swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);
export const AUTH_EFFECTS: AuthEffect[] = [{
  name: "popCenter",
  orientation: "portrait",
  args: { height: "100%", width: "100%" }
}, {
  name: "swipeRight",
  orientation: "landscape",
  args: { width: "30%" }
}];

/** 共享尚未写入时用横屏方案占位，避免 `find` 无键；若要在首帧更准 portrait，需在 App/Lobby 更早 `setShared("lobby.layout.orientation", …)` */
const DEFAULT_ORIENTATION: "landscape" = "landscape";

export const useAuthAnimate = ({ container }: { container: AuthContainer }) => {
  const sharedOrientation = useSharedValue("lobby.layout.orientation");
  /** 关闭动画与打开成对（旋转或共享 orientation 晚到时不混用两套 name） */
  const openedEffectRef = useRef<AuthEffect | null>(null);

  const resolveEffect = useCallback((): AuthEffect => {
    const orientation = sharedOrientation ?? DEFAULT_ORIENTATION;
    return AUTH_EFFECTS.find((e) => e.orientation === orientation) ?? AUTH_EFFECTS[0];
  }, [sharedOrientation]);
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
    ({ closeAble, onComplete }: { closeAble?: boolean, onComplete?: () => void | Promise<void> }) => {
      if (!container.ele) return;
      const effect = resolveEffect();

      if (!OPEN_EFFECTS.has(effect.name)) {
        onComplete?.();
        return;
      }
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
        gsap.set(container.mask, { autoAlpha: closeAble ? 0.5 : 1 });
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
        tl.to(container.closeEle, { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" }, ">=+1.0");
      }
      tl.play();
    },
    [resolveEffect, container]
  );

  const playClose = useCallback(
    ({ onComplete }: { onComplete?: () => void | Promise<void> }) => {
      const effect = openedEffectRef.current ?? resolveEffect();
      if (!container.ele) return;

      if (!CLOSE_EFFECTS.has(effect.name)) {
        openedEffectRef.current = null;
        onComplete?.();
        return;
      }
      killModalTweens(container);
      const tl = gsap.timeline({
        onComplete: () => {
          // 关闭后复位位移，避免 swipeRight/Left 把容器长期留在屏外导致横向 overflow 与 fixed 元素错位。
          if (container.ele) gsap.set(container.ele, { x: 0, y: 0, autoAlpha: 0 });
          if (container.mask) gsap.set(container.mask, { autoAlpha: 0 });
          if (container.closeEle) gsap.set(container.closeEle, { autoAlpha: 0 });
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
      if (container.mask) {
        tl.to(container.mask, { autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, "<");
      }
      if (container.closeEle) {
        tl.to(container.closeEle, { autoAlpha: 0, duration: 0.8, ease: "power2.inOut" }, "<");
      }
      tl.play();
    },
    [resolveEffect, container]
  );

  useEffect(() => {
    syncModalLayout(sharedOrientation ?? DEFAULT_ORIENTATION);
  }, [sharedOrientation, syncModalLayout]);

  return { playOpen, playClose };
};
