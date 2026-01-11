import { ModalContainer } from "@/service/ModalManager";
import gsap from "gsap";

interface CloseEffect {
    (args: { container: ModalContainer; onComplete?: () => void; tl?: gsap.core.Timeline }): gsap.core.Timeline | null | undefined;
}

interface CloseEffects {
    [key: string]: CloseEffect;
}

export const CloseModalEffects: CloseEffects = {

    fadeOut: ({ container, onComplete, tl }) => {
        console.log("fadeOut", container)
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline({
            onComplete: onComplete
        });
        if (container.closeEle)
            timeline.to(container.closeEle, { autoAlpha: 0, duration: 0 }, "<");
        timeline.to(container.ele,
            { autoAlpha: 0, duration: 0.7, ease: "power2.inOut" }
        )
        timeline.play();

    },

};
