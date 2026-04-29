/** 页面切换动画（初始化定位 + 打开动画调度） */
import { ModalContainer, ModalItem } from "@/service/ModalManager";
import { useSharedValue } from "@/service/SharedPageDataManager";
import gsap from "gsap";
import { useCallback, useEffect } from "react";


function killModalTweens(container: ModalContainer) {
  gsap.killTweensOf([container.ele, container.mask, container.closeEle].filter(Boolean));
}

function toCssSize(value: unknown, fallback: string) {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim().length > 0) return value;
  return fallback;
}

const OPEN_EFFECTS = new Set(["popCenter", "popCenterIn", "swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);
const CLOSE_EFFECTS = new Set(["popCenter", "popCenterIn", "swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);

export const useModalAnimate = ({ container, modal }: { container: ModalContainer, modal?: ModalItem }) => {
  const orientation = useSharedValue("lobby.layout.orientation");
  const syncModalLayout = useCallback(
    (orientation: string) => {
      console.log("syncModalOpenLayout", orientation);
      if (!container.ele) return;
      const effect = container.effects?.find((effect) => effect.orientation === orientation) ?? container.effects?.[0];
      if (!effect) return;
      killModalTweens(container);
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
    ({ onComplete }: { onComplete?: () => void | Promise<void> }) => {
      if (!container.ele) return;
      const effect = container.effects?.find((effect) => effect.orientation === orientation) ?? container.effects?.[0];
      if (!effect) return;
      if (!OPEN_EFFECTS.has(effect.name)) {
        onComplete?.();
        return;
      }
      killModalTweens(container);
      console.log("playOpen", container.name, effect);
      const tl = gsap.timeline({
        onComplete: () => {
          // applyModalOpenRestLayout(container, effect);
          onComplete?.();
        },
      });
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
      if (container.mask) {
        tl.to(container.mask, { autoAlpha: 0.4, duration: 0.5, ease: "power2.inOut" }, "<");
      }
      if (container.closeEle) {
        tl.to(container.closeEle, { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" }, ">=+1.0");
      }
      tl.play();
    },
    [orientation, container]
  );

  const playClose = useCallback(
    ({ onComplete }: { onComplete?: () => void | Promise<void> }) => {
      if (!container.ele) return;
      const effect = container.effects?.find((effect) => effect.orientation === orientation) ?? container.effects?.[0];
      if (!effect) return;
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
          tl.to(container.ele, { x: "100%", duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeLeft":
          tl.to(container.ele, { x: "-100%", duration: 0.5, ease: "power2.inOut" });
          break;
      }
      if (container.mask) {
        console.log("mask", container.mask);
        tl.to(container.mask, { autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, "<");
      }
      if (container.closeEle) {
        tl.to(container.closeEle, { autoAlpha: 0, duration: 0.8, ease: "power2.inOut" }, "<");
      }
      tl.play();
    },
    [orientation, container]
  );

  useEffect(() => {
    if (orientation) {
      // console.log("useEffect syncModalOpenLayout", orientation);
      syncModalLayout(orientation);
    }
  }, [orientation, syncModalLayout]);

  return { playOpen, playClose };
};
