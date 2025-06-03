import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface OpenEffect {
    (args: { container: PageContainer; parent?: PageContainer; containers?: PageContainer[]; duration?: number; tl?: gsap.core.Timeline }): gsap.core.Timeline | null;
}

interface OpenEffects {
    [key: string]: OpenEffect;
}

export const OpenEffects: OpenEffects = {

    fadeIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele,
            { autoAlpha: 1, duration }
        );
        return timeline;
    },
    popCenterIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;

        const timeline = tl ?? gsap.timeline();
        gsap.set(container.ele, { autoAlpha: 1 })
        timeline.fromTo(container.ele,
            { scale: 0.5, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.5, ease: "power2.inOut" }
        );

        if (container.mask) {
            timeline.to(container.mask, { autoAlpha: 0.2, duration: 0.5 }, "<")
        }
        return timeline;
    },
    popRightIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;

        const timeline = tl ?? gsap.timeline();
        gsap.set(container.ele, { autoAlpha: 1 })
        timeline.to(container.ele,
            { x: "-100%", duration: 0.5, ease: "power2.inOut" }
        );

        if (container.mask) {
            timeline.to(container.mask, { autoAlpha: 0.2, duration: 0.5 }, "<")
        }
        return timeline;
    },
    popIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
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
    slideIn: ({ container, containers, duration, tl }) => {

        if (!container.ele) return null;
        const parent = containers?.find((c) => c.uri === container.parentURI);
        if (!parent) return null;
        const current = (parent.children?.filter((c) => c.init === "slide").findIndex((c) => c.uri === container.uri) ?? 0)
        const timeline = tl ?? gsap.timeline();
        parent?.children?.filter((c) => c.init === "slide").forEach((c, index) => {
            if (c.ele) {
                timeline.to(c.ele,
                    { x: `${(index - current) * 100}%`, duration }, "<"
                );
            }
        })

        return timeline;
    }
};
