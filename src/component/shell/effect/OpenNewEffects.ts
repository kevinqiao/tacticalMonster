import { findAncestor, findContainer } from "@/util/PageUtils";
import gsap from "gsap";
import { PageContainer, PageItem } from "service/PageManager";
interface OpenNewEffect {
    (args: { page: PageItem; containers: PageContainer[]; onComplete?: () => void | Promise<void> }): void;
}

interface OpenNewEffects {
    [key: string]: OpenNewEffect;
}

export const OpenNewEffects: OpenNewEffects = {

    "none": ({ page, containers, onComplete }) => {
        // console.log("container", container)
        const container = findContainer(containers, page.uri);
        if (!container || !container.ele) return;
        if (!container.parentURI) {
            gsap.set(container.ele, {
                autoAlpha: 1,
            })
            onComplete?.();
        } else {
            const ancestor = findAncestor(containers, page.uri);
            if (!ancestor || !ancestor.ele) return;
            gsap.set(ancestor.ele, {
                autoAlpha: 1,
            })
            const cindex = ancestor.children?.findIndex((c) => c.name === container?.name);
            if (cindex !== undefined && cindex >= 0 && ancestor.ele) {
                const offset = Math.floor((ancestor.children?.length ?? 0) / 2) - cindex;
                ancestor.children?.forEach((c) => {
                    if (c.ele) {
                        gsap.set(c.ele, {
                            x: `${offset * 100}%`,
                        })
                    }
                })

            }
            onComplete?.();
        }

    },

};
