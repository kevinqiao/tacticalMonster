/** 页面切换动画（初始化定位 + 打开动画调度） */
import { ModalContainer, ModalItem } from "@/service/ModalManager";
import gsap from "gsap";
import { useCallback } from "react";

type ModalEffect = NonNullable<ModalItem["effect"]> | NonNullable<ModalContainer["effect"]>;

function killModalTweens(container: ModalContainer) {
  gsap.killTweensOf([container.ele, container.mask, container.closeEle].filter(Boolean));
}

/**
 * 打开动画结束后的稳定布局（与各 swipe* 的 gsap.set + 最后一帧 transform 一致）。
 * 在横竖屏切换、窗口缩放后重新套用，避免 GSAP 旧 transform 与百分比布局错位。
 */
export function applyModalOpenRestLayout(container: ModalContainer, effect: ModalEffect) {
  if (!container.ele) return;
  const el = container.ele;
  switch (effect.name) {
    case "swipeRight":
      // 与 swipeLeft 镜像：靠右贴齐用 right + x，不用 left:100%（少一种 left/width 联算）
      gsap.set(el, {
        top: 0,
        height: "100%",
        left: "auto",
        right: 0,
        width: effect.args?.width ? `${effect.args.width}` : "50%",
        x: 0,
        y: 0,
        autoAlpha: 1,
      });
      break;
    case "swipeLeft":
      // 与 swipeRight 对称：只用 left + x
      gsap.set(el, {
        top: 0,
        left: 0,
        right: "auto",
        height: "100%",
        width: effect.args?.width ? `${effect.args.width}` : "50%",
        x: 0,
        y: 0,
        autoAlpha: 1,
      });
      break;
    case "swipeTop":
      // 与 swipeBottom 对称：用 top + y，不用 bottom，避免与 height 百分比混算错位
      gsap.set(el, {
        top: 0,
        left: 0,
        width: "100%",
        bottom: "auto",
        height: effect.args?.height ? `${effect.args.height}` : "50%",
        x: 0,
        y: 0,
        autoAlpha: 1,
      });
      break;
    case "swipeBottom":
      gsap.set(el, {
        top: "100%",
        left: 0,
        width: "100%",
        height: effect.args?.height ? `${effect.args.height}` : "50%",
        x: 0,
        y: "-100%",
        autoAlpha: 1,
      });
      break;
    default:
      return;
  }
  if (container.mask) gsap.set(container.mask, { autoAlpha: 0.4 });
  if (container.closeEle) gsap.set(container.closeEle, { autoAlpha: 1 });
}

const SWIPE_EFFECTS = new Set(["swipeRight", "swipeLeft", "swipeTop", "swipeBottom"]);

export const useModalAnimate = () => {
  const syncModalOpenLayout = useCallback(
    ({ container, modal }: { container: ModalContainer; modal: ModalItem }) => {
      const effect = modal.effect ?? container.effect;
      if (!effect || !container.ele) return;
      killModalTweens(container);
      applyModalOpenRestLayout(container, effect);
    },
    []
  );

  const playOpen = useCallback(
    ({ container, modal, onComplete }: { container: ModalContainer; modal: ModalItem; onComplete?: () => void | Promise<void> }) => {
      const effect = modal.effect ?? container.effect;
      if (!effect || !container.ele) return;
      if (!SWIPE_EFFECTS.has(effect.name)) {
        onComplete?.();
        return;
      }
      killModalTweens(container);

      const tl = gsap.timeline({
        onComplete: () => {
          applyModalOpenRestLayout(container, effect);
          onComplete?.();
        },
      });

      switch (effect.name) {
        case "swipeRight":
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
    []
  );

  const playClose = useCallback(
    ({ container, modal, onComplete }: { container: ModalContainer; modal: ModalItem; onComplete?: () => void | Promise<void> }) => {
      const effect = modal.effect ?? container.effect;
      if (!effect || !container.ele) return;
      if (!SWIPE_EFFECTS.has(effect.name)) {
        onComplete?.();
        return;
      }
      killModalTweens(container);

      const tl = gsap.timeline({
        onComplete: () => {
          onComplete?.();
        },
      });
      switch (effect.name) {
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
    []
  );

  return { playOpen, playClose, syncModalOpenLayout };
};
