import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface ExitEffect {
    (args: { container: PageContainer; tl?: gsap.core.Timeline }): gsap.core.Timeline | null;
}

interface ExitEffects {
    [key: string]: ExitEffect;
}

export const ExitEffects: ExitEffects = {
    center: ({ container }) => {
        if (!container.ele) return null;
        const tl = gsap.timeline();
        tl.to(container.ele, { scale: 0.5, autoAlpha: 0, duration: 0.7 });
        return tl;
    },
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
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();

        // 启用硬件加速
        gsap.set(container.ele, {
            force3D: true,
            willChange: "transform"
        });

        // 向右侧滑出的动画
        timeline.to(container.ele, {
            x: "100%",
            duration: 0.5,
            ease: "power3.in"
        });

        // 遮罩层淡出
        if (container.mask) {
            timeline.to(container.mask, {
                autoAlpha: 0,
                duration: 0.3,
                ease: "power2.in"
            }, "<0.2");
        }

        // 最后隐藏元素
        timeline.to(container.ele, {
            autoAlpha: 0,
            duration: 0
        });

        return timeline;
    },
    fadeOut: ({ container, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();

        timeline.to(container.ele,
            { autoAlpha: 0, duration: 1, ease: "power2.in" }, "<"
        );
        return timeline;
    },
    slideOut: ({ container }) => {
        if (!container.ele) return null;
        const timeline = gsap.timeline();

        timeline.to(container.ele,
            { autoAlpha: 0, duration: 0.7 }
        );
        return timeline;
    }
};
