import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface EnterEffect {
    (args: { container: PageContainer; parent?: PageContainer; duration?: number; tl?: gsap.core.Timeline }): gsap.core.Timeline | null;
}

interface EnterEffects {
    [key: string]: EnterEffect;
}

export const EnterEffects: EnterEffects = {

    fadeIn: ({ container, duration, tl }) => {

        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();

        timeline.to(container.ele,
            { autoAlpha: 1, duration: duration ?? 0.7 }, "<"
        );

        return timeline;
    }

};
