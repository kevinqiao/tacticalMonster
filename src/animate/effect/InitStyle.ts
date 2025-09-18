import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface InitStyle {
    (args: { container: PageContainer; containers?: PageContainer[] }): void
}

interface InitStyles {
    [key: string]: InitStyle;
}

export const InitStyles: InitStyles = {
    slide: ({ container, containers }) => {

        const parent = containers?.find((c) => c.uri === container.parentURI);
        if (!parent) return null;
        const slides = parent?.children?.filter((c) => c.init === "slide");
        if (!slides || slides.length === 0 || !container.ele) return null;

        let cindex = slides.findIndex((c) => c.name === container.name);
        if (cindex >= 0) {
            const center = Math.floor(slides.length / 2);
            const offset = cindex - center;
            gsap.set(container.ele, {
                left: `${offset * 100}%`,
                force3D: true, // 启用硬件加速
                willChange: "transform" // 提示浏览器优化
            })
        }
    },
    pops1: ({ container }) => {
        if (!container.ele) return null;
        gsap.set(container.ele, { autoAlpha: 0, zIndex: 3000, width: "40vw", left: "100%" })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999 })

    },
    pop: ({ container }) => {
        if (!container.ele) return null;
        gsap.set(container.ele, { autoAlpha: 0, width: "50%", zIndex: 3000 })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999 })

    },
    center: ({ container }) => {
        if (!container.ele) return null;
        gsap.set(container.ele, { autoAlpha: 0, zIndex: 3000 })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999 })
    }
};
