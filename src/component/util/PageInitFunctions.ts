import gsap from "gsap";
import { PageContainer } from "service/PageManager";
export const PageInitFunctions = {
    slide: ({ parent, container }: { parent?: PageContainer, container: PageContainer }) => {
        if (parent) {
            const index = parent.children?.findIndex((c) => c.name === container.name)

            if (container.ele && (typeof index !== "undefined")) {
                gsap.set(container.ele, { left: `${index * 100}%` })
            }

        }
        return
    },
};
