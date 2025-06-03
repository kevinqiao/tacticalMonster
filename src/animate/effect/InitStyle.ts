import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface InitStyle {
    (args: { container: PageContainer; curcontainer: PageContainer, parent?: PageContainer, containers?: PageContainer[] }): void;
}

interface InitStyles {
    [key: string]: InitStyle;
}

export const InitStyles: InitStyles = {
    slide: ({ curcontainer, container, parent }) => {

        if (!parent) return;
        const index = parent.children?.filter((c) => c.init === "slide").findIndex((c) => c.name === container.name)
        let cindex = parent.children?.filter((c) => c.init === "slide").findIndex((c) => c.name === curcontainer.name)
        if (cindex === undefined || cindex < 0) {
            cindex = parent.children?.filter((c) => c.init === "slide").findIndex((c) => c.name === parent.child);
            cindex = cindex === undefined || cindex < 0 ? 0 : cindex
        }

        if (container.ele && index !== undefined) {
            const offset = index - cindex;
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
        gsap.set(container.ele, { autoAlpha: 0, width: "80%", height: "80%", zIndex: 3000 })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999 })
    }
};
