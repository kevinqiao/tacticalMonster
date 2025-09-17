import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface InitStyle {
    (args: { container: PageContainer; containers?: PageContainer[], duration?: number, tl?: gsap.core.Timeline }): gsap.core.Timeline | null
}

interface InitStyles {
    [key: string]: InitStyle;
}

export const InitStyles: InitStyles = {
    slide: ({ container, containers, duration, tl }) => {

        const parent = containers?.find((c) => c.uri === container.parentURI);
        if (!parent) return null;
        const slides = parent?.children?.filter((c) => c.init === "slide");
        if (!slides || slides.length === 0 || !container.ele) return null;

        let cindex = slides.findIndex((c) => c.name === container.name);
        if (cindex >= 0) {
            const center = Math.floor(slides.length / 2);
            const offset = cindex - center;
            console.log("init slide", container.name, cindex, center, offset)
            gsap.set(container.ele, {
                autoAlpha: 1,
                x: `${offset * 100}%`,
                force3D: true, // 启用硬件加速
                willChange: "transform" // 提示浏览器优化
            })
        }

        // 确保所有slide元素都可见并优化性能
        slides.forEach((c) => {
            if (c.ele) {
                gsap.set(c.ele, {
                    autoAlpha: 1,
                    force3D: true,
                    willChange: "transform"
                });
            }
        });
        return null

    },
    pops1: ({ container, duration, tl }) => {
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele, { autoAlpha: 0, height: "auto", width: "30%", zIndex: 3000, duration: duration ?? 0 })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999, duration: duration ?? 0 })
        return timeline;
    },
    pop: ({ container, duration, tl }) => {
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele, { autoAlpha: 0, width: "50%", zIndex: 3000, duration: duration ?? 0 })
        if (container.mask)
            timeline.to(container.mask, { autoAlpha: 0, zIndex: 2999, duration: duration ?? 0 })
        return timeline;
    },
    center: ({ container, duration, tl }) => {
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele, { autoAlpha: 0, zIndex: 3000, duration: duration ?? 0 })
        if (container.mask)
            timeline.to(container.mask, { autoAlpha: 0, zIndex: 2999, duration: duration ?? 0 })
        return timeline;
    }
};
