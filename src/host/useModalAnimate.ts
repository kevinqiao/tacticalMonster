/** 页面切换动画（初始化定位 + 打开动画调度） */
import { ModalContainer, ModalItem } from "host/service/ModalManager";
import { useSharedValue } from "host/service/SharedPageDataManager";
import gsap from "gsap";
import { useCallback, useEffect } from "react";

import type { ModalEffect } from "./config/PageConfiguration";

function killModalTweens(container: ModalContainer) {
  gsap.killTweensOf(
    [container.ele, container.surfaceEle, container.mask, container.closeEle].filter(Boolean)
  );
}

function motionTarget(container: ModalContainer): HTMLElement | null {
  return container.surfaceEle ?? container.ele ?? null;
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

/** Shell stays at the open resting pose; motion (incl. close btn) runs on `.modal-surface`. */
function setShellRestLayout(shell: HTMLElement, effect: ModalEffect) {
  gsap.set(shell, { clearProps: "transform,transformOrigin" });
  switch (effect.name) {
    case "popCenter":
    case "popCenterIn": {
      const width = toCssSize(effect.args?.width, "80%");
      const height = toCssSize(effect.args?.height, "80%");
      setPopCenterRestLayout(shell, width, height);
      break;
    }
    case "swipeRight":
      gsap.set(shell, {
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
      gsap.set(shell, {
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
      gsap.set(shell, {
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
      gsap.set(shell, {
        top: "100%",
        left: 0,
        width: "100%",
        height: effect.args?.height ? `${effect.args.height}` : "50%",
        x: 0,
        y: "-100%",
      });
      break;
    default:
      break;
  }
}

function resetSurfaceIdentity(surface: HTMLElement) {
  gsap.set(surface, {
    clearProps: "transform,transformOrigin,willChange,backfaceVisibility",
    force3D: false,
    x: 0,
    y: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    autoAlpha: 1,
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
      setShellRestLayout(container.ele, effect);
      if (container.surfaceEle) resetSurfaceIdentity(container.surfaceEle);
    },
    [container, modal]
  );

  const playOpen = useCallback(
    ({ onComplete }: { onComplete?: () => void | Promise<void> }) => {
      const shell = container.ele;
      const surface = motionTarget(container);
      if (!shell || !surface) return;
      const effect = resolveModalEffect(container, modal, orientation ?? "portrait");
      if (!effect || !OPEN_EFFECTS.has(effect.name)) {
        killModalTweens(container);
        gsap.set(shell, { autoAlpha: 1 });
        if (container.mask) gsap.set(container.mask, { autoAlpha: 1 });
        resetSurfaceIdentity(surface);
        onComplete?.();
        return;
      }
      killModalTweens(container);
      console.log("playOpen", container.name, effect);

      // Shell sits at final modal rect; close lives inside surface and zooms/slides with it.
      setShellRestLayout(shell, effect);
      gsap.set(shell, { autoAlpha: 1 });

      const tl = gsap.timeline({
        onComplete: () => {
          if (effect.name === "popCenter" || effect.name === "popCenterIn") {
            resetSurfaceIdentity(surface);
          }
          if (container.mask) {
            gsap.set(container.mask, { clearProps: "willChange", force3D: false, autoAlpha: 1 });
          }
          onComplete?.();
        },
      });

      let openDur = 0.5;
      let openEase: string = "power2.inOut";
      switch (effect.name) {
        case "popCenter":
        case "popCenterIn":
          gsap.set(surface, {
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
          tl.to(surface, {
            scale: 1,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut",
          });
          break;
        case "swipeRight":
          openDur = SWIPE_OPEN_DUR;
          openEase = SWIPE_OPEN_EASE;
          gsap.set(surface, { x: "100%", y: 0, autoAlpha: 1 });
          tl.to(surface, { x: 0, duration: SWIPE_OPEN_DUR, ease: SWIPE_OPEN_EASE });
          break;
        case "swipeLeft":
          gsap.set(surface, { x: "-100%", y: 0, autoAlpha: 1 });
          tl.to(surface, { x: 0, duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeTop":
          gsap.set(surface, { x: 0, y: "-100%", autoAlpha: 1 });
          tl.to(surface, { y: 0, duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeBottom":
          gsap.set(surface, { x: 0, y: "100%", autoAlpha: 1 });
          tl.to(surface, { y: 0, duration: 0.5, ease: "power2.inOut" });
          break;
      }

      if (container.mask) {
        gsap.set(container.mask, { willChange: "opacity" });
        tl.to(container.mask, { autoAlpha: 1, duration: openDur, ease: openEase }, "<");
      }
      tl.play();
    },
    [orientation, container, modal]
  );

  const playClose = useCallback(
    ({ onComplete }: { onComplete?: () => void | Promise<void> }) => {
      const shell = container.ele;
      const surface = motionTarget(container);
      if (!shell || !surface) {
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
          gsap.set(shell, { autoAlpha: 0 });
          resetSurfaceIdentity(surface);
          if (container.mask) gsap.set(container.mask, { autoAlpha: 0 });
          onComplete?.();
        },
      });

      let closeDur = 0.5;
      let closeEase: string = "power2.inOut";
      switch (effect.name) {
        case "popCenter":
        case "popCenterIn":
          tl.to(surface, { scale: 0.5, autoAlpha: 0, duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeTop":
          tl.to(surface, { y: "-100%", duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeBottom":
          tl.to(surface, { y: "100%", duration: 0.5, ease: "power2.inOut" });
          break;
        case "swipeRight":
          closeDur = SWIPE_CLOSE_DUR;
          closeEase = SWIPE_CLOSE_EASE;
          tl.to(surface, { x: "100%", duration: SWIPE_CLOSE_DUR, ease: SWIPE_CLOSE_EASE });
          break;
        case "swipeLeft":
          tl.to(surface, { x: "-100%", duration: 0.5, ease: "power2.inOut" });
          break;
      }

      if (container.mask) {
        tl.to(container.mask, { autoAlpha: 0, duration: closeDur, ease: closeEase }, "<");
      }
      tl.play();
    },
    [orientation, container, modal]
  );

  useEffect(() => {
    if (orientation) {
      syncModalLayout(orientation);
    }
  }, [orientation, syncModalLayout]);

  return { playOpen, playClose };
};
