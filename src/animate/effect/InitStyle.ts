import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface InitStyle {
    (args: { container: PageContainer; containers?: PageContainer[] }): void;
}

interface InitStyles {
    [key: string]: InitStyle;
}

export const InitStyles: InitStyles = {
    slide: ({ container, containers }) => {
        const parent = containers?.find((c) => c.uri === container.parentURI);
        if (!parent) return;
        const slides = parent?.children?.filter((c) => c.init === "slide");
        if (!slides || slides.length === 0 || !container.ele) return;

        let cindex = slides.findIndex((c) => c.name === container.name);
        if (cindex >= 0) {
            const center = Math.ceil(slides.length / 2);
            const offset = center - cindex;
            // console.log("init slide", container, index, cindex, offset)
            // gsap.set(container.ele, { autoAlpha: 1, left: `${index * 100}%` })
            gsap.set(container.ele, { autoAlpha: 0, x: `${offset * 100}%` })

        }
    },
    "pop-s1": ({ container }) => {
        if (!container.ele) return;

        gsap.set(container.ele, { autoAlpha: 0, height: "auto", width: "30%", zIndex: 3000 })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999 })
    },
    pop: ({ container }) => {
        if (!container.ele) return;
        gsap.set(container.ele, { autoAlpha: 0, width: "50%", zIndex: 3000 })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999 })
    },
    center: ({ container }) => {
        if (!container.ele) return;
        gsap.set(container.ele, { autoAlpha: 0, zIndex: 3000 })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999 })
    }
};
