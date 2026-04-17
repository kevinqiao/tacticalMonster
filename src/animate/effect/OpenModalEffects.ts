import { ModalContainer } from "@/service/ModalManager";
import gsap from "gsap";

interface OpenEffect {
    (args: { container: ModalContainer; args?: { width?: number; height?: number }; onComplete?: () => void; }): void;
}

interface OpenEffects {
    [key: string]: OpenEffect;
}

export const OpenModalEffects: OpenEffects = {
    fadeIn: ({ container, onComplete }) => {
        console.log("fadeIn modal open", container)
        if (!container.ele) return null;
        const timeline = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });

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
            timeline.to(container.closeEle, { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" }, ">=+1.0");
        }
        timeline.play();

    },
    swipeRight: ({ container, args, onComplete }) => {
        console.log("fadeIn modal open", container)
        if (!container.ele) return null;
        const topOffsetPx = 50;
        const timeline = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });
        gsap.set(container.ele, {
            top: `${topOffsetPx}px`,
            height: `calc(100% - ${topOffsetPx + 50}px)`,
            left: "100%",
            width: args?.width ? `${args.width}` : "50%",
            autoAlpha: 1,
        });
        timeline.to(container.ele,
            {
                x: "-100%", duration: 0.5, ease: "power2.inOut"
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
    swipeLeft: ({ container, args, onComplete }) => {

        if (!container.ele) return null;
        const timeline = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });
        gsap.set(container.ele, {
            right: "100%",
            width: "50%",
            autoAlpha: 1,
        });
        timeline.to(container.ele,
            {
                x: "100%", duration: 0.5, ease: "power2.inOut"
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
    swipeTop: ({ container, args, onComplete }) => {

        if (!container.ele) return null;
        const timeline = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });
        gsap.set(container.ele, {
            bottom: "100%",
            height: args?.height ? `${args.height}%` : "50%",
            autoAlpha: 1,
        });
        timeline.to(container.ele,
            {
                y: "100%", duration: 0.5, ease: "power2.inOut"
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
    swipeBottom: ({ container, args, onComplete }) => {

        if (!container.ele) return null;
        const timeline = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });
        gsap.set(container.ele, {
            top: "100%",
            height: args?.height ? `${args.height}` : "50%",
            autoAlpha: 1,
        });
        timeline.to(container.ele,
            {
                y: "-100%", duration: 0.5, ease: "power2.inOut"
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
