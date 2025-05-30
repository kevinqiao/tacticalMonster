import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface OpenEffect {
    (args: { container: PageContainer; parent?: PageContainer; duration?: number; tl?: gsap.core.Timeline }): gsap.core.Timeline | null;
}

interface OpenEffects {
    [key: string]: OpenEffect;
}

export const OpenEffects: OpenEffects = {
    center: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();

        timeline.fromTo(container.ele,
            { scale: 0.5, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.7 }
        );
        return timeline;
    },
    fadeIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele,
            { autoAlpha: 1, duration }
        );
        return timeline;
    },
    popRightIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        console.log("popIn", container)
        const timeline = tl ?? gsap.timeline();
        gsap.set(container.ele, { autoAlpha: 1 })
        timeline.to(container.ele,
            { x: "-100%", duration: 0.7, ease: "power2.inOut" }
        );

        if (container.mask) {
            timeline.to(container.mask, { autoAlpha: 0.2, duration: 0.7 }, "<")
        }
        return timeline;
    },
    popIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        console.log("popIn", container)
        const timeline = tl ?? gsap.timeline();
        timeline.fromTo(container.ele,
            { autoAlpha: 0, scale: 0.2 },
            { autoAlpha: 1, scale: 0.7, duration: 1.2, ease: "power2.inOut" }
        );

        if (container.mask) {
            timeline.to(container.mask, { autoAlpha: 0.2, duration: 1.2 }, "<")
        }
        return timeline;
    },
    slideIn: ({ container, parent, duration, tl }) => {

        if (!container.ele) return null;
        const current = (parent?.children?.filter((c) => c.init === "slide").findIndex((c) => c.uri === container.uri) ?? 0)
        const timeline = tl ?? gsap.timeline();
        parent?.children?.filter((c) => c.init === "slide").forEach((c, index) => {
            if (c.ele) {
                gsap.set(c.ele, { autoAlpha: 1 })
                timeline.to(c.ele,
                    // { x: `${(0 - current) * 100}%`, duration }, "<"
                    { x: `${(index - current) * 100}%`, duration }, "<"
                );
            }
        })

        return timeline;
    }
};
