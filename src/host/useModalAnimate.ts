/** 页面切换动画（初始化定位 + 打开动画调度） */
import { ModalContainer, ModalItem } from "host/service/ModalManager";
import { useSharedValue } from "host/service/SharedPageDataManager";
import gsap from "gsap";
import { useCallback, useEffect } from "react";

import type { ModalEffect } from "./config/PageConfiguration";

function killModalTweens(container: ModalContainer) {
  gsap.killTweensOf([container.ele, container.mask, container.closeEle].filter(Boolean));
}

const SWIPE_OPEN_DUR = 0.52;
const SWIPE_CLOSE_DUR = 0.46;
const SWIPE_OPEN_EASE = "power2.out";
const SWIPE_CLOSE_EASE = "power2.inOut";

function toCssSize(value: unknown, fallback: string) {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim().length > 0) return value;
  return fallback;
}

/**
 * popCenter 稳态布局：用 inset + margin:auto 居中，不用 translate(-50%)/force3D，
 * 避免整层落在亚像素合成层上导致小尺寸文字与牌面发糊。
 */
function setPopCenterRestLayout(ele: HTMLElement, width: string, height: string) {
  gsap.set(ele, {
    clearProps: "transform,transformOrigin,willChange,backfaceVisibility",
    force3D: false,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: "auto",
    width,
    height,
    x: 0,
    y: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
  });
}

const OPEN_EFFECTS = new Set(["popCenter", "popCenterIn", "swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);
const CLOSE_EFFECTS = new Set(["popCenter", "popCenterIn", "swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);

function resolveModalEffect(
  container: ModalContainer,
  modal: ModalItem | undefined,
  orientation: string
): ModalEffect | undefined {
  const ov = modal?.effect;
  if (ov?.name && OPEN_EFFECTS.has(ov.name)) {
    return { name: ov.name, args: ov.args };
  }
  return container.effects?.find((e) => e.orientation === orientation) ?? container.effects?.[0];
}

export const useModalAnimate = ({ container, modal }: { container: ModalContainer, modal?: ModalItem }) => {
  const orientation = useSharedValue("lobby.layout.orientation");
  const syncModalLayout = useCallback(
    (orientation: string) => {
      console.log("syncModalOpenLayout", orientation);
      if (!container.ele) return;
      const effect = resolveModalEffect(container, modal, orientation);
      if (!effect) return;
      killModalTweens(container);
      gsap.set(container.ele, { clearProps: "transform,transformOrigin" });
      switch (effect.name) {
        case "popCenter":
          {
            const width = toCssSize(effect.args?.width, "80%");
            const height = toCssSize(effect.args?.height, "80%");
            setPopCenterRestLayout(container.ele, width, height);
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
    [container, modal]
  );

  const playOpen = useCallback(
    ({ onComplete }: { onComplete?: () => void | Promise<void> }) => {
      if (!container.ele) return;
      const effect = resolveModalEffect(container, modal, orientation ?? "portrait");
      if (!effect) return;
      if (!OPEN_EFFECTS.has(effect.name)) {
        onComplete?.();
        return;
      }
      killModalTweens(container);
      console.log("playOpen", container.name, effect);
      const width = toCssSize(effect.args?.width, "80%");
      const height = toCssSize(effect.args?.height, "80%");
      const tl = gsap.timeline({
        onComplete: () => {
          if (effect.name === "popCenter" && container.ele) {
            setPopCenterRestLayout(container.ele, width, height);
            gsap.set(container.ele, { autoAlpha: 1 });
          }
          if (container.mask) {
            gsap.set(container.mask, { clearProps: "willChange", force3D: false, autoAlpha: 1 });
          }
          onComplete?.();
        },
      });
      gsap.set(container.ele, { clearProps: "transform,transformOrigin" });
      switch (effect.name) {
        case "popCenter":
          {
            // 动画期间短暂用 scale；结束后清掉 transform，避免长期 GPU 层发糊
            gsap.set(container.ele, {
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: "auto",
              width,
              height,
              x: 0,
              y: 0,
              xPercent: 0,
              yPercent: 0,
              scale: 0.5,
              autoAlpha: 0,
              transformOrigin: "center center",
              force3D: true,
              willChange: "transform,opacity",
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
          tl.to(container.ele, { x: 0, duration: SWIPE_OPEN_DUR, ease: SWIPE_OPEN_EASE });
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
      if (container.mask) {
        gsap.set(container.mask, { willChange: "opacity" });
        tl.to(container.mask, { autoAlpha: 1, duration: SWIPE_OPEN_DUR, ease: SWIPE_OPEN_EASE }, "<");
      }
      if (container.closeEle) {
        tl.to(container.closeEle, { autoAlpha: 1, duration: 0.2, ease: "power2.out" }, "<+0.16");
      }
      tl.play();
    },
    [orientation, container, modal]
  );

  const playClose = useCallback(
    ({ onComplete }: { onComplete?: () => void | Promise<void> }) => {
      if (!container.ele) {
        onComplete?.();
        return;
      }
      const effect = resolveModalEffect(container, modal, orientation ?? "portrait");
      if (!effect) {
        onComplete?.();
        return;
      }
      if (!CLOSE_EFFECTS.has(effect.name)) {
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
          tl.to(container.ele, { x: "100%", duration: SWIPE_CLOSE_DUR, ease: SWIPE_CLOSE_EASE });
          break;
        case "swipeLeft":
          tl.to(container.ele, { x: "-100%", duration: 0.5, ease: "power2.inOut" });
          break;
      }
      if (container.mask) {
        console.log("mask", container.mask);
        tl.to(container.mask, { autoAlpha: 0, duration: SWIPE_CLOSE_DUR, ease: SWIPE_CLOSE_EASE }, "<");
      }
      if (container.closeEle) {
        tl.to(container.closeEle, { autoAlpha: 0, duration: 0.18, ease: "power2.in" }, "<");
      }
      tl.play();
    },
    [orientation, container, modal]
  );

  useEffect(() => {
    if (orientation) {
      // console.log("useEffect syncModalOpenLayout", orientation);
      syncModalLayout(orientation);
    }
  }, [orientation, syncModalLayout]);

  return { playOpen, playClose };
};
