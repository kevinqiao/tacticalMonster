import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface InitStyle {
    (args: { container: PageContainer; parent?: PageContainer }): void;
}

interface InitStyles {
    [key: string]: InitStyle;
}

export const InitStyles: InitStyles = {
    slide: ({ parent, container }: { parent?: PageContainer, container: PageContainer }) => {
        if (!parent) return;
        // console.log("parent",parent)
        const index = parent.children?.filter((c) => c.init === "slide").findIndex((c) => c.name === container.name)

        if (container.ele && (typeof index !== "undefined")) {
            console.log("init slide", container)
            // gsap.set(container.ele, { autoAlpha: 1, left: `${index * 100}%` })
            gsap.set(container.ele, { autoAlpha: 0, x: `${index * 100}%` })
        }
    },
    pop: ({ parent, container }: { parent?: PageContainer, container: PageContainer }) => {
        if (!parent || !container.ele) return;

        // gsap.to(container.ele, { autoAlpha: 0, scale: 0.2 })
        gsap.set(container.ele, { autoAlpha: 0, zIndex: 3000 })
        if (container.mask)
            gsap.set(container.mask, { autoAlpha: 0, zIndex: 2999 })
    },
};
