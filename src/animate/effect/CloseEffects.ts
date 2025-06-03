import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface CloseEffect {
    (args: { container: PageContainer; parent?: PageContainer; duration?: number; tl?: gsap.core.Timeline }): gsap.core.Timeline | null;
}

interface CloseEffects {
    [key: string]: CloseEffect;
}

export const CloseEffects: CloseEffects = {
    popOut: ({ container, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele,
            { autoAlpha: 0, scale: 0.2, duration: 0.7, ease: "power2.inOut" }
        )
        if (container.mask)
            timeline.to(container.mask, { autoAlpha: 0, duration: 0.7 }, "<");
        return timeline;
    },
    popRightOut: ({ container, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele,
            { x: 0, duration: 0.7, ease: "power2.inOut" }
        ).to(container.ele, { autoAlpha: 1, duration: 0 })
        if (container.mask)
            timeline.to(container.mask, { autoAlpha: 0, duration: 0.7 }, "<");
        return timeline;
    },
    popCenterOut: ({ container, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele,
            { scale: 0.5, autoAlpha: 0, duration: 0.4, ease: "power2.inOut" }
        )
        if (container.mask)
            timeline.to(container.mask, { autoAlpha: 0, duration: 0.4 }, "<");
        return timeline;
    },
};
