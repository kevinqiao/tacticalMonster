import { ModalContainer } from "@/service/ModalManager";
import gsap from "gsap";

interface OpenEffect {
    (args: { container: ModalContainer; index: number; onComplete?: () => void; tl?: gsap.core.Timeline }): gsap.core.Timeline | null | undefined;
}

interface OpenEffects {
    [key: string]: OpenEffect;
}

export const OpenModalEffects: OpenEffects = {
    fadeIn: ({ container, index, onComplete, tl }) => {
        console.log("fadeIn modal open", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();

        timeline.to(container.ele,
            {
                autoAlpha: 1, duration: 0.5, ease: "power2.inOut", onComplete: () => {
                    console.log("fadeIn complete", container);
                }
            }
        )
        if (container.mask) {
            timeline.to(container.mask, { autoAlpha: 0.4, duration: 0.5, ease: "power2.inOut" }, "<");
        }
        if (container.closeEle) {
            console.log("closeEle", container.closeEle);
            timeline.to(container.closeEle, { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" }, ">=+1.0");
        }
        timeline.play();

    },

};
