/** 页面切换动画（初始化定位 + 打开动画调度） */
import { ModalContainer, ModalItem, useModalManager } from "@/service/ModalManager";
import gsap from "gsap";
import { useCallback } from "react";



export const useModalAnimate = () => {
    const { modalContainers } = useModalManager();

    const playOpen = useCallback(
        ({ container, modal, onComplete }: { container: ModalContainer, modal: ModalItem, onComplete?: () => void | Promise<void> }) => {
            const effect = modal.effect ?? container.effect;
            if (!effect || !container.ele) return;
            const tl = gsap.timeline({
                onComplete: () => {
                    onComplete?.();
                }
            });
            // console.log("playOpen", effect);
            switch (effect.name) {
                case "swipeRight":
                    const topOffsetPx = 0;
                    gsap.set(container.ele, {
                        top: `${topOffsetPx}px`,
                        height: `calc(100% - ${topOffsetPx}px)`,
                        left: "100%",
                        width: effect.args?.width ? `${effect.args.width}` : "50%",
                        autoAlpha: 1,
                    });
                    tl.to(container.ele, { x: "-100%", duration: 0.5, ease: "power2.inOut" })
                    break;
                case "swipeLeft":
                    gsap.set(container.ele, {
                        right: "100%",
                        width: effect.args?.width ? `${effect.args.width}` : "50%",
                        autoAlpha: 1,
                    });
                    tl.to(container.ele, { x: "100%", duration: 0.5, ease: "power2.inOut" })
                    break;
                case "swipeTop":
                    gsap.set(container.ele, {
                        bottom: "100%",
                        height: effect.args?.height ? `${effect.args.height}` : "50%",
                        autoAlpha: 1,
                    });
                    tl.to(container.ele, { y: "100%", duration: 0.5, ease: "power2.inOut" })
                    break;
                case "swipeBottom":
                    gsap.set(container.ele, {
                        top: "100%",
                        height: effect.args?.height ? `${effect.args.height}` : "50%",
                        autoAlpha: 1,
                    });
                    tl.to(container.ele, { y: "-100%", duration: 0.5, ease: "power2.inOut" })
                    break;
                default:
                    break;
            }
            if (container.mask) {
                tl.to(container.mask, { autoAlpha: 0.4, duration: 0.5, ease: "power2.inOut" }, "<");
            }
            if (container.closeEle) {
                tl.to(container.closeEle, { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" }, ">=+1.0");
            }

            // OpenModalEffects[container.effect?.name ?? "swipeRight"]({ container, onComplete });
        },
        [modalContainers]
    );
    const playClose = useCallback(
        ({ container, modal, onComplete }: { container: ModalContainer, modal: ModalItem, onComplete?: () => void | Promise<void> }) => {
            const effect = modal.effect ?? container.effect;
            if (!effect || !container.ele) return;
            const tl = gsap.timeline({
                onComplete: () => {
                    onComplete?.();
                }
            });
            switch (effect.name) {
                case "swipeTop":
                    tl.to(container.ele, { y: 0, duration: 0.5, ease: "power2.inOut" })
                    break;
                case "swipeBottom":
                    tl.to(container.ele, { y: 0, duration: 0.5, ease: "power2.inOut" })
                    break;
                case "swipeRight":
                    tl.to(container.ele, { x: 0, duration: 0.5, ease: "power2.inOut" })
                    break;
                case "swipeLeft":
                    tl.to(container.ele, { x: 0, duration: 0.5, ease: "power2.inOut" })
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
        [modalContainers]
    );

    return { playOpen, playClose };
};
